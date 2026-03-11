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
  buildShipParse,
  PickedTxn,
  ShipStationRow,
  SHIP_STATION,
} from './shipstation.compute';

// COASTAL
import { computeCoastal, CoastalSurchargeMode } from './coastal.compute';

// ROC
import { computeROC, TxnFlags as RocTxnFlags } from './roc.compute';

// AMATEUR
import { computeAmateur, TxnFlags as AmateurTxnFlags } from './amateur.compute';

// VHF/UHF
import { computeVhfUhf } from './vhfuhf.compute';

// MOBILE PHONE PERMITS
import { computeMobilePhone, TxnFlags as MobileTxnFlags } from './mobilephone.compute';

// TVRO/CATV
import { computeTvroCatv } from './tvrocatv.compute';

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

  ngOnInit(): void {
    if (!this.form) return;
    this.wireCompute();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private wireCompute(): void {
    const particulars = this.ctrl('particulars');
    const yearsCtrl = this.ctrl('periodYears');

    const shipUnitsCtrl = this.ctrl('shipUnits');
    const withEquipCtrl = this.ctrl('withEquipment');
    const sur100Ctrl = this.ctrl('sur100');

    const txnNewCtrl = this.ctrl('txnNew');
    const txnRenewCtrl = this.ctrl('txnRenew');
    const txnModCtrl = this.ctrl('txnModification');

    const delayMonthsCtrl = this.ctrl('delayMonths');
    const periodFromCtrl = this.ctrl('periodFrom');

    if (!particulars || !yearsCtrl) return;

    const particulars$ = particulars.valueChanges.pipe(startWith(particulars.value));
    const years$ = yearsCtrl.valueChanges.pipe(startWith(yearsCtrl.value));

    const shipUnits$ = shipUnitsCtrl
      ? shipUnitsCtrl.valueChanges.pipe(startWith(shipUnitsCtrl.value))
      : of(1);

    const withEquip$ = withEquipCtrl
      ? withEquipCtrl.valueChanges.pipe(startWith(withEquipCtrl.value))
      : of(false);

    const sur100$ = sur100Ctrl
      ? sur100Ctrl.valueChanges.pipe(startWith(sur100Ctrl.value))
      : of(false);

    const txnNew$ = txnNewCtrl
      ? txnNewCtrl.valueChanges.pipe(startWith(txnNewCtrl.value))
      : of(false);

    const txnRenew$ = txnRenewCtrl
      ? txnRenewCtrl.valueChanges.pipe(startWith(txnRenewCtrl.value))
      : of(false);

    const txnMod$ = txnModCtrl
      ? txnModCtrl.valueChanges.pipe(startWith(txnModCtrl.value))
      : of(false);

    const delayMonths$ = delayMonthsCtrl
      ? delayMonthsCtrl.valueChanges.pipe(startWith(delayMonthsCtrl.value))
      : of(0);
    const periodFrom$ = periodFromCtrl
      ? periodFromCtrl.valueChanges.pipe(startWith(periodFromCtrl.value))
      : of(null);

    combineLatest([
      particulars$,
      years$,
      shipUnits$,
      withEquip$,
      sur100$,
      txnNew$,
      txnRenew$,
      txnMod$,
      delayMonths$,
      periodFrom$,
    ])
      .pipe(debounceTime(30), takeUntil(this.destroy$))
      .subscribe(([pText, y, shipU, wEq, s100, tNew, tRen, tMod, delayMonthsRaw, periodFromRaw]) => {
        const text = String(pText || '').trim();
        const up = text.toUpperCase();

        if (!text) {
          this.clearAllComputedFields();
          this.patch(0, 'totalAmount');
          return;
        }

        const YEARS = Math.max(1, Math.floor(this.num(y, 1)));
        const SHIP_UNITS = Math.max(1, Math.floor(this.num(shipU, 1)));
        const txnFromChecks = this.txnFromChecks(!!tNew, !!tRen, !!tMod);
        const txnForText = this.txnFromText(text);
        const txn = txnFromChecks ?? txnForText;

        const parsedShipTop = parseParticularsText(text);
        const hasRenewTxn =
          !!tRen ||
          txn === 'RENEW' ||
          parsedShipTop?.txns?.includes('RENEW') ||
          up.includes('RENEW');

        const delayFromExpiry = this.computeDelayMonthsFromNow(periodFromRaw);
        const delayFromCtrl = Math.max(0, Math.floor(this.num(delayMonthsRaw, 0)));
        const DELAY_MONTHS = hasRenewTxn ? delayFromExpiry : delayFromCtrl;

        // keep delayMonths control synced for visibility/debug
        if (delayMonthsCtrl && delayMonthsCtrl.value !== DELAY_MONTHS) {
          delayMonthsCtrl.patchValue(DELAY_MONTHS, { emitEvent: false });
        }


        // =====================================================
        // 1) ROC
        // =====================================================
        if (up.startsWith('ROC')) {
          this.clearAllComputedFields();

          const isDuplicate = txn === 'DUPLICATE' || up.includes('DUPLICATE');

          const rocFlags: RocTxnFlags = {
            txnNew: !!tNew || (up.includes('NEW') && !up.includes('RENEW')),
            txnRenew: !!tRen || up.includes('RENEW') || up.includes('REN'),
            txnMod: !!tMod || up.includes('MOD'),
          };

          const res = computeROC(text, YEARS, rocFlags, DELAY_MONTHS);

          this.patch(0, 'amRadioStationLicense');
          this.patch(res.rocRadioOperatorsCert, 'amRadioOperatorsCert');
          this.patch(res.rocAF, 'amApplicationFee');
          this.patch(res.rocFF, 'amFilingFee');
          this.patch(res.rocSemFee, 'amSeminarFee');
          this.patch(res.rocSurcharges, 'amSurcharges');
          this.patch(res.rocModificationFee, 'appModificationFee');
          this.patch(res.rocDST, 'dst');

          if (isDuplicate) {
            const currentOthers = this.num(this.form.get('appOthers')?.value, 0);
            this.patch(currentOthers + 120, 'appOthers');
          }

          this.patch(this.computeTotalAmount(), 'totalAmount');
          return;
        }

        // =====================================================
        // 2) AMATEUR
        // =====================================================
        if (up.startsWith('AMATEUR')) {
          this.clearAllComputedFields();

          const cls = this.extractAmateurClass(text);
          const isDuplicate = txn === 'DUPLICATE' || up.includes('DUPLICATE');

          const flags: AmateurTxnFlags = {
            txnNew: !!tNew || (up.includes('NEW') && !up.includes('RENEW')),
            txnRenew: !!tRen || up.includes('RENEW') || up.includes('REN'),
            txnMod: !!tMod || up.includes('MOD'),
          };

          const res = computeAmateur(text, cls, YEARS, flags, DELAY_MONTHS);

          this.patch(res.maPermitPurchase, 'licPermitToPurchase');
          this.patch(res.maPermitPossess, 'licPermitToPossess');
          this.patch(res.maStf, 'appOthers');
          this.patch(res.maRadioStationLicense, 'amRadioStationLicense');
          this.patch(res.maRadioOperatorsCert, 'amRadioOperatorsCert');
          this.patch(res.maApplicationFee, 'amApplicationFee');
          this.patch(res.maFilingFee, 'amFilingFee');
          this.patch(0, 'amSeminarFee');
          this.patch(res.maSurcharges, 'amSurcharges');
          this.patch(res.maConstructionPermitFee, 'licConstructionPermitFee');
          this.patch(res.maModificationFee, 'appModificationFee');
          this.patch(res.maDST, 'dst');

          if (isDuplicate) {
            const currentOthers = this.num(this.form.get('appOthers')?.value, 0);
            this.patch(currentOthers + 120, 'appOthers');
          }

          this.patch(this.computeTotalAmount(), 'totalAmount');
          return;
        }

        // =====================================================
        // 3) VHF/UHF
        // =====================================================
        const vhf = computeVhfUhf(text);
        if (vhf) {
          this.clearAllComputedFields();

          this.patch(vhf.purchase, 'licPermitToPurchase');
          this.patch(vhf.possess, 'licPermitToPossess');
          this.patch(vhf.filingFee, 'licFilingFee');
          this.patch(vhf.constructionPermit, 'licConstructionPermitFee');
          this.patch(vhf.licenseFee, 'licRadioStationLicense');
          this.patch(vhf.inspectionFee, 'licInspectionFee');
          this.patch(vhf.supervisionFee, 'licSUF');
          this.patch(vhf.registrationFee, 'appRegistrationFee');
          this.patch(vhf.modificationFee, 'appModificationFee');

          const surcharge = txn === 'RENEW'
            ? (s100 ? vhf.surLf100 : vhf.surLf50)
            : 0;

          this.patch(surcharge, 'licSurcharges');
          this.patch(vhf.dst, 'dst');

          this.patch(this.computeTotalAmount(), 'totalAmount');
          return;
        }

        // =====================================================
        // 4) COASTAL (handled separately only if not already parsed by ship parser)
        // =====================================================
        if (up.includes('COASTAL') && !parsedShipTop) {
          this.clearAllComputedFields();

          const isRenew = !!tRen || up.includes('RENEW') || up.includes('REN');
          const isNew = !!tNew || (up.includes('NEW') && !isRenew);
          const hasMod = !!tMod || up.includes('MOD');

          const baseTxn: any =
            isRenew ? 'RENEW' :
            isNew ? 'NEW' :
            hasMod ? 'MOD' :
            'NEW';

          const surMode: CoastalSurchargeMode =
            baseTxn === 'RENEW'
              ? (s100 ? 'SUR100' : 'SUR50')
              : 'NONE';

          const res = computeCoastal(text, baseTxn as any, YEARS, surMode);

          const purchaseUnits = this.num((text.match(/PURCHASE\/POSSESS[^0-9]*UNITS[_-]?(\d+)/i)?.[1]) ?? 1, 1);
          const sellUnits = this.num((text.match(/SELL\/TRANSFER[^0-9]*UNITS[_-]?(\d+)/i)?.[1]) ?? 1, 1);
          const hasPurchase = /PURCHASE\/POSSESS/i.test(up);
          const hasSell = /SELL\/TRANSFER/i.test(up);
          const hasDuplicate = /\bDUPLICATE\b/i.test(up);

          const purchaseVal = hasPurchase ? res.purchase * purchaseUnits : res.purchase;
          const possessVal = hasPurchase ? res.possess * purchaseUnits : res.possess;
          const sellVal = hasSell ? res.purchase * sellUnits : 0; // reuse purchase rate for sell/transfer

          if (baseTxn === 'MOD') {
            // MOD only formula: FF + CP + MOD + DST
            this.patch(res.ff, 'licFilingFee');
            this.patch(res.cp, 'licConstructionPermitFee');
            this.patch(res.mod, 'appModificationFee');
            this.patch(res.dst, 'dst');
          } else {
            // NEW / RENEW base
            this.patch(purchaseVal + sellVal, 'licPermitToPurchase');
            this.patch(possessVal, 'licPermitToPossess');
            this.patch(res.ff, 'licFilingFee');
            this.patch(res.cp, 'licConstructionPermitFee');
            this.patch(res.lf, 'licRadioStationLicense');
            this.patch(res.ifee, 'licInspectionFee');
            this.patch(res.surcharge, 'licSurcharges');
            this.patch(res.dst, 'dst');

            // MOD add-on on top of NEW/RENEW when selected
            if (hasMod) {
              const add = (name: string, val: number) => {
                const curr = this.num(this.form.get(name)?.value, 0);
                this.patch(curr + val, name);
              };
              add('licFilingFee', res.ff);
              add('licConstructionPermitFee', res.cp);
              add('appModificationFee', res.mod);
              add('dst', res.dst);
            }
          }

          if (hasDuplicate) {
            const currOthers = this.num(this.form.get('appOthers')?.value, 0);
            this.patch(currOthers + 120, 'appOthers');
          }

          this.patch(this.computeTotalAmount(), 'totalAmount');
          return;
        }

        // =====================================================
        // 5) MOBILE PHONE
        // =====================================================
        if (up.includes('MOBILE PHONE') || up.includes('MOBILEPHONE')) {
          this.clearAllComputedFields();

          const flags: MobileTxnFlags = {
            isNew: txn === 'NEW',
            isRenew: txn === 'RENEW',
            isMod: txn === 'MOD',
          };

          const mp = computeMobilePhone(text, YEARS, flags);

          if (mp?.ok) {
            this.patch(mp.ff, 'licFilingFee');
            this.patch(mp.pf, 'licRadioStationLicense');
            this.patch(mp.ifee, 'licInspectionFee');
            this.patch(mp.mod, 'appModificationFee');
            this.patch(mp.dst, 'dst');
            this.patch(mp.sur, 'licSurcharges');

            this.patch(this.computeTotalAmount(), 'totalAmount');
            return;
          }
        }

        // =====================================================
        // 6) TVRO / CATV
        // =====================================================
        if (up.includes('TVRO/CATV') || up.includes('TVRO') || up.includes('CATV')) {
          this.clearAllComputedFields();

          const tv = computeTvroCatv(text, YEARS, txn as any, !!s100);

          if (tv?.ok) {
            this.patch(tv.ff, 'licFilingFee');
            this.patch(tv.cpf, 'licConstructionPermitFee');
            this.patch(tv.lf, 'licRadioStationLicense');
            this.patch(tv.ifee, 'licInspectionFee');
            this.patch(tv.sur, 'licSurcharges');
            this.patch(tv.dst, 'dst');
            this.patch(tv.mod, 'appModificationFee');

            this.patch(this.computeTotalAmount(), 'totalAmount');
            return;
          }
        }

        // =====================================================
        // 7) SHIP
        // =====================================================
        const parsedShip = parsedShipTop;
        if (parsedShip) {
          this.clearAllComputedFields();

          const rowKey = rowKeyFromParsed(parsedShip);

          const txns = parsedShip.txns?.length
            ? [...parsedShip.txns]
            : txn
            ? [txn]
            : [];
          if (hasRenewTxn && !txns.includes('RENEW')) txns.push('RENEW');

          const isDeletion = parsedShip.kind === 'DEL';

          if (!txns.length && !isDeletion) {
            this.clearAllComputedFields();
            this.patch(0, 'totalAmount');
            return;
          }

          const ship = buildShipParse(
            rowKey,
            !!wEq,
            SHIP_UNITS,
            !!s100,
            parsedShip.purchaseUnits,
            parsedShip.sellTransferUnits,
            parsedShip.possessStorageUnits
          );

          const res = computeShipStation(
            ship,
            YEARS,
            txns,
            SHIP_STATION as Record<string, ShipStationRow>,
            DELAY_MONTHS
          );

          this.patch(res.Purchase, 'licPermitToPurchase');
          this.patch(res.FF, 'licFilingFee');
          this.patch(res.Possess, 'licPermitToPossess');
          this.patch(res.CPF, 'licConstructionPermitFee');

          // ✅ FIXED: separate LF and IF
          this.patch(res.LF, 'licRadioStationLicense');
          this.patch(res.IF, 'licInspectionFee');

          this.patch(0, 'licSUF');
          this.patch(0, 'licFinesPenalties');
          this.patch(res.SUR, 'licSurcharges');
          this.patch(0, 'appRegistrationFee');
          this.patch(0, 'appSupervisionRegulationFee');
          this.patch(0, 'appVerificationAuthFee');
          this.patch(0, 'appExaminationFee');
          this.patch(res.CERT, 'appClearanceCertificationFee');
          this.patch(res.MOD, 'appModificationFee');
          this.patch(0, 'appMiscIncome');
          this.patch(res.OTH, 'appOthers');
          this.patch(res.DST, 'dst');

          this.patch(this.computeTotalAmount(), 'totalAmount');
          return;
        }

        this.clearAllComputedFields();
        this.patch(0, 'totalAmount');
      });
  }

  private ctrl(name: string): AbstractControl | null {
    return this.form?.get(name) ?? null;
  }

  private patch(val: number, name: string): void {
    const c = this.form?.get(name);
    if (!c) return;
    c.patchValue(this.round2(val), { emitEvent: false });
  }

  private computeDelayMonthsFromNow(expiryRaw: any): number {
    const expiry = this.parseDate(expiryRaw);
    if (!expiry) return 0;

    const today = new Date();
    const cleanToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    if (cleanToday <= expiry) return 0;

    let months =
      (cleanToday.getFullYear() - expiry.getFullYear()) * 12 +
      (cleanToday.getMonth() - expiry.getMonth());

    if (cleanToday.getDate() >= expiry.getDate()) {
      months += 1;
    }

    return Math.max(0, months);
  }

  private parseDate(raw: any): Date | null {
    if (!raw) return null;
    if (raw instanceof Date && !isNaN(raw.getTime())) return raw;

    if (typeof raw === 'string') {
      // support dd/mm/yyyy, mm/dd/yyyy, and yyyy-mm-dd
      const iso = raw.match(/^\d{4}-\d{2}-\d{2}$/)
        ? raw
        : raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
        ? `${RegExp.$3}-${RegExp.$2}-${RegExp.$1}`
        : raw.match(/^(\d{2})-(\d{2})-(\d{4})$/)
        ? `${RegExp.$3}-${RegExp.$1}-${RegExp.$2}`
        : raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
        ? `${RegExp.$3}-${RegExp.$1}-${RegExp.$2}`
        : null;
      if (iso) {
        const d = new Date(iso);
        return isNaN(d.getTime()) ? null : d;
      }

      // final fallback: let Date parse it
      const parsed = new Date(raw);
      if (!isNaN(parsed.getTime())) return parsed;
    }

    return null;
  }

  private num(v: any, fallback = 0): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  private round2(n: number): number {
    const x = this.num(n, 0);
    return Math.round((x + Number.EPSILON) * 100) / 100;
  }

  private txnFromChecks(tNew: boolean, tRen: boolean, tMod: boolean): PickedTxn | null {
    if (tMod) return 'MOD';
    if (tRen) return 'RENEW';
    if (tNew) return 'NEW';
    return null;
  }

  private txnFromText(text: string): PickedTxn {
    const up = text.toUpperCase();

    if (up.includes('PURCHASE') && up.includes('POSSESS')) return 'PURCHASE_POSSESS';
    if (up.includes('RENEW') || up.includes('REN')) return 'RENEW';
    if (up.includes('MOD')) return 'MOD';
    if (up.includes('DUPLICATE')) return 'DUPLICATE';
    return 'NEW';
  }

  private extractAmateurClass(text: string): string {
    const up = text.toUpperCase();

    if (up.includes('CLASS B') || up.includes('AT-RSL B') || up.includes('RSL B')) return 'B';
    if (up.includes('CLASS C') || up.includes('AT-RSL C') || up.includes('RSL C')) return 'C';
    if (up.includes('CLASS D') || up.includes('AT-RSL D') || up.includes('RSL D')) return 'D';

    return 'A';
  }

  private clearShipFields(): void {
    this.patch(0, 'licPermitToPurchase');
    this.patch(0, 'licFilingFee');
    this.patch(0, 'licPermitToPossess');
    this.patch(0, 'licConstructionPermitFee');
    this.patch(0, 'licRadioStationLicense');
    this.patch(0, 'licInspectionFee');
    this.patch(0, 'licSUF');
    this.patch(0, 'licFinesPenalties');
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

  private clearAppFields(): void {
    this.patch(0, 'appRegistrationFee');
    this.patch(0, 'appSupervisionRegulationFee');
    this.patch(0, 'appVerificationAuthFee');
    this.patch(0, 'appExaminationFee');
    this.patch(0, 'appClearanceCertificationFee');
    this.patch(0, 'appModificationFee');
    this.patch(0, 'appMiscIncome');
    this.patch(0, 'appOthers');
  }

  private clearPermitFields(): void {
    this.patch(0, 'perPermitFees');
    this.patch(0, 'perInspectionFee');
    this.patch(0, 'perFilingFee');
    this.patch(0, 'perSurcharges');
  }

  private clearCommonFields(): void {
    this.patch(0, 'dst');
    this.patch(0, 'totalAmount');
  }

  private clearAllComputedFields(): void {
    this.clearShipFields();
    this.clearAmateurFields();
    this.clearAppFields();
    this.clearPermitFields();
    this.clearCommonFields();
  }

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
