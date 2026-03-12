import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subject, combineLatest, of } from 'rxjs';
import { debounceTime, startWith, takeUntil } from 'rxjs/operators';

import {
  computeShipStation,
  parseParticularsText,
  rowKeyFromParsed,
  buildShipParse,
  PickedTxn,
  ShipStationRow,
  SHIP_STATION,
} from './shipstation.compute';

import { computeCoastal, CoastalSurchargeMode } from './coastal.compute';
import { computeROC, TxnFlags as RocTxnFlags } from './roc.compute';
import { computeAmateur, TxnFlags as AmateurTxnFlags } from './amateur.compute';
import { computeVhfUhfWithTxn } from './vhfuhf.compute';
import { computeMobilePhone, TxnFlags as MobileTxnFlags } from './mobilephone.compute';
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
  private syncingParticulars = false;

  ngOnInit(): void {
    if (!this.form) return;
    this.wireTxnIntoParticulars();
    this.wireCompute();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private wireTxnIntoParticulars(): void {
    const particularsCtrl = this.ctrl('particulars');
    const txnNewCtrl = this.ctrl('txnNew');
    const txnRenewCtrl = this.ctrl('txnRenew');
    const txnModCtrl = this.ctrl('txnModification');

    if (!particularsCtrl) return;

    const particulars$ = particularsCtrl.valueChanges.pipe(startWith(particularsCtrl.value));
    const txnNew$ = txnNewCtrl ? txnNewCtrl.valueChanges.pipe(startWith(txnNewCtrl.value)) : of(false);
    const txnRenew$ = txnRenewCtrl ? txnRenewCtrl.valueChanges.pipe(startWith(txnRenewCtrl.value)) : of(false);
    const txnMod$ = txnModCtrl ? txnModCtrl.valueChanges.pipe(startWith(txnModCtrl.value)) : of(false);

    combineLatest([particulars$, txnNew$, txnRenew$, txnMod$])
      .pipe(debounceTime(10), takeUntil(this.destroy$))
      .subscribe(([p]) => {
        if (this.syncingParticulars) return;

        const original = String(p ?? '').trim();
        if (!original) return;

        const duplicate = /\bDUPLICATE\b/i.test(original);
        const cleaned = this.cleanParticularsTxnText(original);
        const tNew = !!txnNewCtrl?.value;
        const tRen = !!txnRenewCtrl?.value;
        const tMod = !!txnModCtrl?.value;

        const txnLabel =
          tMod ? 'MOD' :
          tRen ? 'RENEW' :
          tNew ? 'NEW' :
          /\bMOD(IFICATION)?\b/i.test(original) ? 'MOD' :
          /\bRENEW(AL)?\b/i.test(original) ? 'RENEW' :
          /\bNEW\b/i.test(original) ? 'NEW' :
          '';

        if (!txnLabel) return;

        const next = this.buildParticularsWithTxn(cleaned, txnLabel, duplicate);

        if (next !== original) {
          this.syncingParticulars = true;
          particularsCtrl.patchValue(next, { emitEvent: false });
          this.syncingParticulars = false;
        }
      });
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
      .subscribe(([pText, y, shipU, wEq, s100, _tNew, _tRen, _tMod, delayMonthsRaw, periodFromRaw]) => {
        const text = String(pText || '').trim();
        const up = text.toUpperCase();
        const tNew = !!txnNewCtrl?.value;
        const tRen = !!txnRenewCtrl?.value;
        const tMod = !!txnModCtrl?.value;

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

        if (delayMonthsCtrl && delayMonthsCtrl.value !== DELAY_MONTHS) {
          delayMonthsCtrl.patchValue(DELAY_MONTHS, { emitEvent: false });
        }

        // 1) ROC
        if (up.startsWith('ROC')) {
          this.clearAllComputedFields();

          const isDuplicate = up.includes('DUPLICATE');

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

          this.applyDuplicateOthersCharge(isDuplicate);

          this.patch(this.computeTotalAmount(), 'totalAmount');
          return;
        }

        // 2) AMATEUR
        if (up.startsWith('AMATEUR')) {
          this.clearAllComputedFields();

          const cls = this.extractAmateurClass(text);
          const isDuplicate = up.includes('DUPLICATE');

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

          this.applyDuplicateOthersCharge(isDuplicate);

          this.patch(this.computeTotalAmount(), 'totalAmount');
          return;
        }

        // 3) COASTAL
        if (up.includes('COASTAL STATION LICENSE') || up.includes('COASTAL')) {
          this.clearAllComputedFields();

          const hasDuplicate = /\bDUPLICATE\b/i.test(up);
          const baseText = this.cleanParticularsTxnText(text);

          const isPurchasePossess =
            up.includes('PURCHASE/POSSESS') ||
            (up.includes('PURCHASE') && up.includes('POSSESS'));

          const isSellTransfer =
            up.includes('SELL/TRANSFER') ||
            (up.includes('SELL') && up.includes('TRANSFER'));

          const defaultCoastalUnits = Math.max(1, Math.floor(this.num(shipU, 1)));
          const purchasePossessUnits = this.extractUnitsAfterKeyword(
            text,
            /PURCHASE\/POSSESS|PURCHASE AND POSSESS/,
            defaultCoastalUnits
          );
          const sellTransferUnits = this.extractUnitsAfterKeyword(
            text,
            /SELL\/TRANSFER/,
            defaultCoastalUnits
          );

          let coastalTxn: 'NEW' | 'RENEW' | 'MOD' = 'NEW';
          if (!!tMod) coastalTxn = 'MOD';
          else if (!!tRen) coastalTxn = 'RENEW';
          else coastalTxn = 'NEW';

          const surMode: CoastalSurchargeMode =
            coastalTxn === 'RENEW'
              ? (s100 ? 'SUR100' : 'SUR50')
              : 'NONE';

          const coastalUnits = isPurchasePossess
            ? purchasePossessUnits
            : isSellTransfer
            ? sellTransferUnits
            : defaultCoastalUnits;

          const res = computeCoastal(
            baseText,
            coastalTxn,
            YEARS,
            surMode,
            coastalUnits,
            coastalTxn === 'RENEW' ? DELAY_MONTHS : 0
          );

          if (!res || !res.row) {
            this.clearAllComputedFields();
            this.applyDuplicateOthersCharge(hasDuplicate);
            this.patch(this.computeTotalAmount(), 'totalAmount');
            return;
          }

          if (isPurchasePossess) {
            // A.1 Permit to Purchase/Possess
            // FF + Purchase + Possess + DST
            this.patch(res.purchase, 'licPermitToPurchase');
            this.patch(res.possess, 'licPermitToPossess');
            this.patch(res.ff, 'licFilingFee');

            this.patch(0, 'licConstructionPermitFee');
            this.patch(0, 'licRadioStationLicense');
            this.patch(0, 'licInspectionFee');
            this.patch(0, 'licSUF');
            this.patch(0, 'licFinesPenalties');
            this.patch(0, 'licSurcharges');
            this.patch(0, 'appModificationFee');
            this.patch(res.dst, 'dst');
          } else if (isSellTransfer) {
            // A.4 Permit to Sell/Transfer
            // STF + DST
            this.patch(res.purchase, 'licPermitToPurchase');
            this.patch(0, 'licPermitToPossess');
            this.patch(0, 'licFilingFee');

            this.patch(0, 'licConstructionPermitFee');
            this.patch(0, 'licRadioStationLicense');
            this.patch(0, 'licInspectionFee');
            this.patch(0, 'licSUF');
            this.patch(0, 'licFinesPenalties');
            this.patch(0, 'licSurcharges');
            this.patch(0, 'appModificationFee');
            this.patch(res.dst, 'dst');
          } else {
            if (coastalTxn === 'NEW') {
              // A.2 Public Coastal Station License (NEW)
              // CP + LF + IF + DST
              this.patch(0, 'licPermitToPurchase');
              this.patch(0, 'licPermitToPossess');
              this.patch(0, 'licFilingFee');

              this.patch(res.cp, 'licConstructionPermitFee');
              this.patch(res.lf, 'licRadioStationLicense');
              this.patch(res.ifee, 'licInspectionFee');

              this.patch(0, 'licSUF');
              this.patch(0, 'licFinesPenalties');
              this.patch(0, 'licSurcharges');
              this.patch(0, 'appModificationFee');
              this.patch(res.dst, 'dst');
            } else if (coastalTxn === 'RENEW') {
              // Public Coastal Station License (REN)
              // LF + IF + DST + SUR
              this.patch(0, 'licPermitToPurchase');
              this.patch(0, 'licPermitToPossess');
              this.patch(0, 'licFilingFee');
              this.patch(0, 'licConstructionPermitFee');

              this.patch(res.lf, 'licRadioStationLicense');
              this.patch(res.ifee, 'licInspectionFee');

              this.patch(0, 'licSUF');
              this.patch(0, 'licFinesPenalties');
              this.patch(res.surcharge, 'licSurcharges');
              this.patch(0, 'appModificationFee');
              this.patch(res.dst, 'dst');
            } else {
              // A.3 Public Coastal Station License (MOD)
              // FF + CP + MOD + DST
              this.patch(0, 'licPermitToPurchase');
              this.patch(0, 'licPermitToPossess');

              this.patch(res.ff, 'licFilingFee');
              this.patch(res.cp, 'licConstructionPermitFee');
              this.patch(0, 'licRadioStationLicense');
              this.patch(0, 'licInspectionFee');

              this.patch(0, 'licSUF');
              this.patch(0, 'licFinesPenalties');
              this.patch(0, 'licSurcharges');
              this.patch(res.mod, 'appModificationFee');
              this.patch(res.dst, 'dst');
            }
          }

          this.applyDuplicateOthersCharge(hasDuplicate);

          this.patch(this.computeTotalAmount(), 'totalAmount');
          return;
        }

        // 4) VHF/UHF
        {
          const isVhfPurchasePossess =
            up.includes('PURCHASE/POSSESS') ||
            (up.includes('PURCHASE') && up.includes('POSSESS'));

          const vhfTxn =
            txn === 'RENEW' ? 'RENEW' :
            txn === 'MOD' ? 'MOD' :
            'NEW';

          const vhfTxnUnitMarker =
            vhfTxn === 'MOD'
              ? /MODIFICATION|\bMOD\b/
              : vhfTxn === 'RENEW'
              ? /\bRENEW(AL)?\b/
              : /\bNEW\b/;

          const vhfTxnUnits = this.extractUnitsAfterKeyword(
            text,
            vhfTxnUnitMarker,
            SHIP_UNITS
          );

          const vhfUnits = isVhfPurchasePossess
            ? this.extractUnitsAfterKeyword(
                text,
                /PURCHASE\/POSSESS|PURCHASE AND POSSESS/,
                SHIP_UNITS
              )
            : vhfTxnUnits;

          const vhf = computeVhfUhfWithTxn(
            text,
            vhfTxn,
            YEARS,
            vhfUnits,
            1,
            txn === 'RENEW'
              ? (s100 ? 'SUR100' : 'SUR50')
              : 'NONE',
            vhfTxn === 'RENEW' ? DELAY_MONTHS : 0
          );

          if (vhf?.ok) {
            this.clearAllComputedFields();

            if (isVhfPurchasePossess) {
              // Purchase/Possess path: FF(unit) + PUR(unit) + POS(unit) + DST
              this.patch(vhf.purchase * vhf.unit, 'licPermitToPurchase');
              this.patch(vhf.possess * vhf.unit, 'licPermitToPossess');
              this.patch(vhf.filingFee * vhf.unit, 'licFilingFee');
              this.patch(0, 'licConstructionPermitFee');
              this.patch(0, 'licRadioStationLicense');
              this.patch(0, 'licInspectionFee');
              this.patch(0, 'licSUF');
              this.patch(0, 'licSurcharges');
              this.patch(0, 'appModificationFee');
              this.patch(vhf.dst, 'dst');
            } else if (vhfTxn === 'NEW') {
              this.patch(0, 'licPermitToPurchase');
              this.patch(0, 'licPermitToPossess');
              this.patch(0, 'licFilingFee');
              this.patch(vhf.constructionPermit * vhf.unit, 'licConstructionPermitFee');
              this.patch((vhf.licenseFee * vhf.chUnit) * vhf.years, 'licRadioStationLicense');
              this.patch((vhf.inspectionFee * vhf.unit) * vhf.years, 'licInspectionFee');
              this.patch((vhf.supervisionFee * vhf.chUnit) * vhf.years, 'licSUF');
              this.patch(0, 'licSurcharges');
              this.patch(0, 'appModificationFee');
              this.patch(vhf.dst, 'dst');
            } else if (vhfTxn === 'RENEW') {
              this.patch(0, 'licPermitToPurchase');
              this.patch(0, 'licPermitToPossess');
              this.patch(0, 'licFilingFee');
              this.patch(0, 'licConstructionPermitFee');
              this.patch((vhf.licenseFee * vhf.chUnit) * vhf.years, 'licRadioStationLicense');
              this.patch((vhf.inspectionFee * vhf.unit) * vhf.years, 'licInspectionFee');
              this.patch((vhf.supervisionFee * vhf.chUnit) * vhf.years, 'licSUF');
              this.patch(vhf.surchargeApplied, 'licSurcharges');
              this.patch(0, 'appModificationFee');
              this.patch(vhf.dst, 'dst');
            } else {
              this.patch(0, 'licPermitToPurchase');
              this.patch(0, 'licPermitToPossess');
              this.patch(vhf.filingFee * vhf.unit, 'licFilingFee');
              this.patch(vhf.constructionPermit * vhf.unit, 'licConstructionPermitFee');
              this.patch(0, 'licRadioStationLicense');
              this.patch(0, 'licInspectionFee');
              this.patch(0, 'licSUF');
              this.patch(0, 'licSurcharges');
              this.patch(vhf.modificationFee * vhf.unit, 'appModificationFee');
              this.patch(vhf.dst, 'dst');
            }

            this.applyDuplicateOthersCharge(up.includes('DUPLICATE'));

            this.patch(this.computeTotalAmount(), 'totalAmount');
            return;
          }
        }

        // 5) MOBILE PHONE
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

            this.applyDuplicateOthersCharge(up.includes('DUPLICATE'));

            this.patch(this.computeTotalAmount(), 'totalAmount');
            return;
          }
        }

        // 6) TVRO / CATV
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

            this.applyDuplicateOthersCharge(up.includes('DUPLICATE'));

            this.patch(this.computeTotalAmount(), 'totalAmount');
            return;
          }
        }

        // 7) SHIP
        const parsedShip = parsedShipTop;
        if (parsedShip && !up.includes('COASTAL')) {
          this.clearAllComputedFields();

          const rowKey = rowKeyFromParsed(parsedShip);

          const txns = parsedShip.txns?.length ? [...parsedShip.txns] : txn ? [txn] : [];

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

          this.applyDuplicateOthersCharge(up.includes('DUPLICATE'));

          this.patch(this.computeTotalAmount(), 'totalAmount');
          return;
        }

        this.clearAllComputedFields();

        this.applyDuplicateOthersCharge(up.includes('DUPLICATE'));

        this.patch(this.computeTotalAmount(), 'totalAmount');
      });
  }

  private cleanParticularsTxnText(text: string): string {
    return String(text ?? '')
      .replace(/\bNEW\b/gi, '')
      .replace(/\bRENEW\b/gi, '')
      .replace(/\bMOD\b/gi, '')
      .replace(/\bDUPLICATE\b/gi, '')
      .replace(/\s+-\s+-/g, ' - ')
      .replace(/\s{2,}/g, ' ')
      .replace(/-\s*$/g, '')
      .trim();
  }

  private buildParticularsWithTxn(baseText: string, txnLabel: string, duplicate: boolean): string {
    let result = baseText.trim();

    if (!result.toUpperCase().includes(txnLabel)) {
      result = `${result} - ${txnLabel}`;
    }

    if (duplicate && !result.toUpperCase().includes('DUPLICATE')) {
      result = `${result} - DUPLICATE`;
    }

    return result.replace(/\s+-\s+-/g, ' - ').trim();
  }

  private ctrl(name: string): AbstractControl | null {
    return this.form?.get(name) ?? null;
  }

  private patch(val: number, name: string): void {
    const c = this.form?.get(name);
    if (!c) return;
    c.patchValue(this.round2(val), { emitEvent: false });
  }

  private addToField(name: string, amount: number): void {
    const current = this.num(this.form?.get(name)?.value, 0);
    this.patch(current + amount, name);
  }

  private applyDuplicateOthersCharge(selected: boolean): void {
    if (!selected) return;
    this.addToField('appOthers', 120);
  }

  private extractUnitsAfterKeyword(text: string, marker: RegExp, fallback = 1): number {
    const up = String(text ?? '').toUpperCase();
    const match = marker.exec(up);
    if (!match) return Math.max(1, Math.floor(this.num(fallback, 1)));

    const tail = up.slice(match.index);
    const unitsMatch =
      /UNITS?_([0-9]+)/.exec(tail) ||
      /UNITS?\s*[:=]?\s*([0-9]+)/.exec(tail) ||
      /UNIT\s+([0-9]+)/.exec(tail);

    if (!unitsMatch?.[1]) return Math.max(1, Math.floor(this.num(fallback, 1)));
    return Math.max(1, Math.floor(this.num(unitsMatch[1], fallback)));
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

    if (raw instanceof Date && !isNaN(raw.getTime())) {
      return new Date(raw.getFullYear(), raw.getMonth(), raw.getDate());
    }

    if (typeof raw === 'string') {
      const value = raw.trim();

      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [yyyy, mm, dd] = value.split('-').map(Number);
        const d = new Date(yyyy, mm - 1, dd);
        return isNaN(d.getTime()) ? null : d;
      }

      if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
        const [a, b, c] = value.split('/').map(Number);
        const d1 = new Date(c, a - 1, b);
        if (!isNaN(d1.getTime())) return d1;
        const d2 = new Date(c, b - 1, a);
        return isNaN(d2.getTime()) ? null : d2;
      }

      if (/^\d{2}-\d{2}-\d{4}$/.test(value)) {
        const [mm, dd, yyyy] = value.split('-').map(Number);
        const d = new Date(yyyy, mm - 1, dd);
        return isNaN(d.getTime()) ? null : d;
      }

      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) {
        return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
      }
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
    if (up.includes('RENEW')) return 'RENEW';
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
