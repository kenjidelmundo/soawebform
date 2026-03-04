import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subject, combineLatest, of } from 'rxjs';
import { debounceTime, startWith, takeUntil } from 'rxjs/operators';

// SHIP / COASTAL / DELETION
import {
  computeShipStation,
  parseParticularsText,
  rowKeyFromParsed,
  txnFlagsFromTxn,
  buildShipParse,
  PickedTxn,
  ShipStationRow,
  SHIP_STATION,
} from './shipstation.compute';

// ✅ NEW: COASTAL compute
import { computeCoastal, CoastalSurchargeMode } from './coastal.compute';

// ROC
import { computeROC, RocOperatorRow, TxnFlags as RocTxnFlags } from './roc.compute';

// AMATEUR
import { computeAmateur, AmateurRates, TxnFlags as AmateurTxnFlags } from './amateur.compute';

@Component({
  selector: 'app-soa-fees',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './soa-fees.component.html',
  styleUrls: ['./soa-fees.component.css'],
})
export class SoaFeesComponent implements OnInit, OnDestroy {
  @Input() form!: FormGroup;
  @Input() mode: 'left' | 'mid' | 'right' = 'left';

  private destroy$ = new Subject<void>();

  // =========================
  // ROC TABLE (from your screenshot)
  // =========================
  private readonly ROC_OPERATOR: Record<string, RocOperatorRow> = {
    '1RTG': { ROC: 180, DST: 30, SUR50: 0, SUR100: 0 },
    '2RTG': { ROC: 120, DST: 30, SUR50: 0, SUR100: 0 },
    '3RTG': { ROC: 60,  DST: 30, SUR50: 0, SUR100: 0 },

    '1PHN': { ROC: 120, DST: 30, SUR50: 0, SUR100: 0 },
    '2PHN': { ROC: 100, DST: 30, SUR50: 0, SUR100: 0 },
    '3PHN': { ROC: 60,  DST: 30, SUR50: 0, SUR100: 0 },

    'RROC-AIRCRAFT': { ROC: 100, DST: 30, SUR50: 0, SUR100: 0 },
    'SROP':          { ROC: 60,  DST: 30, SUR50: 0, SUR100: 0 },
    'GROC':          { ROC: 60,  DST: 30, SUR50: 0, SUR100: 0 },
    'RROC-RLM':      { ROC: 60,  DST: 30, SUR50: 0, SUR100: 0 },
  };

  private readonly ROC_DEFAULT: RocOperatorRow = { ROC: 60, DST: 30, SUR50: 0, SUR100: 0 };
  private readonly ROC_MOD_FEE = 50;

  // =========================
  // AMATEUR RATES (from your screenshot table)
  // NOTE: used only when particulars starts with "AMATEUR"
  // =========================
  private readonly AMATEUR_RATES: AmateurRates = {
    AT_ROC:        { Purchase: 0,  Possess: 0,  STF: 0,  FF: 0,   CPF: 0,   LF: 0,   ROC: 60,  MOD: 50, DST: 30, SUR50: 30, SUR100: 60 },

    AT_RSL_A:      { Purchase: 50, Possess: 50, STF: 50, FF: 60,  CPF: 0,   LF: 120, ROC: 60,  MOD: 50, DST: 30, SUR50: 60, SUR100: 120 },
    AT_RSL_B:      { Purchase: 50, Possess: 50, STF: 50, FF: 60,  CPF: 0,   LF: 132, ROC: 60,  MOD: 50, DST: 30, SUR50: 66, SUR100: 132 },
    AT_RSL_C:      { Purchase: 50, Possess: 50, STF: 50, FF: 60,  CPF: 0,   LF: 144, ROC: 60,  MOD: 50, DST: 30, SUR50: 72, SUR100: 144 },
    AT_RSL_D:      { Purchase: 50, Possess: 50, STF: 50, FF: 60,  CPF: 0,   LF: 144, ROC: 60,  MOD: 50, DST: 30, SUR50: 72, SUR100: 144 },

    AT_LIFETIME:   { Purchase: 50, Possess: 50, STF: 0,  FF: 60,  CPF: 0,   LF: 50,  ROC: 0,   MOD: 50, DST: 30, SUR50: 0,  SUR100: 0 },

    AT_CLUB_SIMPLEX:  { Purchase: 50, Possess: 50, STF: 50, FF: 180, CPF: 600,  LF: 700,  ROC: 0, MOD: 50, DST: 30, SUR50: 350, SUR100: 700 },
    AT_CLUB_REPEATER: { Purchase: 50, Possess: 50, STF: 50, FF: 180, CPF: 600,  LF: 1320, ROC: 0, MOD: 50, DST: 30, SUR50: 660, SUR100: 1320 },

    SPECIAL_EVENT: { Purchase: 0,  Possess: 0,  STF: 0,  FF: 0,   CPF: 0,   LF: 0,   ROC: 0,   MOD: 0,  DST: 30, SUR50: 0,  SUR100: 0,  SP: 120 },
    VANITY:        { Purchase: 0,  Possess: 0,  STF: 0,  FF: 0,   CPF: 0,   LF: 0,   ROC: 0,   MOD: 0,  DST: 30, SUR50: 0,  SUR100: 0,  SP: 1000 },

    POSSESS_STORAGE: { Purchase: 0, Possess: 50, STF: 0, FF: 0, CPF: 0, LF: 0, ROC: 0, MOD: 0, DST: 30, SUR50: 0, SUR100: 0 },
  };

  ngOnInit(): void {
    if (!this.form) return;
    this.wireCompute();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // =========================================================
  // MAIN WIRE
  // =========================================================
  private wireCompute(): void {
    const particulars = this.ctrl('particulars');
    const yearsCtrl = this.ctrl('periodYears'); // ✅ YOUR FORM uses periodYears

    const shipUnitsCtrl = this.ctrl('shipUnits');
    const withEquipCtrl = this.ctrl('withEquipment');
    const sur100Ctrl = this.ctrl('sur100'); // reused for coastal surcharge selection

    const txnNewCtrl = this.ctrl('txnNew');
    const txnRenewCtrl = this.ctrl('txnRenew');
    const txnModCtrl = this.ctrl('txnModification'); // ✅ YOUR FORM uses txnModification

    if (!particulars || !yearsCtrl) return;

    const particulars$ = particulars.valueChanges.pipe(startWith(particulars.value));
    const years$ = yearsCtrl.valueChanges.pipe(startWith(yearsCtrl.value));

    const shipUnits$ = shipUnitsCtrl
      ? shipUnitsCtrl.valueChanges.pipe(startWith(shipUnitsCtrl.value))
      : of(1).pipe(startWith(1));

    const withEquip$ = withEquipCtrl
      ? withEquipCtrl.valueChanges.pipe(startWith(withEquipCtrl.value))
      : of(false).pipe(startWith(false));

    const sur100$ = sur100Ctrl
      ? sur100Ctrl.valueChanges.pipe(startWith(sur100Ctrl.value))
      : of(false).pipe(startWith(false));

    const txnNew$ = txnNewCtrl ? txnNewCtrl.valueChanges.pipe(startWith(txnNewCtrl.value)) : of(false).pipe(startWith(false));
    const txnRenew$ = txnRenewCtrl ? txnRenewCtrl.valueChanges.pipe(startWith(txnRenewCtrl.value)) : of(false).pipe(startWith(false));
    const txnMod$ = txnModCtrl ? txnModCtrl.valueChanges.pipe(startWith(txnModCtrl.value)) : of(false).pipe(startWith(false));

    combineLatest([particulars$, years$, shipUnits$, withEquip$, sur100$, txnNew$, txnRenew$, txnMod$])
      .pipe(debounceTime(30), takeUntil(this.destroy$))
      .subscribe(([pText, y, shipU, wEq, s100, tNew, tRen, tMod]) => {
        const text = String(pText || '').trim();
        if (!text) return;

        const YEARS = Math.max(1, Math.floor(this.num(y, 1))); // ✅ never 0
        const SHIP_UNITS = Math.max(1, Math.floor(this.num(shipU, 1)));

        // txn flags from checkboxes (if none checked, fallback to text)
        const txnFromChecks = this.txnFromChecks(!!tNew, !!tRen, !!tMod);
        const txnForText = this.txnFromText(text);
        const txn = txnFromChecks ?? txnForText;

        // =========================
        // 1) ROC
        // =========================
        if (text.toUpperCase().startsWith('ROC')) {
          this.clearShipFields();
          this.clearAmateurFields(); // ROC uses same AM block, but we set ROC values below

          const flags: RocTxnFlags = {
            txnNew: txn === 'NEW',
            txnRenew: txn === 'RENEW',
            txnMod: txn === 'MOD',
          };

          const res = computeROC(text, YEARS, flags, this.ROC_OPERATOR, this.ROC_DEFAULT, this.ROC_MOD_FEE);

          this.patch(res.rocRadioStationLicense, 'amRadioOperatorsCert');
          this.patch(res.rocSurcharges, 'amSurcharges');
          this.patch(res.rocDST, 'dst');

          this.patch(0, 'amRadioStationLicense');
          this.patch(0, 'amApplicationFee');
          this.patch(0, 'amFilingFee');
          this.patch(0, 'amSeminarFee');

          this.patch(this.computeTotalAmount(), 'totalAmount');
          return;
        }

        // =========================
        // 2) AMATEUR
        // =========================
        if (text.toUpperCase().startsWith('AMATEUR')) {
          this.clearShipFields();
          const cls = this.extractAmateurClass(text);

          const flags: AmateurTxnFlags = {
            txnNew: txn === 'NEW',
            txnRenew: txn === 'RENEW',
            txnMod: txn === 'MOD',
          };

          const res = computeAmateur(text, cls, YEARS, flags, this.AMATEUR_RATES);

          this.patch(res.maRadioStationLicense, 'amRadioStationLicense');
          this.patch(0, 'amRadioOperatorsCert');
          this.patch(res.maFilingFee, 'amFilingFee');
          this.patch(0, 'amApplicationFee');
          this.patch(0, 'amSeminarFee');

          this.patch(res.maSurcharges, 'amSurcharges');
          this.patch(res.maDST, 'dst');

          this.patch(this.computeTotalAmount(), 'totalAmount');
          return;
        }

        // =========================
        // ✅ 3) COASTAL STATION LICENSE
        // =========================
        if (text.toUpperCase().includes('COASTAL')) {
          this.clearAmateurFields(); // coastal uses LICENSE fields + dst

          // sur mode:
          // - for NEW/MOD: surcharge ignored
          // - for RENEW: if checkbox sur100 true -> SUR100 else SUR50
          const surMode: CoastalSurchargeMode =
            txn === 'RENEW' ? (s100 ? 'SUR100' : 'SUR50') : 'NONE';

          const res = computeCoastal(text, txn as any, YEARS, surMode);

          // Map to your existing "licenses" fields
          // Purchase/Possess are present in table, but your HTML has only these license fields.
          this.patch(res.purchase, 'licPermitToPurchase');
          this.patch(res.possess, 'licPermitToPossess');

          // Filing fee field: your coastal table doesn't have FF for filing; it has "ff" (FF column).
          // We store it to licFilingFee so it still shows (and totals).
          this.patch(res.ff, 'licFilingFee');

          this.patch(res.cp, 'licConstructionPermitFee');

          // License fee + Inspection fee:
          // Your form already has licRadioStationLicense (we put LF here)
          // If you have licInspectionFee control, we fill it too.
          this.patch(res.lf, 'licRadioStationLicense');
          this.patch(res.ifee, 'licInspectionFee');

          // Surcharge goes to licSurcharges
          this.patch(res.surcharge, 'licSurcharges');

          // DST control
          this.patch(res.dst, 'dst');

          this.patch(this.computeTotalAmount(), 'totalAmount');
          return;
        }

        // =========================
        // 4) SHIP / COASTAL / DELETION (existing)
        // =========================
        const parsedShip = parseParticularsText(text);
        if (parsedShip) {
          this.clearAmateurFields();

          const pickedTxn: PickedTxn = txn;
          const rowKey = rowKeyFromParsed(parsedShip);

          const ship = buildShipParse(rowKey, !!wEq, SHIP_UNITS, !!s100);
          const flags = txnFlagsFromTxn(pickedTxn);

          const res = computeShipStation(
            ship,
            YEARS,
            flags,
            SHIP_STATION as Record<string, ShipStationRow>
          );

          this.patch(res.PUR, 'licPermitToPurchase');
          this.patch(res.FF, 'licFilingFee');
          this.patch(res.POS, 'licPermitToPossess');
          this.patch(res.CPF, 'licConstructionPermitFee');
          this.patch(res.LFIF, 'licRadioStationLicense');
          this.patch(res.SUR, 'licSurcharges');
          this.patch(res.DST, 'dst');

          this.patch(this.computeTotalAmount(), 'totalAmount');
          return;
        }

        // If not recognized, do nothing.
      });
  }

  // =========================================================
  // helpers
  // =========================================================
  private ctrl(name: string): AbstractControl | null {
    return this.form?.get(name) ?? null;
  }

  private patch(val: number, name: string): void {
    const c = this.form?.get(name);
    if (!c) return;
    c.patchValue(this.round2(val), { emitEvent: false });
  }

  private num(v: any, fallback = 0): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  private round2(n: number): number {
    const x = this.num(n, 0);
    return Math.round((x + Number.EPSILON) * 100) / 100;
  }

  // checkbox txn override
  private txnFromChecks(tNew: boolean, tRen: boolean, tMod: boolean): PickedTxn | null {
    if (tMod) return 'MOD';
    if (tRen) return 'RENEW';
    if (tNew) return 'NEW';
    return null;
  }

  // fallback txn from text
  private txnFromText(text: string): PickedTxn {
    const up = text.toUpperCase();
    if (up.includes('RENEW')) return 'RENEW';
    if (up.includes('MOD')) return 'MOD';
    return 'NEW';
  }

  private extractAmateurClass(text: string): string {
    const up = text.toUpperCase();
    if (up.includes('CLASS B')) return 'B';
    if (up.includes('CLASS C')) return 'C';
    if (up.includes('CLASS D')) return 'D';
    return 'A';
  }

  // clear groups so old values don’t remain when switching types
  private clearShipFields(): void {
    this.patch(0, 'licPermitToPurchase');
    this.patch(0, 'licFilingFee');
    this.patch(0, 'licPermitToPossess');
    this.patch(0, 'licConstructionPermitFee');
    this.patch(0, 'licRadioStationLicense');
    this.patch(0, 'licInspectionFee');
    this.patch(0, 'licSurcharges');
  }

  private clearAmateurFields(): void {
    this.patch(0, 'amRadioStationLicense');
    this.patch(0, 'amRadioOperatorsCert');
    this.patch(0, 'amApplicationFee');
    this.patch(0, 'amFilingFee');
    this.patch(0, 'amSeminarFee');
    this.patch(0, 'amSurcharges');
  }

  // This matches your TOTAL AMOUNT expression
  private computeTotalAmount(): number {
    const g = (n: string) => this.num(this.form.get(n)?.value, 0);

    const total =
      g('licPermitToPurchase') +
      g('licFilingFee') +
      g('licPermitToPossess') +
      g('licConstructionPermitFee') +
      g('licRadioStationLicense') +
      g('licInspectionFee') +
      g('licSUF') +
      g('licFinesPenalties') +
      g('licSurcharges') +

      g('appRegistrationFee') +
      g('appSupervisionRegulationFee') +
      g('appVerificationAuthFee') +
      g('appExaminationFee') +
      g('appClearanceCertificationFee') +
      g('appModificationFee') +
      g('appMiscIncome') +
      g('appOthers') +

      g('perPermitFees') +
      g('perInspectionFee') +
      g('perFilingFee') +
      g('perSurcharges') +

      g('amRadioStationLicense') +
      g('amRadioOperatorsCert') +
      g('amApplicationFee') +
      g('amFilingFee') +
      g('amSeminarFee') +
      g('amSurcharges') +

      g('dst');

    return this.round2(total);
  }
}