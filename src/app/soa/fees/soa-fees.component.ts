import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { Subject, combineLatest, of } from 'rxjs';
import { startWith, takeUntil } from 'rxjs/operators';

type RocRow = {
  ff: number;
  af: number;
  semFee: number;
  roc: number;
  mod: number;
  dst: number;
  sur50: number;
  sur100: number;
};

interface ShipStationFeeRow {
  FF: number;
  PURF: number;
  POSF: number;
  CPF: number;
  LF: number;
  IF: number;
  MOD: number;
  DST: number;
  SUR50: number;
  SUR100: number;
  cert?: number;
}

@Component({
  selector: 'app-soa-fees',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './soa-fees.component.html',
  styleUrls: ['./soa-fees.component.css'],
})
export class SoaFeesComponent implements OnInit, OnDestroy {
  @Input() form!: FormGroup;
  @Input() mode: 'left' | 'mid' = 'left';

  private destroy$ = new Subject<void>();

  // =====================================================
  // ROC TABLE
  // =====================================================
  private readonly ROC_TABLE: Record<string, RocRow> = {
    'RTG 1st': { ff: 0, af: 0, semFee: 0, roc: 180, mod: 120, dst: 30, sur50: 90, sur100: 180 },
    'RTG 2nd': { ff: 0, af: 0, semFee: 0, roc: 120, mod: 120, dst: 30, sur50: 60, sur100: 120 },
    'RTG 3rd': { ff: 0, af: 0, semFee: 0, roc: 60,  mod: 120, dst: 30, sur50: 30, sur100: 60 },

    'PHN 1st': { ff: 0, af: 0, semFee: 0, roc: 120, mod: 120, dst: 30, sur50: 60, sur100: 120 },
    'PHN 2nd': { ff: 0, af: 0, semFee: 0, roc: 100, mod: 120, dst: 30, sur50: 50, sur100: 100 },
    'PHN 3rd': { ff: 0, af: 0, semFee: 0, roc: 60,  mod: 120, dst: 30, sur50: 30, sur100: 60 },

    'RROC- AIRCRAFT': { ff: 0, af: 0, semFee: 0, roc: 100, mod: 120, dst: 30, sur50: 50, sur100: 100 },

    'SROP':     { ff: 20, af: 20, semFee: 60, roc: 120, mod: 30,  dst: 30, sur50: 30, sur100: 60 },
    'GROC':     { ff: 10, af: 20, semFee: 0,  roc: 60,  mod: 120, dst: 30, sur50: 30, sur100: 60 },
    'RROC-RLM': { ff: 10, af: 20, semFee: 0,  roc: 60,  mod: 120, dst: 30, sur50: 30, sur100: 60 },
  };

  // =====================================================
  // SHIP STATION FEES (kept)
  // =====================================================
  private readonly SHIP_STATION_FEES: Record<string, ShipStationFeeRow> = {
    'DOMESTIC TRADE HIGH POW': { FF: 180, PURF: 240, POSF: 120, CPF: 720, LF: 840, IF: 720, MOD: 180, DST: 30, SUR50: 420, SUR100: 840 },
    'DOMESTIC TRADE MEDIUM POW': { FF: 180, PURF: 120, POSF: 96, CPF: 600, LF: 720, IF: 720, MOD: 180, DST: 30, SUR50: 360, SUR100: 720 },
    'DOMESTIC TRADE LOW POW': { FF: 180, PURF: 60, POSF: 60, CPF: 480, LF: 600, IF: 720, MOD: 180, DST: 30, SUR50: 300, SUR100: 600 },
    'DELETION ': { FF: 180, cert: 200, PURF: 0, POSF: 0, CPF: 0, LF: 0, IF: 0, MOD: 0, DST: 30, SUR50: 0, SUR100: 0 },
  };

  // =====================================================
  // TOTAL FIELDS
  // =====================================================
  private readonly TOTAL_FIELDS: string[] = [
    'licPermitToPurchase','licFilingFee','licPermitToPossess','licConstructionPermitFee',
    'licRadioStationLicense','licInspectionFee','licSUF','licFinesPenalties','licSurcharges',

    'appRegistrationFee','appSupervisionRegulationFee','appVerificationAuthFee','appExaminationFee',
    'appClearanceCertificationFee','appModificationFee','appMiscIncome','appOthers',

    'perPermitFees','perInspectionFee','perFilingFee','perSurcharges',

    'amRadioStationLicense','amRadioOperatorsCert','amApplicationFee','amFilingFee','amSeminarFee','amSurcharges',

    'dst',
  ];

  ngOnInit(): void {
    if (!this.form) return;

    // ✅ ensure selector controls exist (para gumana ROC/Amateur/Ship computations)
    this.ensureCtrl('amType', '');       // ROC computation type (COMM-NEW, etc)
    this.ensureCtrl('rocClass', '');     // ROC class (RTG 1st, etc)
    this.ensureCtrl('rocYears', 1);      // ROC years

    this.ensureCtrl('amateurType', '');  // Amateur formula type (A1-AT-ROC-NEW, etc)
    this.ensureCtrl('amYears', 1);       // Amateur years

    this.ensureCtrl('shipType', '');
    this.ensureCtrl('shipYears', 1);
    this.ensureCtrl('shipUnits', 1);

    this.setupRocComputation();
    this.setupAmateurComputation();
    this.setupShipStationFormulas();
    this.setupTotalComputation();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // =====================================================
  // ROC COMPUTATION -> fills:
  // amRadioOperatorsCert (total), amFilingFee, amSeminarFee, dst
  // =====================================================
  private setupRocComputation(): void {
    const certCtrl = this.form.get('amRadioOperatorsCert');
    const dstCtrl = this.form.get('dst');
    const filingCtrl = this.form.get('amFilingFee');
    const seminarCtrl = this.form.get('amSeminarFee');
    const surCtrl = this.form.get('amSurcharges');
    const modCtrl = this.form.get('appModificationFee');

    if (!certCtrl || !dstCtrl) return;

    const typeCtrl = this.form.get('amType')!;
    const classCtrl = this.form.get('rocClass')!;
    const yearsCtrl = this.form.get('rocYears')!;

    combineLatest([
      typeCtrl.valueChanges.pipe(startWith(typeCtrl.value)),
      classCtrl.valueChanges.pipe(startWith(classCtrl.value)),
      yearsCtrl.valueChanges.pipe(startWith(yearsCtrl.value)),
      surCtrl ? surCtrl.valueChanges.pipe(startWith(surCtrl.value)) : of(0),
      modCtrl ? modCtrl.valueChanges.pipe(startWith(modCtrl.value)) : of(0),
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([type, rocClass, years, surVal, modVal]) => {
        const row = this.ROC_TABLE[String(rocClass || '').trim()];
        if (!row) {
          // if no class selected yet, keep zero but still set dst if needed
          return;
        }

        const yr = this.toNumber(years);
        const sur = this.toNumber(surVal);
        const mod = this.toNumber(modVal);

        let total = 0;

        switch (String(type || '')) {
          case 'COMM-NEW':
          case 'RROC-AIRCRAFT-NEW':
            total = (row.roc * yr) + row.dst;
            break;

          case 'COMM-REN':
          case 'RROC-AIRCRAFT-REN':
            total = (row.roc * yr) + row.dst + sur;
            break;

          case 'TEMP-FOREIGN':
            total = row.roc + row.dst;
            break;

          case 'SROP-NEW':
            total = row.af + row.semFee + (row.roc * yr) + row.dst;
            break;

          case 'SROP-REN':
            total = (row.roc * yr) + row.dst + sur;
            break;

          case 'GROC-NEW':
          case 'RROC-RLM-NEW':
            total = row.ff + row.af + (row.roc * yr) + row.dst;
            break;

          case 'GROC-REN':
          case 'RROC-RLM-REN':
            total = (row.roc * yr) + row.dst + sur;
            break;

          case 'MODIFICATION':
            total = mod + row.dst;
            break;

          default:
            // no type selected -> do nothing
            return;
        }

        this.safePatch(dstCtrl, row.dst);
        this.safePatch(certCtrl, total);

        if (filingCtrl) this.safePatch(filingCtrl, row.ff);
        if (seminarCtrl) this.safePatch(seminarCtrl, row.semFee);
      });
  }

  // =====================================================
  // AMATEUR COMPUTATION (simple + works NOW)
  // Writes to:
  // amRadioStationLicense OR amRadioOperatorsCert? (depends on your meaning)
  //
  // For your UI screenshot: "Radio Station License" is amRadioStationLicense
  // so dito natin ilalagay ang computed total para makita agad.
  // =====================================================
  private setupAmateurComputation(): void {
    const typeCtrl = this.form.get('amateurType')!;
    const yearsCtrl = this.form.get('amYears')!;

    const dstCtrl = this.form.get('dst');
    const surCtrl = this.form.get('amSurcharges');
    const modCtrl = this.form.get('appModificationFee');

    const targetTotalCtrl = this.form.get('amRadioStationLicense'); // ✅ show computed total here

    if (!targetTotalCtrl) return;

    combineLatest([
      typeCtrl.valueChanges.pipe(startWith(typeCtrl.value)),
      yearsCtrl.valueChanges.pipe(startWith(yearsCtrl.value)),
      surCtrl ? surCtrl.valueChanges.pipe(startWith(surCtrl.value)) : of(0),
      dstCtrl ? dstCtrl.valueChanges.pipe(startWith(dstCtrl.value)) : of(0),
      modCtrl ? modCtrl.valueChanges.pipe(startWith(modCtrl.value)) : of(0),
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([type, years, surVal, dstVal, modVal]) => {
        const yr = this.toNumber(years);
        const sur = this.toNumber(surVal);
        const dst = this.toNumber(dstVal) || 30; // fallback
        const mod = this.toNumber(modVal);

        // pull some base fees from existing controls (para connected sa form mo)
        const ff = this.toNumber(this.form.get('amFilingFee')?.value);
        const lf = this.toNumber(this.form.get('amRadioStationLicense')?.value);
        const pur = this.toNumber(this.form.get('licPermitToPurchase')?.value);
        const pos = this.toNumber(this.form.get('licPermitToPossess')?.value);
        const sp = this.toNumber(this.form.get('perPermitFees')?.value);
        const cpf = this.toNumber(this.form.get('licConstructionPermitFee')?.value);

        let result = 0;

        switch (String(type || '')) {
          // A. AT-ROC
          case 'A1-AT-ROC-NEW':
            result = (lf * yr) + dst;
            break;
          case 'A2-AT-ROC-RENEWAL':
            result = (lf * yr) + dst + sur;
            break;
          case 'A3-AT-ROC-MODIFICATION':
            result = mod + dst;
            break;

          // B. Permit to Purchase/Possess
          case 'B1-AT-RSL-PURPOS':
            result = pur + pos + dst;
            break;

          // B. AT-RSL NEW/REN/MOD
          case 'B2-AT-RSL-NEW':
            result = ff + (lf * yr) + dst;
            break;
          case 'B3-AT-RSL-RENEWAL':
            result = (lf * yr) + dst + sur;
            break;
          case 'B4-AT-RSL-MODIFICATION':
            result = ff + mod + dst;
            break;

          // Permit STF
          case 'B5-PERMIT-STF':
            result = sp + dst;
            break;

          // Club
          case 'D2-AT-CLUB-NEW':
            result = ff + cpf + (lf * yr) + dst;
            break;
          case 'D3-AT-CLUB-RENEWAL':
            result = (lf * yr) + dst + sur;
            break;
          case 'D4-AT-CLUB-MODIFICATION':
            result = ff + cpf + mod + dst;
            break;

          default:
            return;
        }

        // ensure DST at least 30 (common)
        if (dstCtrl && this.toNumber(dstCtrl.value) <= 0) {
          this.safePatch(dstCtrl, dst);
        }

        // ✅ show computed result on Amateur block
        this.safePatch(targetTotalCtrl, result);
      });
  }

  // =====================================================
  // SHIP STATION FORMULAS (fixed combineLatest)
  // =====================================================
  private setupShipStationFormulas(): void {
    const typeCtrl = this.form.get('shipType');
    const yearsCtrl = this.form.get('shipYears');
    const unitsCtrl = this.form.get('shipUnits');

    if (!typeCtrl || !yearsCtrl || !unitsCtrl) return;

    combineLatest([
      typeCtrl.valueChanges.pipe(startWith(typeCtrl.value)),
      yearsCtrl.valueChanges.pipe(startWith(yearsCtrl.value)),
      unitsCtrl.valueChanges.pipe(startWith(unitsCtrl.value)),
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([type, years, units]) => {
        const row = this.SHIP_STATION_FEES[String(type || '').trim()];
        if (!row) return;

        const yr = this.toNumber(years);
        const unit = this.toNumber(units);
        const sur = this.toNumber(this.form.get('licSurcharges')?.value);

        let result = 0;

        switch (String(type || '')) {
          case 'A1-PURPOS':
            result = (row.FF * unit) + (row.PURF * unit) + (row.POSF * unit) + row.DST;
            break;
          case 'A2-DOM-NEW-NO-EQ':
            result = row.CPF + (row.LF * yr) + (row.IF * yr) + row.DST;
            break;
          case 'A4-DOM-RENEWAL':
            result = (row.LF * yr) + (row.IF * yr) + row.DST + sur;
            break;
          case 'F-DELETION':
            result = (row.FF * (row.cert ?? 1)) + row.DST;
            break;
          default:
            return;
        }

        // you can decide where to display this result:
        // example put in licRadioStationLicense (pero depende sa UI mo)
        this.safePatch(this.form.get('licRadioStationLicense')!, result);
        this.safePatch(this.form.get('dst')!, row.DST);
      });
  }

  // =====================================================
  // TOTAL COMPUTATION
  // =====================================================
  private setupTotalComputation(): void {
    let totalCtrl = this.form.get('totalAmount');

    if (!totalCtrl) {
      this.form.addControl('totalAmount', new FormControl(0));
      totalCtrl = this.form.get('totalAmount')!;
    }

    for (const name of this.TOTAL_FIELDS) {
      if (!this.form.get(name)) {
        this.form.addControl(name, new FormControl(0));
      }
    }

    const feeCtrls = this.TOTAL_FIELDS
      .map((name) => this.form.get(name))
      .filter((c): c is AbstractControl => !!c);

    combineLatest(feeCtrls.map((ctrl) => ctrl.valueChanges.pipe(startWith(ctrl.value))))
      .pipe(takeUntil(this.destroy$))
      .subscribe((values) => {
        let total = 0;
        for (const val of values) total += this.toNumber(val);
        totalCtrl!.patchValue(total, { emitEvent: false });
      });
  }

  // =====================================================
  // HELPERS
  // =====================================================
  private ensureCtrl(name: string, initial: any): void {
    if (!this.form.get(name)) {
      this.form.addControl(name, new FormControl(initial));
    }
  }

  private safePatch(ctrl: AbstractControl, value: any): void {
    ctrl.patchValue(value, { emitEvent: false });
  }

  private toNumber(value: any): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
}