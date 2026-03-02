import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subject, combineLatest, of } from 'rxjs';
import { debounceTime, map, startWith, takeUntil } from 'rxjs/operators';

import { computeROC, RocOperatorRow } from './roc.compute';
import { computeAmateur, AmateurRates } from './amateur.compute';
import { computeShipStation, ShipParse, ShipStationRow } from './shipstation.compute';

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
  // ROC OPERATOR TABLE
  // ==========================
  private readonly ROC_OPERATOR: Record<string, RocOperatorRow> = {
    '1RTG': { ROC: 180, DST: 30, SUR50: 90, SUR100: 180 },
    '2RTG': { ROC: 120, DST: 30, SUR50: 60, SUR100: 120 },
    '3RTG': { ROC: 60,  DST: 30, SUR50: 30, SUR100: 60 },

    '1PHN': { ROC: 120, DST: 30, SUR50: 60, SUR100: 120 },
    '2PHN': { ROC: 100, DST: 30, SUR50: 50, SUR100: 100 },
    '3PHN': { ROC: 60,  DST: 30, SUR50: 30, SUR100: 60 },

    'RROC-AIRCRAFT': { ROC: 100, DST: 30, SUR50: 50, SUR100: 100 },
    'SROP':          { ROC: 60,  DST: 30, SUR50: 30, SUR100: 60 },
    'GROC':          { ROC: 60,  DST: 30, SUR50: 30, SUR100: 60 },
    'RROC-RLM':      { ROC: 60,  DST: 30, SUR50: 30, SUR100: 60 },
  };
  private readonly ROC_DEFAULT: RocOperatorRow = { ROC: 60, DST: 30, SUR50: 30, SUR100: 60 };
  private readonly ROC_MOD_FEE = 50;

  // ==========================
  // ✅ AMATEUR VALUES (PUT HERE)
  // ==========================
  private readonly AMATEUR_RATES: AmateurRates = {
    AT_ROC: { Purchase: 0, Possess: 0, STF: 0, FF: 0, CPF: 0, LF: 0, ROC: 60, MOD: 50, DST: 30, SUR50: 30, SUR100: 60 },

    AT_RSL_A: { Purchase: 50, Possess: 50, STF: 50, FF: 60, CPF: 0, LF: 120, ROC: 60, MOD: 50, DST: 30, SUR50: 60, SUR100: 120 },
    AT_RSL_B: { Purchase: 50, Possess: 50, STF: 50, FF: 60, CPF: 0, LF: 132, ROC: 60, MOD: 50, DST: 30, SUR50: 66, SUR100: 132 },
    AT_RSL_C: { Purchase: 50, Possess: 50, STF: 50, FF: 60, CPF: 0, LF: 144, ROC: 60, MOD: 50, DST: 30, SUR50: 72, SUR100: 144 },
    AT_RSL_D: { Purchase: 50, Possess: 50, STF: 50, FF: 60, CPF: 0, LF: 144, ROC: 60, MOD: 50, DST: 30, SUR50: 72, SUR100: 144 },

    // ⚠️ if your Excel LF for lifetime is different, change LF here
    AT_LIFETIME: { Purchase: 50, Possess: 50, STF: 50, FF: 60, CPF: 0, LF: 50, ROC: 0, MOD: 50, DST: 30, SUR50: 0, SUR100: 0 },

    AT_CLUB_SIMPLEX: { Purchase: 50, Possess: 50, STF: 50, FF: 180, CPF: 600, LF: 700, ROC: 50, MOD: 50, DST: 30, SUR50: 350, SUR100: 700 },
    AT_CLUB_REPEATER: { Purchase: 50, Possess: 50, STF: 50, FF: 180, CPF: 600, LF: 1320, ROC: 50, MOD: 50, DST: 30, SUR50: 660, SUR100: 1320 },

    SPECIAL_EVENT: { Purchase: 0, Possess: 0, STF: 0, FF: 0, CPF: 0, LF: 0, ROC: 0, MOD: 0, DST: 30, SUR50: 0, SUR100: 0, SP: 120 },
    VANITY: { Purchase: 0, Possess: 0, STF: 0, FF: 0, CPF: 0, LF: 0, ROC: 0, MOD: 0, DST: 30, SUR50: 0, SUR100: 0, SP: 1000 },

    POSSESS_STORAGE: { Purchase: 0, Possess: 50, STF: 0, FF: 0, CPF: 0, LF: 0, ROC: 0, MOD: 0, DST: 30, SUR50: 0, SUR100: 0 },
  };

  // ==========================
  // SHIP STATION
  // ==========================
  private readonly SHIP_STATION: Record<string, ShipStationRow> = {
    'SSL-DOM-HIGH': { FF: 180, Purchase: 240, Possess: 120, CPF: 720,  LF: 840,  IF: 720,  MOD: 180, DST: 30, SUR50: 420, SUR100: 840 },
    'SSL-DOM-MED':  { FF: 180, Purchase: 120, Possess: 96,  CPF: 600,  LF: 720,  IF: 720,  MOD: 180, DST: 30, SUR50: 360, SUR100: 720 },
    'SSL-DOM-LOW':  { FF: 180, Purchase: 96,  Possess: 60,  CPF: 480,  LF: 600,  IF: 720,  MOD: 180, DST: 30, SUR50: 300, SUR100: 600 },

    'SSL-INT-HIGH': { FF: 180, Purchase: 240, Possess: 120, CPF: 1200, LF: 1500, IF: 1200, MOD: 180, DST: 30, SUR50: 750, SUR100: 1500 },
    'SSL-INT-MED':  { FF: 180, Purchase: 120, Possess: 96,  CPF: 1200, LF: 1500, IF: 1200, MOD: 180, DST: 30, SUR50: 750, SUR100: 1500 },
    'SSL-INT-LOW':  { FF: 180, Purchase: 96,  Possess: 60,  CPF: 1200, LF: 1500, IF: 1200, MOD: 180, DST: 30, SUR50: 750, SUR100: 1500 },

    'SSL-INT-EARTH': { FF: 180, Purchase: 360, Possess: 360, CPF: 1200, LF: 1440, IF: 1200, MOD: 180, DST: 30, SUR50: 720, SUR100: 1440 },

    'PCS-RT-HIGH': { FF: 180, Purchase: 240, Possess: 120, CPF: 1320, LF: 1440, IF: 720, MOD: 180, DST: 30, SUR50: 720, SUR100: 1440 },
    'PCS-RT-MED':  { FF: 180, Purchase: 120, Possess: 96,  CPF: 960,  LF: 1200, IF: 720, MOD: 180, DST: 30, SUR50: 600, SUR100: 1200 },
    'PCS-RT-LOW':  { FF: 180, Purchase: 96,  Possess: 60,  CPF: 600,  LF: 1080, IF: 720, MOD: 180, DST: 30, SUR50: 540, SUR100: 1080 },

    'PCS-RP-HF':  { FF: 180, Purchase: 120, Possess: 96, CPF: 480, LF: 720, IF: 720, MOD: 180, DST: 30, SUR50: 360, SUR100: 720 },
    'PCS-RP-VHF': { FF: 180, Purchase: 120, Possess: 96, CPF: 480, LF: 480, IF: 480, MOD: 180, DST: 30, SUR50: 240, SUR100: 480 },

    'CERT-DEL': { FF: 180, Purchase: 0, Possess: 0, CPF: 0, LF: 0, IF: 0, MOD: 0, DST: 30, SUR50: 0, SUR100: 0, CERT: 200 },
  };

  ngOnInit(): void {
    if (!this.form) return;

    const hasSection =
      !!this.form.get('totalAmount') ||
      !!this.form.get('dst') ||
      !!this.form.get('licPermitToPurchase');

    if (!hasSection) return;

    const catROC$ = this.form.get('catROC')?.valueChanges.pipe(startWith(this.form.get('catROC')?.value)) ?? of(false);
    const catMA$  = this.form.get('catMA') ?.valueChanges.pipe(startWith(this.form.get('catMA') ?.value)) ?? of(false);

    const txnNew$   = this.form.get('txnNew')?.valueChanges.pipe(startWith(this.form.get('txnNew')?.value)) ?? of(false);
    const txnRenew$ = this.form.get('txnRenew')?.valueChanges.pipe(startWith(this.form.get('txnRenew')?.value)) ?? of(false);
    const txnMod$   = this.form.get('txnModification')?.valueChanges.pipe(startWith(this.form.get('txnModification')?.value)) ?? of(false);

    const particulars$ = this.form.get('particulars')?.valueChanges.pipe(startWith(this.form.get('particulars')?.value)) ?? of('');
    const rslClass$ = this.form.get('rslClass')?.valueChanges.pipe(startWith(this.form.get('rslClass')?.value)) ?? of('A');

    const periodYears$ = this.form.get('periodYears')?.valueChanges.pipe(startWith(this.form.get('periodYears')?.value)) ?? of(null);
    const periodFrom$  = this.form.get('periodFrom')?.valueChanges.pipe(startWith(this.form.get('periodFrom')?.value)) ?? of(null);
    const periodTo$    = this.form.get('periodTo')?.valueChanges.pipe(startWith(this.form.get('periodTo')?.value)) ?? of(null);

    combineLatest([catROC$, catMA$, txnNew$, txnRenew$, txnMod$, particulars$, rslClass$, periodYears$, periodFrom$, periodTo$])
      .pipe(
        debounceTime(50),
        map(([catROC, catMA, txnNew, txnRenew, txnMod, particulars, rslClass, periodYears, pf, pt]) => {
          const raw = String(particulars ?? '');
          const P = raw.toUpperCase();

          const isShip =
            P.includes('SHIPSTATION') ||
            P.includes('SHIP STATION') ||
            P.includes('SSL_') ||
            P.includes('PCS_') ||
            P.includes('SSL-') ||
            P.includes('PCS-') ||
            P.includes('CERT_DEL') ||
            P.includes('CERT-DEL') ||
            P.includes('DELETION');

          const isROC = !isShip && (!!catROC || P.includes('ROC'));
          const isMA  = !isShip && (!!catMA  || P.includes('AMATEUR') || P.includes('AT-RSL') || P.includes(' MA '));

          const cls = (String(rslClass ?? 'A').trim().toUpperCase() || 'A');
          const years = this.resolveYears(periodYears, pf, pt);

          return {
            isShip, isROC, isMA,
            txn: { txnNew: !!txnNew, txnRenew: !!txnRenew, txnMod: !!txnMod },
            particulars: raw,
            cls,
            years,
            ship: this.parseShipStationFromParticulars(raw),
          };
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((ctx) => {
        if ((ctx.isShip || ctx.isROC || ctx.isMA) && !ctx.txn.txnNew && !ctx.txn.txnRenew && !ctx.txn.txnMod) {
          this.form.patchValue({ txnNew: true, txnRenew: false, txnModification: false }, { emitEvent: false });
          ctx.txn.txnNew = true;
        }

        if (!ctx.isShip && !ctx.isROC && !ctx.isMA) {
          this.patchROCMA(0,0,0,0,0,0,0,0);
          this.patchShipIntoLicenses(0,0,0,0,0,0,0,0,0,0);
          return;
        }

        const years = Math.max(1, ctx.years);

        // SHIP
        if (ctx.isShip) {
          const ship = computeShipStation(ctx.ship, years, ctx.txn, this.SHIP_STATION);

          this.patchShipIntoLicenses(
            ship.PUR, ship.FF, ship.POS, ship.CPF,
            ship.LFIF, ship.INS, ship.MOD, ship.SUR, ship.DST, ship.total
          );

          this.patchROCMA(0,0,0,0,0,0,0,ship.total);
          return;
        }

        this.patchShipIntoLicenses(0,0,0,0,0,0,0,0,0,0);

        // ROC + MA
        const roc = ctx.isROC
          ? computeROC(ctx.particulars, years, ctx.txn, this.ROC_OPERATOR, this.ROC_DEFAULT, this.ROC_MOD_FEE)
          : { rocRadioStationLicense: 0, rocSurcharges: 0, rocDST: 0 };

        // ✅ AMATEUR uses VALUES from FEES TS
        const ma = ctx.isMA
          ? computeAmateur(ctx.particulars, ctx.cls, years, ctx.txn, this.AMATEUR_RATES)
          : { maRadioStationLicense: 0, maFilingFee: 0, maSurcharges: 0, maDST: 0, total: 0, kind: 'NONE' };

        const amRadioStationLicense = roc.rocRadioStationLicense + ma.maRadioStationLicense;
        const amFilingFee = ma.maFilingFee;
        const amSurcharges = roc.rocSurcharges + ma.maSurcharges;
        const dst = roc.rocDST + ma.maDST;

        const totalAmount = this.round2(amRadioStationLicense + amFilingFee + amSurcharges + dst);

        this.patchROCMA(amRadioStationLicense, 0, 0, amFilingFee, 0, amSurcharges, dst, totalAmount);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private parseShipStationFromParticulars(raw: string): ShipParse {
    const P = String(raw ?? '').toUpperCase();
    const tokens = P.split('-').map(x => x.trim()).filter(Boolean);

    const hasEquip = P.includes('WITH_EQUIPMENT') || P.includes('WITH EQUIPMENT');
    const unitsTok = tokens.find(t => t.startsWith('UNITS_'));
    const units = Math.max(1, Math.floor(Number((unitsTok ?? '').replace('UNITS_', '')) || 1));
    const sur100 = P.includes('SUR100') || P.includes('100%');

    const subtype =
      P.includes('CERT_DEL') || P.includes('CERT-DEL') || P.includes('DELETION') ? 'CERT_DEL' :
      P.includes('SSL_EARTH') ? 'SSL_EARTH' :
      P.includes('SSL_INT') ? 'SSL_INT' :
      P.includes('SSL_DOM') ? 'SSL_DOM' :
      P.includes('PCS_RT') ? 'PCS_RT' :
      P.includes('PCS_RP') ? 'PCS_RP' : '';

    const level =
      P.includes('HIGH') ? 'HIGH' :
      (P.includes('MED') || P.includes('MEDIUM')) ? 'MED' :
      P.includes('LOW') ? 'LOW' :
      P.includes('VHF') ? 'VHF' :
      P.includes('HF') ? 'HF' : '';

    let rowKey = 'SSL-DOM-HIGH';

    if (subtype === 'CERT_DEL') rowKey = 'CERT-DEL';
    else if (subtype === 'SSL_EARTH') rowKey = 'SSL-INT-EARTH';
    else if (subtype === 'SSL_DOM') rowKey = `SSL-DOM-${level || 'HIGH'}`;
    else if (subtype === 'SSL_INT') rowKey = `SSL-INT-${level || 'HIGH'}`;
    else if (subtype === 'PCS_RT') rowKey = `PCS-RT-${level || 'HIGH'}`;
    else if (subtype === 'PCS_RP') rowKey = level === 'VHF' ? 'PCS-RP-VHF' : 'PCS-RP-HF';

    return { rowKey, withEquipment: hasEquip, units, sur100 };
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
  ): void {
    const p: any = {};
    if (this.form.get('amRadioStationLicense')) p.amRadioStationLicense = this.round2(amRadioStationLicense);
    if (this.form.get('amRadioOperatorsCert')) p.amRadioOperatorsCert = this.round2(amRadioOperatorsCert);
    if (this.form.get('amApplicationFee')) p.amApplicationFee = this.round2(amApplicationFee);
    if (this.form.get('amFilingFee')) p.amFilingFee = this.round2(amFilingFee);
    if (this.form.get('amSeminarFee')) p.amSeminarFee = this.round2(amSeminarFee);
    if (this.form.get('amSurcharges')) p.amSurcharges = this.round2(amSurcharges);
    if (this.form.get('dst')) p.dst = this.round2(dst);
    if (this.form.get('totalAmount')) p.totalAmount = this.round2(totalAmount);
    if (Object.keys(p).length) this.form.patchValue(p, { emitEvent: false });
  }

  private patchShipIntoLicenses(
    permitToPurchase: number,
    filingFee: number,
    permitToPossess: number,
    constructionPermitFee: number,
    radioStationLicense: number,
    inspectionFee: number,
    appModificationFee: number,
    licSurcharges: number,
    dst: number,
    totalAmount: number
  ): void {
    const p: any = {};
    if (this.form.get('licPermitToPurchase')) p.licPermitToPurchase = this.round2(permitToPurchase);
    if (this.form.get('licFilingFee')) p.licFilingFee = this.round2(filingFee);
    if (this.form.get('licPermitToPossess')) p.licPermitToPossess = this.round2(permitToPossess);
    if (this.form.get('licConstructionPermitFee')) p.licConstructionPermitFee = this.round2(constructionPermitFee);
    if (this.form.get('licRadioStationLicense')) p.licRadioStationLicense = this.round2(radioStationLicense);
    if (this.form.get('licInspectionFee')) p.licInspectionFee = this.round2(inspectionFee);
    if (this.form.get('appModificationFee')) p.appModificationFee = this.round2(appModificationFee);
    if (this.form.get('licSurcharges')) p.licSurcharges = this.round2(licSurcharges);
    if (this.form.get('dst')) p.dst = this.round2(dst);
    if (this.form.get('totalAmount')) p.totalAmount = this.round2(totalAmount);
    if (Object.keys(p).length) this.form.patchValue(p, { emitEvent: false });
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