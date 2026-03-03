import {
  Component,
  Input,
  OnDestroy,
  OnInit,
  AfterViewInit,
  ElementRef,
  Renderer2,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { SoaService } from '../soa.service';
import { Subject, combineLatest } from 'rxjs';
import { startWith, takeUntil } from 'rxjs/operators';

// ✅ dialogs (NO HTML change)
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AddressDialogComponent, AddressProvince } from './address-dialog.component';
import { ParticularsDialogComponent } from './particulars-dialog.component';

// ✅ txn dialog
import { TxnTypeDialogComponent, TxnType } from './txn-type-dialog.component';

// ✅ ROUTED FLOWS (separate files)
import { openRocParticularsFlow } from './particulars-roc.flow';
import { openShipStationParticularsFlow } from './particulars-ship.flow';
import { openAmateurParticularsFlow } from './particulars-amateur.flow';

type PayeeItem = { id: number; name: string };

@Component({
  selector: 'app-soa-left-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule],
  templateUrl: './soa-left-form.component.html',
  styleUrls: ['./soa-left-form.component.css'],
})
export class SoaLeftFormComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() form!: FormGroup;

  payees: PayeeItem[] = [];

  private destroy$ = new Subject<void>();

  private unlistenAddressClick?: () => void;
  private unlistenPartClick?: () => void;

  private addressDialogOpen = false;
  private particularsDialogOpen = false;

  private addressCoolDownUntil = 0;
  private particularsCoolDownUntil = 0;
  private readonly COOLDOWN_MS = 350;

  private readonly START_NEXT_PERIOD_NEXT_DAY = true;

  private readonly addressData: AddressProvince[] = [
    {
      province: 'Camarines Sur',
      towns: [
        { townCity: 'Naga City', barangays: ['Abella', 'Bagumbayan Norte', 'Concepcion Pequeña'] },
        { townCity: 'Pili', barangays: ['Cadlan', 'Curry', 'San Jose'] },
      ],
    },
  ];

  constructor(
    private soaService: SoaService,
    private el: ElementRef<HTMLElement>,
    private renderer: Renderer2,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    if (!this.form) return;

    this.loadPayees();
    this.setupPeriodCovered();
    this.setupPayeeSelectionAutoFill();

    // ✅ keep this (it helps if particulars updated manually)
    this.setupAutoTxnFromParticulars();
  }

  ngAfterViewInit(): void {
    const addressInput = this.el.nativeElement.querySelector(
      'input[formControlName="address"]'
    ) as HTMLInputElement | null;

    if (addressInput) {
      this.renderer.setAttribute(addressInput, 'readonly', 'true');
      this.renderer.setStyle(addressInput, 'cursor', 'pointer');

      this.unlistenAddressClick = this.renderer.listen(addressInput, 'click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (Date.now() < this.addressCoolDownUntil) return;
        this.openAddressDialog();
      });
    }

    const partInput = this.el.nativeElement.querySelector(
      'input[formControlName="particulars"]'
    ) as HTMLInputElement | null;

    if (partInput) {
      this.renderer.setAttribute(partInput, 'readonly', 'true');
      this.renderer.setStyle(partInput, 'cursor', 'pointer');

      this.unlistenPartClick = this.renderer.listen(partInput, 'click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (Date.now() < this.particularsCoolDownUntil) return;
        this.openParticularsDialog();
      });
    }
  }

  ngOnDestroy(): void {
    this.unlistenAddressClick?.();
    this.unlistenPartClick?.();
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ======================================================
  // ✅ AUTO CHECK RIGHT PANEL: NEW / RENEW / MOD
  // ✅ ALSO AUTO-SET catROC/catMA for computations
  // ======================================================
  private setupAutoTxnFromParticulars(): void {
    const ctrl = this.form?.get('particulars');
    if (!ctrl) return;

    ctrl.valueChanges
      .pipe(startWith(ctrl.value), takeUntil(this.destroy$))
      .subscribe((val) => {
        const text = String(val ?? '').trim();
        if (!text) return;

        this.applyTxnFromParticulars(text);
        this.applyCategoryFromParticulars(text);
      });
  }

  // ✅ FIX: never match NEW inside RENEW; and write to nested controls too
  private applyTxnFromParticulars(particularsText: string): void {
    const t = String(particularsText ?? '').toUpperCase();

    const hasMod =
      /\bMOD\b/.test(t) ||
      t.includes('MODIFICATION') ||
      t.includes('MODIFIED') ||
      t.includes('MODIF') ||
      t.includes('AMEND') ||
      t.includes('CHANGE') ||
      t.includes('CORRECTION');

    // ✅ use word boundary, and check renew first
    const hasRenew =
      /\bRENEW(AL)?\b/.test(t) ||
      t.includes('REVALID') ||
      t.includes('EXTEND') ||
      t.includes('REISSUE') ||
      t.includes('RE-ISSUE');

    // ✅ NEW must be an explicit word, not part of RENEW
    const hasNew =
      /\bNEW\b/.test(t) ||
      t.includes('NEW APPLICATION');

    const curNew = this.getBoolDeep('txnNew');
    const curRenew = this.getBoolDeep('txnRenew');
    const curMod = this.getBoolDeep('txnModification');
    const anySelected = curNew || curRenew || curMod;

    // ✅ if text explicitly says NEW/RENEW/MOD then enforce it
    if (hasMod || hasRenew || hasNew) {
      this.setTxnEverywhere({
        txnNew: hasNew && !hasMod && !hasRenew,
        txnRenew: hasRenew && !hasMod,
        txnModification: hasMod,
      });
      return;
    }

    // ✅ if user already selected something, do NOT override
    if (anySelected) return;

    // ✅ default only if nothing selected at all
    this.setTxnEverywhere({ txnNew: true, txnRenew: false, txnModification: false });
  }

  // ✅ force txn exactly from txn dialog selection (and write to nested controls too)
  private applyTxnFromTxnChoice(txn: TxnType): void {
    this.setTxnEverywhere({
      txnNew: txn === 'NEW',
      txnRenew: txn === 'RENEW',
      txnModification: txn === 'MOD',
    });

    // optional: if you have a string control
    this.setStringDeep('txnType', txn);
    this.setStringDeep('transactionType', txn);
  }

  // ✅ set the 3 txn booleans in root and nested form groups (fixes "still NEW")
  private setTxnEverywhere(v: { txnNew: boolean; txnRenew: boolean; txnModification: boolean }): void {
    this.setBoolDeep('txnNew', v.txnNew);
    this.setBoolDeep('txnRenew', v.txnRenew);
    this.setBoolDeep('txnModification', v.txnModification);
  }

  // ✅ read boolean from anywhere in the form tree
  private getBoolDeep(controlName: string): boolean {
    const found = this.findBoolInFormTree(this.form, [controlName]);
    return !!found;
  }

  // ✅ set boolean control by name anywhere in form tree (root or nested)
  private setBoolDeep(controlName: string, value: boolean): void {
    if (!this.form) return;

    // root direct
    const direct = this.form.get(controlName);
    if (direct) direct.setValue(value, { emitEvent: false });

    const target = controlName.toLowerCase();

    const walk = (ctrl: any) => {
      const controls = ctrl?.controls;
      if (!controls || typeof controls !== 'object') return;

      for (const key of Object.keys(controls)) {
        const child = controls[key];
        const keyLower = String(key).toLowerCase();

        // match exact OR endsWith (handles flags.txnNew etc.)
        if (keyLower === target || keyLower.endsWith(target)) {
          const current = child?.value;
          if (typeof current === 'boolean') child.setValue(value, { emitEvent: false });
        }

        walk(child);
      }
    };

    walk(this.form as any);
  }

  // ✅ optional: set string control deep if exists
  private setStringDeep(controlName: string, value: string): void {
    if (!this.form) return;

    const direct = this.form.get(controlName);
    if (direct) direct.setValue(value, { emitEvent: false });

    const target = controlName.toLowerCase();

    const walk = (ctrl: any) => {
      const controls = ctrl?.controls;
      if (!controls || typeof controls !== 'object') return;

      for (const key of Object.keys(controls)) {
        const child = controls[key];
        const keyLower = String(key).toLowerCase();

        if (keyLower === target || keyLower.endsWith(target)) {
          const current = child?.value;
          if (typeof current === 'string' || current === null || current === undefined) {
            child.setValue(value, { emitEvent: false });
          }
        }

        walk(child);
      }
    };

    walk(this.form as any);
  }

  private applyCategoryFromParticulars(particularsText: string): void {
    const t = particularsText.toUpperCase();

    const isShip = t.includes('SHIPSTATION') || t.includes('SHIP STATION');
    if (isShip) {
      if (this.form.get('catROC') || this.form.get('catMA')) {
        this.form.patchValue({ catROC: false, catMA: false }, { emitEvent: true });
      }
      return;
    }

    const isROC = t.includes('ROC');
    const isMA =
      t.includes('AMATEUR') ||
      t.includes('AT-RSL') ||
      t.includes('AT-LIFETIME') ||
      t.includes('AT-CLUB') ||
      t.includes('TEMPORARY PERMIT') ||
      t.includes('SPECIAL PERMIT');

    const patch: any = {};
    if (this.form.get('catROC')) patch.catROC = isROC;
    if (this.form.get('catMA')) patch.catMA = isMA;

    if (this.form.get('catMS')) patch.catMS = false;
    if (this.form.get('catOTHERS')) patch.catOTHERS = false;

    if (Object.keys(patch).length) {
      this.form.patchValue(patch, { emitEvent: true });
    }
  }

  // =========================
  // PAYEES
  // =========================
  private loadPayees(): void {
    const selectedId = Number(this.form?.get('payeeName')?.value || 0);

    this.soaService.getAll().subscribe({
      next: (rows: any[]) => {
        const list: PayeeItem[] = (rows ?? [])
          .map((r) => {
            const id = Number(r?.id ?? r?.ID ?? r?.Id);
            const name = String(r?.licensee ?? r?.Licensee ?? r?.LICENSEE ?? '').trim();
            return { id, name };
          })
          .filter((x) => x.id > 0 && x.name.length > 0);

        const uniq = new Map<number, PayeeItem>();
        for (const item of list) if (!uniq.has(item.id)) uniq.set(item.id, item);

        this.payees = Array.from(uniq.values()).sort((a, b) => a.name.localeCompare(b.name));

        if (selectedId > 0 && this.payees.some((p) => p.id === selectedId)) {
          this.form.get('payeeName')?.setValue(selectedId, { emitEvent: false });
        }
      },
      error: (err) => {
        console.error('❌ Failed to load payees:', err);
        this.payees = [];
      },
    });
  }

  private setupPayeeSelectionAutoFill(): void {
    const payeeCtrl = this.form.get('payeeName');
    if (!payeeCtrl) return;

    payeeCtrl.valueChanges
      .pipe(startWith(payeeCtrl.value), takeUntil(this.destroy$))
      .subscribe((val: any) => {
        const id = Number(val || 0);
        if (!id || id <= 0) return;

        this.soaService.getById(id).subscribe({
          next: (dto: any) => {
            const realId = Number(dto?.id ?? dto?.ID ?? dto?.Id ?? id);

            const directTo =
              this.toYmd(dto?.periodTo ?? dto?.PeriodTo) || this.toYmd(dto?.to ?? dto?.To);

            const parsed = this.periodCoveredToDates(dto?.periodCovered ?? dto?.PeriodCovered);
            const parsedTo = parsed.periodTo ?? '';

            const oldTo = directTo || parsedTo || '';

            let newFrom = oldTo;
            if (this.START_NEXT_PERIOD_NEXT_DAY && oldTo) {
              newFrom = this.addDays(oldTo, 1);
            }

            this.form.patchValue(
              {
                id: realId,
                licensee: String(dto?.licensee ?? dto?.Licensee ?? '').trim(),
                address: String(dto?.address ?? dto?.Address ?? ''),

                particulars: '',

                catROC: false,
                catMA: false,
                catMS: false,
                catOTHERS: false,

                date: (dto?.dateIssued ?? dto?.DateIssued)
                  ? String(dto?.dateIssued ?? dto?.DateIssued).slice(0, 10)
                  : this.form.get('date')?.value,

                periodFrom: newFrom || this.form.get('periodFrom')?.value,
                periodTo: '',
              },
              { emitEvent: true }
            );

            // default txn on new payee, but set deep too
            this.setTxnEverywhere({ txnNew: true, txnRenew: false, txnModification: false });
          },
          error: (err) => console.warn('⚠️ No details found for id:', id, err),
        });
      });
  }

  private setupPeriodCovered(): void {
    const fromCtrl = this.form.get('periodFrom');
    const toCtrl = this.form.get('periodTo');
    const yearsCtrl = this.form.get('periodYears');
    const coveredCtrl = this.form.get('periodCovered');

    if (!fromCtrl || !toCtrl || !yearsCtrl || !coveredCtrl) return;

    combineLatest([
      fromCtrl.valueChanges.pipe(startWith(fromCtrl.value)),
      toCtrl.valueChanges.pipe(startWith(toCtrl.value)),
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([from, to]) => {
        yearsCtrl.setValue(this.computeYears(from, to), { emitEvent: false });
        coveredCtrl.setValue(this.computeDateRange(from, to), { emitEvent: false });
      });
  }

  private computeDateRange(from: any, to: any): string {
    if (!from || !to) return '';
    const f = new Date(from);
    const t = new Date(to);
    if (isNaN(f.getTime()) || isNaN(t.getTime())) return '';
    if (t < f) return '';
    const fmt = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
    return `${fmt(f)}-${fmt(t)}`;
  }

  private computeYears(from: any, to: any): number {
    if (!from || !to) return 0;
    const f = new Date(from);
    const t = new Date(to);
    if (isNaN(f.getTime()) || isNaN(t.getTime())) return 0;
    if (t < f) return 0;
    const diffMs = t.getTime() - f.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    const years = diffDays / 365.25;
    return Number(years.toFixed(2));
  }

  private openAddressDialog(): void {
    if (this.addressDialogOpen) return;
    this.addressDialogOpen = true;

    const ref = this.dialog.open(AddressDialogComponent, {
      width: '560px',
      disableClose: true,
      autoFocus: false,
      restoreFocus: false,
      data: { provinces: this.addressData },
    });

    ref.afterClosed().subscribe((res) => {
      this.addressCoolDownUntil = Date.now() + this.COOLDOWN_MS;
      this.addressDialogOpen = false;

      const addressInput = this.el.nativeElement.querySelector(
        'input[formControlName="address"]'
      ) as HTMLInputElement | null;
      addressInput?.blur();

      if (!res) return;
      this.form.patchValue({ address: res.fullAddress }, { emitEvent: true });
    });
  }

  // ======================================================
  // ✅ PARTICULARS DIALOG (FIXED)
  // SHIP EARTH + DELETION do NOT change txn
  // ======================================================
  private openParticularsDialog(): void {
    if (this.particularsDialogOpen) return;
    this.particularsDialogOpen = true;

    const ref1 = this.dialog.open(ParticularsDialogComponent, {
      width: '460px',
      disableClose: true,
      autoFocus: false,
      restoreFocus: false,
    });

    ref1.afterClosed().subscribe((res1) => {
      this.particularsCoolDownUntil = Date.now() + this.COOLDOWN_MS;

      const partInput = this.el.nativeElement.querySelector(
        'input[formControlName="particulars"]'
      ) as HTMLInputElement | null;
      partInput?.blur();

      if (!res1?.value) {
        this.particularsDialogOpen = false;
        return;
      }

      const service = String(res1.value ?? '').trim();
      const serviceUp = service.toUpperCase();

      // ✅ txn is OPTIONAL
      const finalize = (finalText: string, txn?: TxnType) => {
        this.form.patchValue({ particulars: finalText }, { emitEvent: true });
        this.applyCategoryFromParticulars(finalText);

        if (txn) this.applyTxnFromTxnChoice(txn);

        this.particularsDialogOpen = false;
      };

      const cancel = () => {
        this.particularsDialogOpen = false;
      };

      if (serviceUp === 'SHIPSTATION' || serviceUp === 'SHIP STATION') {
        openShipStationParticularsFlow(this.dialog, cancel, finalize);
        return;
      }

      if (serviceUp === 'ROC') {
        openRocParticularsFlow(this.dialog, cancel, (t: string, x: TxnType) => finalize(t, x));
        return;
      }

      if (serviceUp === 'AMATEUR') {
        openAmateurParticularsFlow(this.dialog, cancel, (t: string, x: TxnType) => finalize(t, x));
        return;
      }

      // Other services -> txn required
      this.openTxnTypeDialogAndFinalize(
        service,
        (t: string, x: TxnType) => finalize(t, x),
        cancel
      );
    });
  }

  private openTxnTypeDialogAndFinalize(
    baseText: string,
    finalize: (finalText: string, txn: TxnType) => void,
    cancel: () => void
  ): void {
    const ref3 = this.dialog.open(TxnTypeDialogComponent, {
      width: '460px',
      disableClose: true,
      autoFocus: false,
      restoreFocus: false,
    });

    ref3.afterClosed().subscribe((res3) => {
      if (!res3?.value) {
        cancel();
        return;
      }

      const txn = res3.value as TxnType;
      const txnText = txn === 'MOD' ? 'MODIFICATION' : txn;
      const finalText = `${baseText} - ${txnText}`;
      finalize(finalText, txn);
    });
  }

  private periodCoveredToDates(periodCovered: any): { periodFrom?: string; periodTo?: string } {
    const s = (periodCovered ?? '').toString().trim();
    if (!s) return {};

    let m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s*-\s*(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
    if (m) {
      const d1 = Number(m[1]), mo1 = Number(m[2]), y1 = Number(m[3]);
      const d2 = Number(m[4]), mo2 = Number(m[5]), y2 = Number(m[6]);
      return {
        periodFrom: this.toYmdFromParts(y1, mo1, d1),
        periodTo: this.toYmdFromParts(y2, mo2, d2),
      };
    }

    m = /^(\d{4})-(\d{2})-(\d{2})\s*-\s*(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (m) {
      return { periodFrom: `${m[1]}-${m[2]}-${m[3]}`, periodTo: `${m[4]}-${m[5]}-${m[6]}` };
    }

    m = /^(\d{4})-(\d{4})$/.exec(s);
    if (m) {
      const y1 = Number(m[1]);
      const y2 = Number(m[2]);
      if (!y1 || !y2) return {};
      return { periodFrom: `${y1}-01-01`, periodTo: `${y2}-12-31` };
    }

    return {};
  }

  private toYmd(value: any): string {
    if (!value) return '';
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return value.trim();
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  private toYmdFromParts(y: number, m: number, d: number): string {
    if (!y || !m || !d) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${y}-${pad(m)}-${pad(d)}`;
  }

  private addDays(yyyyMmDd: string, days: number): string {
    const d = new Date(yyyyMmDd);
    if (isNaN(d.getTime())) return yyyyMmDd;
    d.setDate(d.getDate() + days);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  // ✅ tree search helpers
  private findBoolInFormTree(root: AbstractControl | null | undefined, keywords: string[]): boolean {
    if (!root) return false;
    const keys = keywords.map((k) => k.toLowerCase());

    const walk = (ctrl: AbstractControl): boolean | null => {
      const anyCtrl: any = ctrl as any;

      if (anyCtrl?.controls && typeof anyCtrl.controls === 'object') {
        for (const name of Object.keys(anyCtrl.controls)) {
          const child = anyCtrl.controls[name] as AbstractControl;
          const nameLower = String(name).toLowerCase();

          const match = keys.every((k) => nameLower.includes(k));
          if (match) {
            const v = (child as any)?.value;
            if (typeof v === 'boolean') return v;
          }

          const found = walk(child);
          if (found !== null) return found;
        }
      }
      return null;
    };

    const r = walk(root);
    return r === null ? false : !!r;
  }
}