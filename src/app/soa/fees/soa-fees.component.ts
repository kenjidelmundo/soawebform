import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subject, combineLatest, of } from 'rxjs';
import { debounceTime, map, startWith, takeUntil } from 'rxjs/operators';

type FeeRow = {
  LF?: number;   // License Fee (yearly)
  ROC?: number;  // ROC yearly
  MOD?: number;  // modification fee (fixed)
  DST?: number;  // documentary stamp tax (fixed)
  SUR?: number;  // surcharge (50% of LF or ROC) depending on rule
};

@Component({
  selector: 'app-soa-fees',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './soa-fees.component.html',
  styleUrls: ['./soa-fees.component.css'],
})
export class SoaFeesComponent implements OnInit, OnDestroy {
  @Input() form!: FormGroup;

  // ✅ your HTML uses mode (left/mid/right)
  @Input() mode: 'left' | 'mid' | 'right' = 'left';

  private destroy$ = new Subject<void>();

  // ✅ Values based on your screenshots (adjust if needed)
  // Table with columns: LF, ROC, MOD, DST, SUR(50%)
  private readonly AT_ROC: FeeRow = {
    ROC: 60,
    MOD: 50,
    DST: 30,
    SUR: 30, // 50% of ROC (60 * 0.5)
  };

  private readonly AT_RSL_BY_CLASS: Record<string, FeeRow> = {
    A: { LF: 120, ROC: 60, MOD: 50, DST: 30, SUR: 60 }, // SUR 50% of LF (120*0.5=60)
    B: { LF: 132, ROC: 60, MOD: 50, DST: 30, SUR: 66 },
    C: { LF: 144, ROC: 60, MOD: 50, DST: 30, SUR: 72 },
    D: { LF: 144, ROC: 60, MOD: 50, DST: 30, SUR: 72 }, // if your table has D
  };

  ngOnInit(): void {
    const catROC$ = this.form.get('catROC')?.valueChanges.pipe(startWith(this.form.get('catROC')?.value)) ?? of(false);
    const catMA$ = this.form.get('catMA')?.valueChanges.pipe(startWith(this.form.get('catMA')?.value)) ?? of(false);

    const txnNew$ = this.form.get('txnNew')?.valueChanges.pipe(startWith(this.form.get('txnNew')?.value)) ?? of(false);
    const txnRenew$ = this.form.get('txnRenew')?.valueChanges.pipe(startWith(this.form.get('txnRenew')?.value)) ?? of(false);
    const txnMod$ = this.form.get('txnModification')?.valueChanges.pipe(startWith(this.form.get('txnModification')?.value)) ?? of(false);

    const particulars$ =
      this.form.get('particulars')?.valueChanges.pipe(startWith(this.form.get('particulars')?.value)) ?? of('');

    // optional: if you have rslClass control; else default A
    const rslClass$ =
      this.form.get('rslClass')?.valueChanges.pipe(startWith(this.form.get('rslClass')?.value)) ?? of('A');

    // period/year controls
    const years$ =
      this.form.get('years')?.valueChanges.pipe(startWith(this.form.get('years')?.value)) ?? of(null);

    const periodFrom$ =
      this.form.get('periodFrom')?.valueChanges.pipe(startWith(this.form.get('periodFrom')?.value)) ?? of(null);

    const periodTo$ =
      this.form.get('periodTo')?.valueChanges.pipe(startWith(this.form.get('periodTo')?.value)) ?? of(null);

    combineLatest([
      catROC$,
      catMA$,
      txnNew$,
      txnRenew$,
      txnMod$,
      particulars$,
      rslClass$,
      years$,
      periodFrom$,
      periodTo$,
    ])
      .pipe(
        debounceTime(80),
        map(([catROC, catMA, txnNew, txnRenew, txnMod, particulars, rslClass, years, pf, pt]) => {
          const P = String(particulars ?? '').toUpperCase();

          const isROC = !!catROC || P.includes('ROC');
          const isMA = !!catMA || P.includes('AMATEUR') || P.includes('MA');

          const cls = (String(rslClass ?? 'A').trim().toUpperCase() || 'A');
          const y = this.resolveYears(years, pf, pt);

          return {
            isROC,
            isMA,
            txnNew: !!txnNew,
            txnRenew: !!txnRenew,
            txnMod: !!txnMod,
            cls,
            years: y,
          };
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((ctx) => {
        // Only compute if ROC or MA selected
        if (!ctx.isROC && !ctx.isMA) {
          // optional: clear fields when not ROC/MA
          this.patchFees(0, 0, 0, 0, 0, 0, 0, 0);
          return;
        }

        // -----------------------------
        // Citizen Charter rules (from screenshot)
        // A.1 AT-ROC (NEW):       FEE AT-ROC = (ROC)(YR) + DST
        // A.2 AT-ROC (RENEWAL):   FEE AT-ROC = (ROC)(YR) + DST + SUR
        // A.3 AT-ROC (MODIF):     FEE AT-ROC = MOD + DST
        //
        // B.2 AT-RSL (NEW):       FEE AT-RSL = FF + (LF)(YR) + DST
        // B.3 AT-RSL (RENEWAL):   FEE AT-RSL = (LF)(YR) + DST + SUR
        // B.4 AT-RSL (MODIF):     FEE AT-RSL = FF + MOD + DST
        // -----------------------------

        const years = ctx.years;

        // -------------- ROC block --------------
        let rocRadioStationLicense = 0;
        let rocOperatorsCert = 0;
        let rocApplicationFee = 0;
        let rocFilingFee = 0;
        let rocSeminarFee = 0;
        let rocSurcharges = 0;
        let rocDST = 0;

        if (ctx.isROC) {
          const row = this.AT_ROC;

          if (ctx.txnMod) {
            // MOD + DST
            rocRadioStationLicense = 0;
            rocOperatorsCert = 0;
            rocSurcharges = this.num(row.MOD);
            rocDST = this.num(row.DST);
          } else if (ctx.txnRenew) {
            // (ROC*YR) + DST + SUR
            rocRadioStationLicense = this.num(row.ROC) * years;
            rocDST = this.num(row.DST);
            rocSurcharges = this.num(row.SUR);
          } else {
            // default NEW if txnNew or none checked
            // (ROC*YR) + DST
            rocRadioStationLicense = this.num(row.ROC) * years;
            rocDST = this.num(row.DST);
            rocSurcharges = 0;
          }
        }

        // -------------- MA / AT-RSL block --------------
        // We'll map MA to your "FOR AMATEUR AND ROC" fields too.
        // radio station license = LF (yearly) * years
        // filing fee = FF (if you have it as a separate fee, put it here)
        // MOD goes to surcharges field (since no separate MOD field in UI)
        let maRadioStationLicense = 0;
        let maOperatorsCert = 0;
        let maApplicationFee = 0;
        let maFilingFee = 0;
        let maSeminarFee = 0;
        let maSurcharges = 0;
        let maDST = 0;

        if (ctx.isMA) {
          const row = this.AT_RSL_BY_CLASS[ctx.cls] ?? this.AT_RSL_BY_CLASS['A'];

          if (ctx.txnMod) {
            // FF + MOD + DST  (we don't have FF column in your LF table screenshot,
            // so set filing fee = 0 unless you add it. MOD -> surcharges field.)
            maRadioStationLicense = 0;
            maFilingFee = 0;
            maSurcharges = this.num(row.MOD);
            maDST = this.num(row.DST);
          } else if (ctx.txnRenew) {
            // (LF*YR) + DST + SUR
            maRadioStationLicense = this.num(row.LF) * years;
            maDST = this.num(row.DST);
            maSurcharges = this.num(row.SUR);
          } else {
            // NEW: FF + (LF*YR) + DST
            maRadioStationLicense = this.num(row.LF) * years;
            maDST = this.num(row.DST);
            maFilingFee = 0; // put FF here if you have it
            maSurcharges = 0;
          }

          // If you want Operators Cert fee for MA as ROC column:
          // maOperatorsCert = this.num(row.ROC) * years;  // optional
          maOperatorsCert = 0;

          // Application/Seminar are 0 unless you have values
          maApplicationFee = 0;
          maSeminarFee = 0;
        }

        // If both ROC and MA checked, sum them (common in your UI logic)
        const amRadioStationLicense = rocRadioStationLicense + maRadioStationLicense;
        const amRadioOperatorsCert = rocOperatorsCert + maOperatorsCert;
        const amApplicationFee = rocApplicationFee + maApplicationFee;
        const amFilingFee = rocFilingFee + maFilingFee;
        const amSeminarFee = rocSeminarFee + maSeminarFee;
        const amSurcharges = rocSurcharges + maSurcharges;
        const dst = rocDST + maDST;

        const totalAmount = this.round2(
          amRadioStationLicense +
            amRadioOperatorsCert +
            amApplicationFee +
            amFilingFee +
            amSeminarFee +
            amSurcharges +
            dst
        );

        this.patchFees(
          amRadioStationLicense,
          amRadioOperatorsCert,
          amApplicationFee,
          amFilingFee,
          amSeminarFee,
          amSurcharges,
          dst,
          totalAmount
        );
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ✅ patches the fields you requested
  private patchFees(
    amRadioStationLicense: number,
    amRadioOperatorsCert: number,
    amApplicationFee: number,
    amFilingFee: number,
    amSeminarFee: number,
    amSurcharges: number,
    dst: number,
    totalAmount: number
  ) {
    this.form.patchValue(
      {
        amRadioStationLicense: this.round2(amRadioStationLicense),
        amRadioOperatorsCert: this.round2(amRadioOperatorsCert),
        amApplicationFee: this.round2(amApplicationFee),
        amFilingFee: this.round2(amFilingFee),
        amSeminarFee: this.round2(amSeminarFee),
        amSurcharges: this.round2(amSurcharges),
        dst: this.round2(dst),
        totalAmount: this.round2(totalAmount),
      },
      { emitEvent: false }
    );
  }

  private resolveYears(yearsControlValue: any, periodFrom: any, periodTo: any): number {
    // 1) if years control exists and has value, use it
    const y = Number(yearsControlValue);
    if (Number.isFinite(y) && y > 0) return Math.floor(y);

    // 2) else compute from dates if possible
    const from = this.toDate(periodFrom);
    const to = this.toDate(periodTo);
    if (from && to) {
      // if period is 21/02/2026 to 20/02/2027 => about 1 year
      const diffDays = Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
      const approxYears = Math.max(1, Math.round(diffDays / 365));
      return approxYears;
    }

    // 3) fallback
    return 1;
  }

  private toDate(v: any): Date | null {
    if (!v) return null;
    if (v instanceof Date && !isNaN(v.getTime())) return v;

    // accept ISO or yyyy-mm-dd
    const d = new Date(v);
    if (!isNaN(d.getTime())) return d;

    return null;
  }

  private num(v: any): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  private round2(n: number): number {
    return Math.round((this.num(n) + Number.EPSILON) * 100) / 100;
  }
}