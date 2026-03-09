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
import { Subject, combineLatest } from 'rxjs';
import { startWith, takeUntil } from 'rxjs/operators';

import { SoaService } from '../soa.service';

import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AddressDialogComponent } from './address-dialog.component';
import { ParticularsDialogComponent } from './particulars-dialog.component';
import { TxnTypeDialogComponent, TxnType } from './txn-type-dialog.component';

import { openRocParticularsFlow } from './particulars-roc.flow';
import { openShipStationParticularsFlow } from './particulars-ship.flow';
import { openAmateurParticularsFlow } from './particulars-amateur.flow';
import { openCoastalLicenseParticularsFlow } from './particulars-c.license.flow';
import { openVhfUhfParticularsFlow } from './particulars-vhfuhf.flow';
import { openMobilePhoneParticularsFlow } from './particulars-mobilephone.flow';
import { openTvroCatvParticularsFlow } from './particulars-tvrocatv.flow';

import { AddressService } from './address.service';

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

  constructor(
    private soaService: SoaService,
    private el: ElementRef<HTMLElement>,
    private renderer: Renderer2,
    private dialog: MatDialog,
    private addressSvc: AddressService
  ) {}

  ngOnInit(): void {
    if (!this.form) return;

    this.loadPayees();
    this.setupPeriodCovered();
    this.setupPayeeSelectionAutoFill();
    this.setupAutoTxnFromParticulars();
  }

  ngAfterViewInit(): void {
    const addressInput = this.el.nativeElement.querySelector(
      'input[formControlName="address"]'
    ) as HTMLInputElement | null;

    if (addressInput) {
      this.renderer.setAttribute(addressInput, 'readonly', 'true');
      this.renderer.setStyle(addressInput, 'cursor', 'pointer');
      this.renderer.setStyle(addressInput, 'pointer-events', 'auto');

      this.unlistenAddressClick = this.renderer.listen(addressInput, 'click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (Date.now() < this.addressCoolDownUntil) return;
        this.openAddressDialog();
      });
    }

    const partInput = this.el.nativeElement.querySelector(
      'input[formControlName="particulars"], textarea[formControlName="particulars"]'
    ) as (HTMLInputElement | HTMLTextAreaElement) | null;

    if (partInput) {
      this.renderer.setAttribute(partInput, 'readonly', 'true');
      this.renderer.setStyle(partInput, 'cursor', 'pointer');
      this.renderer.setStyle(partInput, 'pointer-events', 'auto');

      this.unlistenPartClick = this.renderer.listen(partInput, 'click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (Date.now() < this.particularsCoolDownUntil) return;
        this.openParticularsDialog();
      });
    }

    // ✅ date = calendar again
    const dateInput = this.el.nativeElement.querySelector(
      'input[formControlName="date"]'
    ) as HTMLInputElement | null;

    if (dateInput) {
      this.renderer.setAttribute(dateInput, 'type', 'date');
      this.renderer.removeAttribute(dateInput, 'readonly');
      this.renderer.setStyle(dateInput, 'cursor', 'pointer');
    }

    // ✅ periodFrom = calendar again
    const periodFromInput = this.el.nativeElement.querySelector(
      'input[formControlName="periodFrom"]'
    ) as HTMLInputElement | null;

    if (periodFromInput) {
      this.renderer.setAttribute(periodFromInput, 'type', 'date');
      this.renderer.removeAttribute(periodFromInput, 'readonly');
      this.renderer.setStyle(periodFromInput, 'cursor', 'pointer');
    }

    // ✅ periodTo = calendar again
    const periodToInput = this.el.nativeElement.querySelector(
      'input[formControlName="periodTo"]'
    ) as HTMLInputElement | null;

    if (periodToInput) {
      this.renderer.setAttribute(periodToInput, 'type', 'date');
      this.renderer.removeAttribute(periodToInput, 'readonly');
      this.renderer.setStyle(periodToInput, 'cursor', 'pointer');
    }
  }

  ngOnDestroy(): void {
    this.unlistenAddressClick?.();
    this.unlistenPartClick?.();
    this.destroy$.next();
    this.destroy$.complete();
  }

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
    const t = String(particularsText ?? '').toUpperCase();

    if (
      t.includes('VHF') ||
      t.includes('UHF') ||
      t.includes('VHF/UHF') ||
      t.includes('RADIO STATIONS')
    ) {
      return;
    }

    const hasMod =
      /\bMOD\b/.test(t) ||
      t.includes('MODIFICATION') ||
      t.includes('MODIFIED') ||
      t.includes('MODIF') ||
      t.includes('AMEND') ||
      t.includes('CHANGE') ||
      t.includes('CORRECTION');

    const hasRenew =
      /\bRENEW(AL)?\b/.test(t) ||
      t.includes('REVALID') ||
      t.includes('EXTEND') ||
      t.includes('REISSUE') ||
      t.includes('RE-ISSUE');

    const hasNew = /\bNEW\b/.test(t) || t.includes('NEW APPLICATION');

    const curNew = this.getBoolDeep('txnNew');
    const curRenew = this.getBoolDeep('txnRenew');
    const curMod = this.getBoolDeep('txnModification');
    const anySelected = curNew || curRenew || curMod;

    if (hasMod || hasRenew || hasNew) {
      this.setTxnEverywhere({
        txnNew: hasNew && !hasMod && !hasRenew,
        txnRenew: hasRenew && !hasMod,
        txnModification: hasMod,
      });
      return;
    }

    if (anySelected) return;

    this.setTxnEverywhere({ txnNew: true, txnRenew: false, txnModification: false });
  }

  private applyTxnFromTxnChoice(txn: TxnType): void {
    this.setTxnEverywhere({
      txnNew: txn === 'NEW',
      txnRenew: txn === 'RENEW',
      txnModification: txn === 'MOD',
    });

    this.setStringDeep('txnType', txn);
    this.setStringDeep('transactionType', txn);
  }

  private setTxnEverywhere(v: {
    txnNew: boolean;
    txnRenew: boolean;
    txnModification: boolean;
  }): void {
    this.setBoolDeep('txnNew', v.txnNew);
    this.setBoolDeep('txnRenew', v.txnRenew);
    this.setBoolDeep('txnModification', v.txnModification);
  }

  private getBoolDeep(controlName: string): boolean {
    return this.findBoolInFormTree(this.form, [controlName]);
  }

  private setBoolDeep(controlName: string, value: boolean): void {
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
          if (typeof current === 'boolean') child.setValue(value, { emitEvent: false });
        }

        walk(child);
      }
    };

    walk(this.form as any);
  }

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

            // ✅ fetch saved date from DB, not today's date
            const savedDate =
              this.toYmd(dto?.dateIssued ?? dto?.DateIssued ?? dto?.date ?? dto?.Date) || '';

            // ✅ fetch saved current periodTo from DB
            const directTo =
              this.toYmd(dto?.periodTo ?? dto?.PeriodTo) || this.toYmd(dto?.to ?? dto?.To);

            const parsed = this.periodCoveredToDates(dto?.periodCovered ?? dto?.PeriodCovered);
            const parsedTo = parsed.periodTo ?? '';

            const oldTo = directTo || parsedTo || '';

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

                // ✅ date = saved DB date
                date: savedDate || this.form.get('date')?.value || '',

                // ✅ periodFrom = saved current dateTo from DB
                periodFrom: oldTo,

                // ✅ periodTo = computed from years input
                periodTo: '',
              },
              { emitEvent: true }
            );

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
      yearsCtrl.valueChanges.pipe(startWith(yearsCtrl.value)),
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([from, years]) => {
        const computedTo = this.computeDateToFromYears(from, years);

        toCtrl.setValue(computedTo, { emitEvent: false });
        coveredCtrl.setValue(this.computeDateRange(from, computedTo), { emitEvent: false });
      });
  }

  private computeDateRange(from: any, to: any): string {
    const f = this.parseDisplayOrYmdToDate(from);
    const t = this.parseDisplayOrYmdToDate(to);

    if (!f || !t) return '';
    if (t < f) return '';

    return `${this.toDisplayDate(f)}-${this.toDisplayDate(t)}`;
  }

  private computeYears(from: any, to: any): number {
    const f = this.parseDisplayOrYmdToDate(from);
    const t = this.parseDisplayOrYmdToDate(to);

    if (!f || !t) return 0;
    if (t < f) return 0;

    const diffMs = t.getTime() - f.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    const years = diffDays / 365.25;

    return Number(years.toFixed(2));
  }

  private openAddressDialog(): void {
    if (this.addressDialogOpen) return;

    this.addressCoolDownUntil = Date.now() + this.COOLDOWN_MS;
    this.addressDialogOpen = true;

    this.addressSvc.getProvinces().subscribe({
      next: (provinces) => {
        if (!Array.isArray(provinces) || provinces.length === 0) {
          console.error('❌ Address API returned EMPTY list', provinces);
          alert('Address list is empty. Check /api/Address/provinces');
          this.addressDialogOpen = false;
          return;
        }

        const init = {
          province: String(this.form.get('province')?.value ?? '').trim() || undefined,
          townCity: String(this.form.get('townCity')?.value ?? '').trim() || undefined,
          brgy: String(this.form.get('brgy')?.value ?? '').trim() || undefined,
          line4: String(this.form.get('line4')?.value ?? '').trim() || undefined,
        };

        const ref = this.dialog.open(AddressDialogComponent, {
          width: '560px',
          disableClose: true,
          autoFocus: false,
          restoreFocus: false,
          data: { provinces: provinces as any, initial: init },
        });

        ref.afterClosed().subscribe((res) => {
          this.addressDialogOpen = false;

          const addressInput = this.el.nativeElement.querySelector(
            'input[formControlName="address"]'
          ) as HTMLInputElement | null;
          addressInput?.blur();

          if (!res) return;

          this.form.patchValue({ address: res.fullAddress }, { emitEvent: true });

          if (this.form.get('province')) {
            this.form.get('province')?.setValue(res.province, { emitEvent: false });
          }
          if (this.form.get('townCity')) {
            this.form.get('townCity')?.setValue(res.townCity, { emitEvent: false });
          }
          if (this.form.get('brgy')) {
            this.form.get('brgy')?.setValue(res.brgy, { emitEvent: false });
          }
          if (this.form.get('line4')) {
            this.form.get('line4')?.setValue(res.line4, { emitEvent: false });
          }

          this.addressCoolDownUntil = Date.now() + this.COOLDOWN_MS;
        });
      },
      error: (err) => {
        console.error('❌ Address API ERROR:', err);
        alert('Failed to load address list from API. Check console/network.');
        this.addressDialogOpen = false;
        this.addressCoolDownUntil = Date.now() + this.COOLDOWN_MS;
      },
    });
  }

  private openParticularsDialog(): void {
    if (this.particularsDialogOpen) return;

    this.particularsCoolDownUntil = Date.now() + this.COOLDOWN_MS;
    this.particularsDialogOpen = true;

    const ref = this.dialog.open(ParticularsDialogComponent, {
      width: '640px',
      maxWidth: '92vw',
      panelClass: 'soa-dlg',
      disableClose: true,
      autoFocus: false,
      restoreFocus: false,
    });

    ref.afterClosed().subscribe((res: any) => {
      this.particularsDialogOpen = false;

      const partInput = this.el.nativeElement.querySelector(
        'input[formControlName="particulars"], textarea[formControlName="particulars"]'
      ) as (HTMLInputElement | HTMLTextAreaElement) | null;
      partInput?.blur();

      if (!res) return;

      const kindRaw =
        res?.value ??
        res?.type ??
        res?.kind ??
        res?.selected ??
        res?.category ??
        res;

      const kind = String(kindRaw ?? '').toUpperCase().trim();

      switch (kind) {
        case 'ROC':
          openRocParticularsFlow(this.dialog, () => {}, (finalText: string, txn?: TxnType) => {
            this.applyFinalParticulars(finalText, txn);
          });
          return;

        case 'SHIPSTATION':
          openShipStationParticularsFlow(
            this.dialog,
            () => {},
            (finalText: string, txn?: TxnType) => {
              this.applyFinalParticulars(finalText, txn);
            }
          );
          return;

        case 'AMATEUR':
          openAmateurParticularsFlow(
            this.dialog,
            () => {},
            (finalText: string, txn?: TxnType) => {
              this.applyFinalParticulars(finalText, txn);
            }
          );
          return;

        case 'COASTAL':
          openCoastalLicenseParticularsFlow(
            this.dialog,
            () => {},
            (finalText: string, txn?: TxnType) => {
              this.applyFinalParticulars(finalText, txn);
            }
          );
          return;

        case 'VHFUHF':
          openVhfUhfParticularsFlow(this.dialog, () => {}, (finalText: string) => {
            this.applyFinalParticulars(finalText, undefined);
          });
          return;

        case 'MOBILEPHONE':
          openMobilePhoneParticularsFlow(
            this.dialog,
            () => {},
            (finalText: string, txn?: TxnType) => {
              this.applyFinalParticulars(finalText, txn);
            }
          );
          return;

        case 'TVROCATV':
          openTvroCatvParticularsFlow(
            this.dialog,
            () => {},
            (finalText: string, txn?: TxnType) => {
              this.applyFinalParticulars(finalText, txn);
            }
          );
          return;
      }

      if (kind.includes('SHIP')) {
        openShipStationParticularsFlow(
          this.dialog,
          () => {},
          (finalText: string, txn?: TxnType) => {
            this.applyFinalParticulars(finalText, txn);
          }
        );
        return;
      }

      if (kind.includes('AMATEUR') || kind.includes('AT-') || kind.includes('MA')) {
        openAmateurParticularsFlow(this.dialog, () => {}, (finalText: string, txn?: TxnType) => {
          this.applyFinalParticulars(finalText, txn);
        });
        return;
      }

      if (kind.includes('COASTAL')) {
        openCoastalLicenseParticularsFlow(
          this.dialog,
          () => {},
          (finalText: string, txn?: TxnType) => {
            this.applyFinalParticulars(finalText, txn);
          }
        );
        return;
      }

      if (kind.includes('VHF') || kind.includes('UHF')) {
        openVhfUhfParticularsFlow(this.dialog, () => {}, (finalText: string) => {
          this.applyFinalParticulars(finalText, undefined);
        });
        return;
      }

      if (kind.includes('MOBILE')) {
        openMobilePhoneParticularsFlow(
          this.dialog,
          () => {},
          (finalText: string, txn?: TxnType) => {
            this.applyFinalParticulars(finalText, txn);
          }
        );
        return;
      }

      if (kind.includes('TVRO') || kind.includes('CATV')) {
        openTvroCatvParticularsFlow(
          this.dialog,
          () => {},
          (finalText: string, txn?: TxnType) => {
            this.applyFinalParticulars(finalText, txn);
          }
        );
        return;
      }

      if (/\bROC\b/.test(kind)) {
        openRocParticularsFlow(this.dialog, () => {}, (finalText: string, txn?: TxnType) => {
          this.applyFinalParticulars(finalText, txn);
        });
        return;
      }

      const txt = String(res?.finalText ?? res?.text ?? '').trim();
      if (txt) this.applyFinalParticulars(txt, undefined);

      this.particularsCoolDownUntil = Date.now() + this.COOLDOWN_MS;
    });
  }

  private applyFinalParticulars(finalText: string, txn?: TxnType): void {
    const patch: any = {
      particulars: finalText,
    };

    if (txn) {
      if (this.form.get('txnType')) patch.txnType = txn;
      if (this.form.get('transactionType')) patch.transactionType = txn;
      this.applyTxnFromTxnChoice(txn);
    }

    this.form.patchValue(patch, { emitEvent: true });
    this.form.get('particulars')?.updateValueAndValidity({ emitEvent: true });

    this.applyCategoryFromParticulars(finalText);
  }

  private openTxnTypeDialogAndFinalize(
    baseText: string,
    finalize: (finalText: string, txn: TxnType) => void,
    cancel: () => void
  ): void {
    const ref = this.dialog.open(TxnTypeDialogComponent, {
      width: '420px',
      maxWidth: '92vw',
      panelClass: 'soa-dlg',
      disableClose: true,
      autoFocus: false,
      restoreFocus: false,
    });

    ref.afterClosed().subscribe((r: any) => {
      const txn: TxnType | undefined = r?.value ?? r?.txn ?? r;
      if (!txn) {
        cancel();
        return;
      }

      const txnText = txn === 'MOD' ? 'MODIFICATION' : txn;
      const finalText = `${baseText} - ${txnText}`;
      finalize(finalText, txn);
    });
  }

  private periodCoveredToDates(periodCovered: any): { periodFrom?: string; periodTo?: string } {
    const s = String(periodCovered ?? '').trim();
    if (!s) return {};

    const parts = s.split('-').map((x) => x.trim());
    if (parts.length < 2) return {};

    const p1 = this.parseToYmd(parts[0]);
    const p2 = this.parseToYmd(parts[1]);

    const out: any = {};
    if (p1) out.periodFrom = p1;
    if (p2) out.periodTo = p2;
    return out;
  }

  private parseToYmd(raw: string): string {
    const v = String(raw ?? '').trim();
    if (!v) return '';

    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;

    const m1 = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m1) {
      const mm = Number(m1[1]);
      const dd = Number(m1[2]);
      const y = Number(m1[3]);
      return this.toYmdFromParts(y, mm, dd);
    }

    const d = new Date(v);
    if (!isNaN(d.getTime())) return this.toYmd(d);

    return '';
  }

  private toYmd(value: any): string {
    if (!value) return '';
    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private toDisplayDate(value: any): string {
    if (!value) return '';
    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return '';
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  }

  private toYmdFromParts(y: number, m: number, d: number): string {
    if (!y || !m || !d) return '';
    const mm = String(m).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  }

  private addDays(yyyyMmDd: string, days: number): string {
    const s = String(yyyyMmDd ?? '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return yyyyMmDd;
    const dt = new Date(s + 'T00:00:00');
    if (isNaN(dt.getTime())) return yyyyMmDd;
    dt.setDate(dt.getDate() + Number(days || 0));
    return this.toYmd(dt);
  }

  private computeDateToFromYears(from: any, years: any): string {
    const f = this.parseDisplayOrYmdToDate(from);
    const y = Number(years ?? 0);

    if (!f || !isFinite(y) || y <= 0) return '';

    const wholeYears = Math.floor(y);
    const fraction = y - wholeYears;

    const d = new Date(f);
    d.setFullYear(d.getFullYear() + wholeYears);

    if (fraction > 0) {
      const extraDays = Math.round(fraction * 365.25);
      d.setDate(d.getDate() + extraDays);
    }

    // ✅ return yyyy-MM-dd because periodTo is calendar input
    return this.toYmd(d);
  }

  private parseDisplayOrYmdToDate(value: any): Date | null {
    const v = String(value ?? '').trim();
    if (!v) return null;

    // MM/dd/yyyy
    const m1 = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m1) {
      const mm = Number(m1[1]) - 1;
      const dd = Number(m1[2]);
      const yyyy = Number(m1[3]);
      const d = new Date(yyyy, mm, dd);
      return isNaN(d.getTime()) ? null : d;
    }

    // yyyy-MM-dd
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      const d = new Date(v + 'T00:00:00');
      return isNaN(d.getTime()) ? null : d;
    }

    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }

  private findBoolInFormTree(
    root: AbstractControl | null | undefined,
    keywords: string[]
  ): boolean {
    if (!root) return false;

    const targets = (keywords ?? []).map((k) => String(k).toLowerCase());
    let found = false;

    for (const k of targets) {
      const direct = this.form?.get(k);
      if (direct && typeof direct.value === 'boolean') return !!direct.value;
    }

    const walk = (ctrl: any, path: string) => {
      if (!ctrl || found) return;

      const controls = ctrl.controls;
      if (!controls || typeof controls !== 'object') return;

      for (const key of Object.keys(controls)) {
        if (found) return;

        const child = controls[key];
        const keyLower = String(key).toLowerCase();
        const full = path ? `${path}.${keyLower}` : keyLower;

        if (targets.some((t) => keyLower === t || full.endsWith(t) || keyLower.endsWith(t))) {
          if (typeof child?.value === 'boolean') {
            found = !!child.value;
            return;
          }
        }

        walk(child, full);
      }
    };

    walk(root as any, '');
    return found;
  }
}