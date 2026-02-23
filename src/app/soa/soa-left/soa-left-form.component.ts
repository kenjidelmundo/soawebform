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
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { SoaService } from '../soa.service';
import { Subject, combineLatest } from 'rxjs';
import { startWith, takeUntil } from 'rxjs/operators';

// ✅ dialogs (NO HTML change)
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AddressDialogComponent, AddressProvince } from './address-dialog.component';
import { ParticularsDialogComponent } from './particulars-dialog.component';

// ✅ already have
import { RocSubtypeDialogComponent } from './roc-subtype-dialog.component';
import { TxnTypeDialogComponent, TxnType } from './txn-type-dialog.component';

// ✅ NEW file you need to add
import { RocLevelDialogComponent } from './roc-level-dialog.component';

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
    this.loadPayees();
    this.setupPeriodCovered();
    this.setupPayeeSelectionAutoFill();

    // ✅ auto-check txn + auto-set category flags whenever particulars changes
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
  // ✅ ALSO AUTO-SET catROC/catMA so computation will run
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

  private applyTxnFromParticulars(particularsText: string): void {
    const t = particularsText.toUpperCase();

    const isMod =
      t.includes('MODIFICATION') ||
      t.includes('MODIFIED') ||
      t.includes('MODIF') ||
      t.includes('AMEND') ||
      t.includes('CHANGE') ||
      t.includes('CORRECTION');

    const isRenew =
      t.includes('RENEW') ||
      t.includes('RENEWAL') ||
      t.includes('REVALID') ||
      t.includes('EXTEND') ||
      t.includes('REISSUE') ||
      t.includes('RE-ISSUE');

    const isNew = !isMod && !isRenew;

    this.form.patchValue(
      {
        txnNew: isNew,
        txnRenew: isRenew,
        txnModification: isMod,
      },
      { emitEvent: false }
    );
  }

  // ✅ IMPORTANT: if this is not set, your fee computation stays 0
  private applyCategoryFromParticulars(particularsText: string): void {
    const t = particularsText.toUpperCase();

    const isROC = t.includes('ROC');
    const isMA =
      t.includes('AMATEUR') ||
      t.includes('AT-RSL') ||
      t.includes(' MA ') ||
      t.endsWith(' MA') ||
      t.includes('MA-');

    const patch: any = {};

    if (this.form.get('catROC')) patch.catROC = isROC;
    if (this.form.get('catMA')) patch.catMA = isMA;

    if (this.form.get('catMS')) patch.catMS = false;
    if (this.form.get('catOTHERS')) patch.catOTHERS = false;

    if (Object.keys(patch).length) {
      this.form.patchValue(patch, { emitEvent: true }); // emit so fee component recomputes
    }
  }

  // ✅ force txn exactly from txn dialog selection
  private applyTxnFromTxnChoice(txn: TxnType): void {
    this.form.patchValue(
      {
        txnNew: txn === 'NEW',
        txnRenew: txn === 'RENEW',
        txnModification: txn === 'MOD',
      },
      { emitEvent: false }
    );
  }

  // =========================
  // PAYEES (GET ALL)
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
        for (const item of list) {
          if (!uniq.has(item.id)) uniq.set(item.id, item);
        }

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

  // =========================
  // AUTO-FILL WHEN PAYEE CHANGES
  // =========================
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
              this.toYmd(dto?.periodTo ?? dto?.PeriodTo) ||
              this.toYmd(dto?.to ?? dto?.To);

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

                // blank particulars by rule
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

            this.form.patchValue(
              { txnNew: true, txnRenew: false, txnModification: false },
              { emitEvent: false }
            );
          },
          error: (err) => console.warn('⚠️ No details found for id:', id, err),
        });
      });
  }

  // =========================
  // PARSE periodCovered
  // =========================
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
      return {
        periodFrom: `${m[1]}-${m[2]}-${m[3]}`,
        periodTo: `${m[4]}-${m[5]}-${m[6]}`,
      };
    }

    m = /^(\d{4})-(\d{4})$/.exec(s);
    if (m) {
      const y1 = Number(m[1]);
      const y2 = Number(m[2]);
      if (!y1 || !y2) return {};
      return {
        periodFrom: `${y1}-01-01`,
        periodTo: `${y2}-12-31`,
      };
    }

    return {};
  }

  private toYmd(value: any): string {
    if (!value) return '';
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
      return value.trim();
    }
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

  // =========================
  // ADDRESS DIALOG
  // =========================
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

  // =========================
  // PARTICULARS DIALOG (ROC -> subtype -> (RTG/PHN -> level) -> txn)
  // =========================
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
      if (!service) {
        this.particularsDialogOpen = false;
        return;
      }

      // ROC path
      if (service.toUpperCase() === 'ROC') {
        const ref2 = this.dialog.open(RocSubtypeDialogComponent, {
          width: '520px',
          disableClose: true,
          autoFocus: false,
          restoreFocus: false,
        });

        ref2.afterClosed().subscribe((res2) => {
          if (!res2?.value) {
            this.particularsDialogOpen = false;
            return;
          }

          const subtype = String(res2.value ?? '').trim().toUpperCase();
          if (!subtype) {
            this.particularsDialogOpen = false;
            return;
          }

          // ✅ If RTG or PHN: ask for level 1/2/3
          if (subtype === 'RTG' || subtype === 'PHN') {
            const refLevel = this.dialog.open(RocLevelDialogComponent, {
              width: '420px',
              disableClose: true,
              autoFocus: false,
              restoreFocus: false,
              data: { base: subtype },
            });

            refLevel.afterClosed().subscribe((resL) => {
              if (!resL?.value) {
                this.particularsDialogOpen = false;
                return;
              }

              const leveled = String(resL.value ?? '').trim().toUpperCase(); // 1RTG/2RTG/3RTG or 1PHN/2PHN/3PHN
              if (!leveled) {
                this.particularsDialogOpen = false;
                return;
              }

              this.openTxnTypeDialogAndFinalize(`ROC - ${leveled}`);
            });

            return;
          }

          // Other ROC subtype
          this.openTxnTypeDialogAndFinalize(`ROC - ${subtype}`);
        });

        return;
      }

      // Non-ROC: directly txn
      this.openTxnTypeDialogAndFinalize(service);
    });
  }

  private openTxnTypeDialogAndFinalize(baseText: string): void {
    const ref3 = this.dialog.open(TxnTypeDialogComponent, {
      width: '460px',
      disableClose: true,
      autoFocus: false,
      restoreFocus: false,
    });

    ref3.afterClosed().subscribe((res3) => {
      this.particularsCoolDownUntil = Date.now() + this.COOLDOWN_MS;
      this.particularsDialogOpen = false;

      if (!res3?.value) return;

      const txn = res3.value as TxnType;

      let finalText = baseText;
      if (txn === 'NEW') finalText = `${baseText} - NEW`;
      if (txn === 'RENEW') finalText = `${baseText} - RENEW`;
      if (txn === 'MOD') finalText = `${baseText} - MODIFICATION`;

      // patch particulars
      this.form.patchValue({ particulars: finalText }, { emitEvent: true });

      // ensure category flags so fees compute
      this.applyCategoryFromParticulars(finalText);

      // ensure txn checkboxes
      this.applyTxnFromTxnChoice(txn);
      this.applyTxnFromParticulars(finalText);
    });
  }

  // =========================
  // PERIOD COVERED COMPUTATION
  // =========================
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
}