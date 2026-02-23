import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subject, combineLatest, of } from 'rxjs';
import { debounceTime, map, startWith, takeUntil } from 'rxjs/operators';

type FeeRow = {
  LF?: number;  // License Fee (AT-RSL)
  ROC?: number; // ROC per year (ROC Operator)
  MOD?: number; // Modification fee
  DST?: number;
  SUR?: number; // surcharge (AT-RSL legacy)
  FF?: number;  // Filing Fee (AT-RSL)
};

type RocOperatorRow = {
  ROC: number;     // per year
  DST: number;     // flat
  SUR50: number;   // surcharge 50%
  SUR100: number;  // surcharge 100%
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
  @Input() mode: 'left' | 'mid' | 'right' = 'left';

  private destroy$ = new Subject<void>();

  // ==========================
  // ✅ ROC OPERATOR TABLE (YOUR SHEET)
  // ==========================
  private readonly ROC_OPERATOR: Record<string, RocOperatorRow> = {
    // RTG levels
    '1RTG': { ROC: 180, DST: 30, SUR50: 90, SUR100: 180 },
    '2RTG': { ROC: 120, DST: 30, SUR50: 60, SUR100: 120 },
    '3RTG': { ROC: 60,  DST: 30, SUR50: 30, SUR100: 60 },

    // PHN levels
    '1PHN': { ROC: 120, DST: 30, SUR50: 60, SUR100: 120 },
    '2PHN': { ROC: 100, DST: 30, SUR50: 50, SUR100: 100 },
    '3PHN': { ROC: 60,  DST: 30, SUR50: 30, SUR100: 60 },

    // Other ROC types
    'RROC-AIRCRAFT': { ROC: 100, DST: 30, SUR50: 50, SUR100: 100 },
    'SROP':          { ROC: 60,  DST: 30, SUR50: 30, SUR100: 60 },
    'GROC':          { ROC: 60,  DST: 30, SUR50: 30, SUR100: 60 },
    'RROC-RLM':      { ROC: 60,  DST: 30, SUR50: 30, SUR100: 60 },
  };

  // ✅ if Particulars says just "ROC" without subtype, default to classic 60/30/30
  private readonly ROC_DEFAULT: RocOperatorRow = { ROC: 60, DST: 30, SUR50: 30, SUR100: 60 };

  // ✅ you previously had MOD=50 for ROC modifications; keep it unless you give new sheet for MOD
  private readonly ROC_MOD_FEE = 50;

  // ==========================
  // MA / AT-RSL TABLE (KEEP YOUR CURRENT)
  // ==========================
  private readonly AT_RSL_BY_CLASS: Record<string, FeeRow> = {
    A: { LF: 120, MOD: 50, DST: 30, SUR: 60, FF: 60 },
    B: { LF: 132, MOD: 50, DST: 30, SUR: 66, FF: 60 },
    C: { LF: 144, MOD: 50, DST: 30, SUR: 72, FF: 60 },
    D: { LF: 144, MOD: 50, DST: 30, SUR: 72, FF: 60 },
  };

  ngOnInit(): void {
    if (!this.form) return;

    // ✅ Run if the ROC/MA section exists (NO HTML change)
    const hasROCMASection =
      !!this.form.get('amRadioStationLicense') ||
      !!this.form.get('amSurcharges') ||
      !!this.form.get('dst') ||
      !!this.form.get('totalAmount');

    if (!hasROCMASection) return;

    const catROC$ = this.form.get('catROC')?.valueChanges.pipe(startWith(this.form.get('catROC')?.value)) ?? of(false);
    const catMA$  = this.form.get('catMA') ?.valueChanges.pipe(startWith(this.form.get('catMA') ?.value)) ?? of(false);

    const txnNew$   = this.form.get('txnNew')?.valueChanges.pipe(startWith(this.form.get('txnNew')?.value)) ?? of(false);
    const txnRenew$ = this.form.get('txnRenew')?.valueChanges.pipe(startWith(this.form.get('txnRenew')?.value)) ?? of(false);
    const txnMod$   = this.form.get('txnModification')?.valueChanges.pipe(startWith(this.form.get('txnModification')?.value)) ?? of(false);

    const particulars$ = this.form.get('particulars')?.valueChanges.pipe(startWith(this.form.get('particulars')?.value)) ?? of('');

    const rslClass$ =
      this.form.get('rslClass')?.valueChanges.pipe(startWith(this.form.get('rslClass')?.value)) ??
      of('A');

    const periodYears$ =
      this.form.get('periodYears')?.valueChanges.pipe(startWith(this.form.get('periodYears')?.value)) ??
      of(null);
    const periodFrom$ =
      this.form.get('periodFrom')?.valueChanges.pipe(startWith(this.form.get('periodFrom')?.value)) ??
      of(null);
    const periodTo$ =
      this.form.get('periodTo')?.valueChanges.pipe(startWith(this.form.get('periodTo')?.value)) ??
      of(null);

    combineLatest([catROC$, catMA$, txnNew$, txnRenew$, txnMod$, particulars$, rslClass$, periodYears$, periodFrom$, periodTo$])
      .pipe(
        debounceTime(50),
        map(([catROC, catMA, txnNew, txnRenew, txnMod, particulars, rslClass, periodYears, pf, pt]) => {
          const P = String(particulars ?? '').toUpperCase();

          const isROC = !!catROC || P.includes('ROC');
          const isMA  = !!catMA  || P.includes('AMATEUR') || P.includes('AT-RSL') || P.includes(' MA ');

          const cls = (String(rslClass ?? 'A').trim().toUpperCase() || 'A');
          const years = this.resolveYears(periodYears, pf, pt);

          return {
            isROC, isMA,
            txnNew: !!txnNew, txnRenew: !!txnRenew, txnMod: !!txnMod,
            particulars: String(particulars ?? ''),
            cls, years
          };
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((ctx) => {
        // ✅ default txnNew if none checked (safety)
        if ((ctx.isROC || ctx.isMA) && !ctx.txnNew && !ctx.txnRenew && !ctx.txnMod) {
          this.form.patchValue({ txnNew: true, txnRenew: false, txnModification: false }, { emitEvent: false });
          ctx.txnNew = true;
        }

        if (!ctx.isROC && !ctx.isMA) {
          this.patchROCMA(0, 0, 0, 0, 0, 0, 0, 0);
          return;
        }

        const years = Math.max(1, ctx.years);

        // ======================================================
        // ✅ ROC COMPUTATION (NOW BASED ON YOUR ROC OPERATOR SHEET)
        // ======================================================
        let rocRadioStationLicense = 0;
        let rocSurcharges = 0;
        let rocDST = 0;

        if (ctx.isROC) {
          const P = ctx.particulars;
          const op = this.getRocOperatorRowFromParticulars(P);

          if (ctx.txnMod) {
            // MODIFICATION: MOD + DST
            rocRadioStationLicense = 0;
            rocSurcharges = this.ROC_MOD_FEE;
            rocDST = this.num(op.DST);
          } else if (ctx.txnRenew) {
            // RENEW: ROC*YR + DST + SUR
            rocRadioStationLicense = this.num(op.ROC) * years;
            rocDST = this.num(op.DST);

            // ✅ DEFAULT: SUR50 (since you didn't implement "months late" yet)
            rocSurcharges = this.num(op.SUR50);

            // (optional: if your Particulars ever contains "SUR100", this supports it)
            const up = P.toUpperCase();
            if (up.includes('SUR100') || up.includes('100%')) rocSurcharges = this.num(op.SUR100);
          } else {
            // NEW: ROC*YR + DST
            rocRadioStationLicense = this.num(op.ROC) * years;
            rocDST = this.num(op.DST);
            rocSurcharges = 0;
          }
        }

        // ======================================================
        // ✅ MA / AT-RSL (KEEP YOUR EXISTING LOGIC)
        // ======================================================
        let maRadioStationLicense = 0;
        let maFilingFee = 0;
        let maSurcharges = 0;
        let maDST = 0;

        if (ctx.isMA) {
          const row = this.AT_RSL_BY_CLASS[ctx.cls] ?? this.AT_RSL_BY_CLASS['A'];

          if (ctx.txnMod) {
            maFilingFee = this.num(row.FF);      // FF + MOD + DST
            maSurcharges = this.num(row.MOD);
            maDST = this.num(row.DST);
          } else if (ctx.txnRenew) {
            maRadioStationLicense = this.num(row.LF) * years; // LF*YR + DST + SUR
            maDST = this.num(row.DST);
            maSurcharges = this.num(row.SUR);
          } else {
            maFilingFee = this.num(row.FF);      // FF + LF*YR + DST
            maRadioStationLicense = this.num(row.LF) * years;
            maDST = this.num(row.DST);
          }
        }

        // ======================================================
        // ✅ PATCH YOUR FORM FIELDS
        // ======================================================
        const amRadioStationLicense = rocRadioStationLicense + maRadioStationLicense;
        const amRadioOperatorsCert = 0;
        const amApplicationFee = 0;
        const amFilingFee = maFilingFee; // ROC has none
        const amSeminarFee = 0;
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

        this.patchROCMA(
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

  // ============================================
  // ✅ PARSE ROC OPERATOR FROM PARTICULARS STRING
  // ============================================
  // accepts:
  // "ROC - 1RTG - NEW"
  // "ROC - RTG - NEW" (will default to ROC base 60 unless 1/2/3 is present)
  // "ROC - RROC-AIRCRAFT - RENEW"
  // "ROC - SROP - NEW"
  // "ROC - RROC-RLM - RENEW"
  private getRocOperatorRowFromParticulars(particulars: string): RocOperatorRow {
    const P = String(particulars ?? '').toUpperCase();

    // normalize common separators
    const cleaned = P.replace(/\s+/g, ' ').trim();

    // match 1RTG / 2RTG / 3RTG / 1PHN / 2PHN / 3PHN
    const m = /(1RTG|2RTG|3RTG|1PHN|2PHN|3PHN)/.exec(cleaned);
    if (m?.[1] && this.ROC_OPERATOR[m[1]]) return this.ROC_OPERATOR[m[1]];

    // match explicit keywords
    if (cleaned.includes('RROC-AIRCRAFT') || cleaned.includes('AIRCRAFT')) return this.ROC_OPERATOR['RROC-AIRCRAFT'];
    if (cleaned.includes('RROC-RLM') || cleaned.includes('RLM')) return this.ROC_OPERATOR['RROC-RLM'];
    if (cleaned.includes('SROP')) return this.ROC_OPERATOR['SROP'];
    if (cleaned.includes('GROC')) return this.ROC_OPERATOR['GROC'];

    // if just ROC but no subtype/level
    return this.ROC_DEFAULT;
  }

  private patchROCMA(
    amRadioStationLicense: number,
    amRadioOperatorsCert: number,
    amApplicationFee: number,
    amFilingFee: number,
    amSeminarFee: number,
    amSurcharges: number,
    dst: number,
    totalAmount: number
  ) {
    // ✅ patch only existing controls (won’t break your form)
    const p: any = {};

    if (this.form.get('amRadioStationLicense')) p.amRadioStationLicense = this.round2(amRadioStationLicense);
    if (this.form.get('amRadioOperatorsCert')) p.amRadioOperatorsCert = this.round2(amRadioOperatorsCert);
    if (this.form.get('amApplicationFee')) p.amApplicationFee = this.round2(amApplicationFee);
    if (this.form.get('amFilingFee')) p.amFilingFee = this.round2(amFilingFee);
    if (this.form.get('amSeminarFee')) p.amSeminarFee = this.round2(amSeminarFee);
    if (this.form.get('amSurcharges')) p.amSurcharges = this.round2(amSurcharges);
    if (this.form.get('dst')) p.dst = this.round2(dst);
    if (this.form.get('totalAmount')) p.totalAmount = this.round2(totalAmount);

    if (Object.keys(p).length) {
      this.form.patchValue(p, { emitEvent: false });
    }
  }

  private resolveYears(periodYearsValue: any, periodFrom: any, periodTo: any): number {
    const y = Math.floor(Number(periodYearsValue));
    if (Number.isFinite(y) && y > 0) return y;

    const from = this.toDate(periodFrom);
    const to = this.toDate(periodTo);
    if (from && to && to >= from) {
      const diffDays = Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
      return Math.max(1, Math.round(diffDays / 365));
    }
    return 1;
  }

  private toDate(v: any): Date | null {
    if (!v) return null;
    const d = v instanceof Date ? v : new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }

  private num(v: any): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  private round2(n: number): number {
    return Math.round((this.num(n) + Number.EPSILON) * 100) / 100;
  }
}