
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
    imports: [ReactiveFormsModule],
    templateUrl: './soa-fees.component.html',
    styleUrls: ['./soa-fees.component.css']
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

        const entries = this.splitParticularsEntries(original);
        if (entries.length !== 1) return;

        const currentEntry = entries[0];

        const duplicate = /\bDUPLICATE\b/i.test(currentEntry);
        const cleaned = this.cleanParticularsTxnText(currentEntry);
        const tNew = !!txnNewCtrl?.value;
        const tRen = !!txnRenewCtrl?.value;
        const tMod = !!txnModCtrl?.value;

        const hasCheckedTxn = tNew || tRen || tMod;
        const hasNew =
          hasCheckedTxn ? tNew : /\bNEW\b/i.test(currentEntry) && !/\bRENEW(AL)?\b/i.test(currentEntry);
        const hasRenew = hasCheckedTxn ? tRen : /\bRENEW(AL)?\b/i.test(currentEntry);
        const hasMod = hasCheckedTxn ? tMod : /\bMOD(IFICATION)?\b/i.test(currentEntry);
        const txnLabels = [
          ...(hasNew ? ['NEW'] : []),
          ...(hasRenew ? ['RENEW'] : []),
          ...(hasMod ? ['MOD'] : []),
        ];

        if (!txnLabels.length) return;

        const next = this.buildParticularsWithTxn(cleaned, txnLabels, duplicate);

        if (next !== currentEntry) {
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
        const tNew = !!txnNewCtrl?.value;
        const tRen = !!txnRenewCtrl?.value;
        const tMod = !!txnModCtrl?.value;

        if (!text) {
          this.clearAllComputedFields();
          this.patch(0, 'totalAmount');
          return;
        }

        const YEARS_RAW = Math.max(0, this.num(y, 0));
        const YEARS = Math.max(1, Math.floor(YEARS_RAW || 1));
        const SHIP_UNITS = Math.max(1, Math.floor(this.num(shipU, 1)));
        const delayFromCtrl = Math.max(0, Math.floor(this.num(delayMonthsRaw, 0)));
        this.clearAllComputedFields();
        const entries = this.splitParticularsEntries(text);
        const useTxnChecks = entries.length === 1;
        const delayFromExpiry = this.computeDelayMonthsFromNow(periodFromRaw);

        if (delayMonthsCtrl) {
          const nextDelayMonths =
            entries.some((entry) => /\bRENEW(AL)?\b/i.test(entry)) ? delayFromExpiry : delayFromCtrl;
          if (delayMonthsCtrl.value !== nextDelayMonths) {
            delayMonthsCtrl.patchValue(nextDelayMonths, { emitEvent: false });
          }
        }

        for (const entryText of entries) {
          this.computeEntry(entryText, {
            YEARS,
            YEARS_RAW,
            SHIP_UNITS,
            delayFromCtrl,
            delayFromExpiry,
            useTxnChecks,
            tNew,
            tRen,
            tMod,
            wEq: !!wEq,
            s100: !!s100,
          });
        }

        this.patch(this.computeTotalAmount(), 'totalAmount');
      });
  }

  private computeEntry(
    entryText: string,
    options: {
      YEARS: number;
      YEARS_RAW: number;
      SHIP_UNITS: number;
      delayFromCtrl: number;
      delayFromExpiry: number;
      useTxnChecks: boolean;
      tNew: boolean;
      tRen: boolean;
      tMod: boolean;
      wEq: boolean;
      s100: boolean;
    }
  ): void {
    const text = String(entryText ?? '').trim();
    if (!text) return;

    const up = text.toUpperCase();
    const txnFromChecks = options.useTxnChecks
      ? this.txnFromChecks(options.tNew, options.tRen, options.tMod)
      : null;
    const txnForText = this.txnFromText(text);
    const txn = txnFromChecks ?? txnForText;
    const parsedShipTop = parseParticularsText(text);

    const hasRenewTxn =
      (options.useTxnChecks && options.tRen) ||
      txn === 'RENEW' ||
      parsedShipTop?.txns?.includes('RENEW') ||
      up.includes('RENEW');

    const DELAY_MONTHS = hasRenewTxn ? options.delayFromExpiry : options.delayFromCtrl;
    const hasDuplicate = /\bDUPLICATE\b/.test(up);
    const hasBaseTxnOrAction =
      (options.useTxnChecks && (options.tNew || options.tRen || options.tMod)) ||
      /\bNEW\b/.test(up) ||
      /\bRENEW(AL)?\b/.test(up) ||
      /\bMOD(IFICATION)?\b/.test(up) ||
      up.includes('PURCHASE/POSSESS') ||
      (up.includes('PURCHASE') && up.includes('POSSESS')) ||
      up.includes('SELL/TRANSFER') ||
      up.includes('POSSESS (STORAGE)') ||
      up.includes('PERMIT TO PURCHASE') ||
      up.includes('PERMIT TO SELL') ||
      up.includes('PERMIT TO POSSESS') ||
      up.includes('DELETION CERTIFICATE') ||
      up.includes('SPECIAL EVENT') ||
      up.includes('VANITY');

    if (hasDuplicate && !hasBaseTxnOrAction) {
      this.applyDuplicateOthersCharge(true);
      return;
    }

    if (up.startsWith('ROC')) {
      const rocFlags: RocTxnFlags = {
        txnNew: (options.useTxnChecks && options.tNew) || (up.includes('NEW') && !up.includes('RENEW')),
        txnRenew: (options.useTxnChecks && options.tRen) || up.includes('RENEW') || up.includes('REN'),
        txnMod: (options.useTxnChecks && options.tMod) || up.includes('MOD'),
      };

      const res = computeROC(text, options.YEARS, rocFlags, DELAY_MONTHS);

      this.addToField('amRadioOperatorsCert', res.rocRadioOperatorsCert);
      this.addToField('amApplicationFee', res.rocAF);
      this.addToField('amFilingFee', res.rocFF);
      this.addToField('amSeminarFee', res.rocSemFee);
      this.addToField('amSurcharges', res.rocSurcharges);
      this.addToField('appModificationFee', res.rocModificationFee);
      this.addToField('dst', res.rocDST);
      this.applyDuplicateOthersCharge(hasDuplicate);
      return;
    }

    if (up.startsWith('AMATEUR')) {
      const cls = this.extractAmateurClass(text);

      const flags: AmateurTxnFlags = {
        txnNew: (options.useTxnChecks && options.tNew) || (up.includes('NEW') && !up.includes('RENEW')),
        txnRenew: (options.useTxnChecks && options.tRen) || up.includes('RENEW') || up.includes('REN'),
        txnMod: (options.useTxnChecks && options.tMod) || up.includes('MOD'),
      };

      const res = computeAmateur(text, cls, options.YEARS, flags, DELAY_MONTHS);

      this.addToField('licPermitToPurchase', res.maPermitPurchase);
      this.addToField('licPermitToPossess', res.maPermitPossess);
      this.addToField('appOthers', res.maStf);
      this.addToField('amRadioStationLicense', res.maRadioStationLicense);
      this.addToField('amRadioOperatorsCert', res.maRadioOperatorsCert);
      this.addToField('amApplicationFee', res.maApplicationFee);
      this.addToField('amFilingFee', res.maFilingFee);
      this.addToField('amSurcharges', res.maSurcharges);
      this.addToField('licConstructionPermitFee', res.maConstructionPermitFee);
      this.addToField('appModificationFee', res.maModificationFee);
      this.addToField('dst', res.maDST);
      this.applyDuplicateOthersCharge(hasDuplicate);
      return;
    }

    if (up.includes('COASTAL STATION LICENSE') || up.includes('COASTAL')) {
      const baseText = this.cleanParticularsTxnText(text);

      const isPurchasePossess =
        up.includes('PURCHASE/POSSESS') ||
        (up.includes('PURCHASE') && up.includes('POSSESS'));

      const isSellTransfer =
        up.includes('SELL/TRANSFER') ||
        (up.includes('SELL') && up.includes('TRANSFER'));

      const defaultCoastalUnits = Math.max(1, Math.floor(this.num(options.SHIP_UNITS, 1)));
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
      if ((options.useTxnChecks && options.tMod) || /\bMOD(IFICATION)?\b/.test(up)) coastalTxn = 'MOD';
      else if ((options.useTxnChecks && options.tRen) || /\bRENEW(AL)?\b/.test(up)) coastalTxn = 'RENEW';

      const surMode: CoastalSurchargeMode =
        coastalTxn === 'RENEW'
          ? (options.s100 ? 'SUR100' : 'SUR50')
          : 'NONE';

      const coastalUnits = isPurchasePossess
        ? purchasePossessUnits
        : isSellTransfer
        ? sellTransferUnits
        : defaultCoastalUnits;

      const res = computeCoastal(
        baseText,
        coastalTxn,
        options.YEARS,
        surMode,
        coastalUnits,
        coastalTxn === 'RENEW' ? DELAY_MONTHS : 0
      );

      if (!res || !res.row) {
        this.applyDuplicateOthersCharge(hasDuplicate);
        return;
      }

      if (isPurchasePossess) {
        this.addToField('licPermitToPurchase', res.purchase);
        this.addToField('licPermitToPossess', res.possess);
        this.addToField('licFilingFee', res.ff);
        this.addToField('dst', res.dst);
      } else if (isSellTransfer) {
        this.addToField('appOthers', res.stf);
        this.addToField('dst', res.dst);
      } else if (coastalTxn === 'NEW') {
        this.addToField('licConstructionPermitFee', res.cp);
        this.addToField('licRadioStationLicense', res.lf);
        this.addToField('licInspectionFee', res.ifee);
        this.addToField('dst', res.dst);
      } else if (coastalTxn === 'RENEW') {
        this.addToField('licRadioStationLicense', res.lf);
        this.addToField('licInspectionFee', res.ifee);
        this.addToField('licSurcharges', res.surcharge);
        this.addToField('dst', res.dst);
      } else {
        this.addToField('licFilingFee', res.ff);
        this.addToField('licConstructionPermitFee', res.cp);
        this.addToField('appModificationFee', res.mod);
        this.addToField('dst', res.dst);
      }

      this.applyDuplicateOthersCharge(hasDuplicate);
      return;
    }

    if (up.includes('VHF') || up.includes('UHF')) {
      const isVhfPurchasePossess =
        up.includes('PURCHASE/POSSESS') ||
        (up.includes('PURCHASE') && up.includes('POSSESS'));

      const entryTxn =
        /\bRENEW(AL)?\b/.test(up) ? 'RENEW' :
        /\bMODIFICATION\b|\bMOD\b/.test(up) ? 'MOD' :
        'NEW';

      const vhfTxnUnitMarker =
        entryTxn === 'MOD'
          ? /MODIFICATION|\bMOD\b/
          : entryTxn === 'RENEW'
          ? /\bRENEW(AL)?\b/
          : /\bNEW\b/;

      const vhfTxnUnits = this.extractUnitsAfterKeyword(
        text,
        vhfTxnUnitMarker,
        options.SHIP_UNITS
      );

      const vhfUnits = isVhfPurchasePossess
        ? this.extractUnitsAfterKeyword(
            text,
            /PURCHASE\/POSSESS|PURCHASE AND POSSESS/,
            options.SHIP_UNITS
          )
        : vhfTxnUnits;

      const vhf = computeVhfUhfWithTxn(
        text,
        entryTxn,
        options.YEARS,
        vhfUnits,
        1,
        entryTxn === 'RENEW'
          ? (options.s100 ? 'SUR100' : 'SUR50')
          : 'NONE',
        entryTxn === 'RENEW' ? DELAY_MONTHS : 0
      );

      if (!vhf?.ok) {
        this.applyDuplicateOthersCharge(hasDuplicate);
        return;
      }

      if (isVhfPurchasePossess) {
        this.addToField('licPermitToPurchase', vhf.purchase * vhf.unit);
        this.addToField('licPermitToPossess', vhf.possess * vhf.unit);
        this.addToField('licFilingFee', vhf.filingFee * vhf.unit);
        this.addToField('dst', vhf.dst);
      } else if (entryTxn === 'NEW') {
        this.addToField('licConstructionPermitFee', vhf.constructionPermit * vhf.unit);
        this.addToField('licRadioStationLicense', (vhf.licenseFee * vhf.chUnit) * vhf.years);
        this.addToField('licInspectionFee', (vhf.inspectionFee * vhf.unit) * vhf.years);
        this.addToField('licSUF', (vhf.supervisionFee * vhf.chUnit) * vhf.years);
        this.addToField('dst', vhf.dst);
      } else if (entryTxn === 'RENEW') {
        this.addToField('licRadioStationLicense', (vhf.licenseFee * vhf.chUnit) * vhf.years);
        this.addToField('licInspectionFee', (vhf.inspectionFee * vhf.unit) * vhf.years);
        this.addToField('licSUF', (vhf.supervisionFee * vhf.chUnit) * vhf.years);
        this.addToField('licSurcharges', vhf.surchargeApplied);
        this.addToField('dst', vhf.dst);
      } else {
        this.addToField('licFilingFee', vhf.filingFee * vhf.unit);
        this.addToField('licConstructionPermitFee', vhf.constructionPermit * vhf.unit);
        this.addToField('appModificationFee', vhf.modificationFee * vhf.unit);
        this.addToField('dst', vhf.dst);
      }

      this.applyDuplicateOthersCharge(hasDuplicate);
      return;
    }

    if (up.includes('MOBILE PHONE') || up.includes('MOBILEPHONE')) {
      const flags: MobileTxnFlags = {
        isNew: (options.useTxnChecks && options.tNew) || (/\bNEW\b/.test(up) && !/\bRENEW(AL)?\b/.test(up)),
        isRenew: (options.useTxnChecks && options.tRen) || /\bRENEW(AL)?\b/.test(up),
        isMod: (options.useTxnChecks && options.tMod) || /\bMOD(IFICATION)?\b/.test(up),
      };

      const mp = computeMobilePhone(text, options.YEARS_RAW || 1, flags, DELAY_MONTHS);

      if (mp?.ok) {
        this.addToField('licFilingFee', mp.ff);
        this.addToField('licConstructionPermitFee', mp.pf);
        this.addToField('licInspectionFee', mp.ifee);
        this.addToField('appModificationFee', mp.mod);
        this.addToField('dst', mp.dst);
        this.addToField('licSurcharges', mp.sur);
      }

      this.applyDuplicateOthersCharge(hasDuplicate);
      return;
    }

    if (up.includes('TVRO/CATV') || up.includes('TVRO') || up.includes('CATV')) {
      const tv = computeTvroCatv(
        text,
        options.YEARS,
        {
          isNew:
            (options.useTxnChecks && options.tNew) || (/\bNEW\b/.test(up) && !/\bRENEW(AL)?\b/.test(up)),
          isRenew: (options.useTxnChecks && options.tRen) || /\bRENEW(AL)?\b/.test(up),
          isMod: (options.useTxnChecks && options.tMod) || /\bMOD(IFICATION)?\b/.test(up),
        },
        options.s100,
        DELAY_MONTHS
      );

      if (tv?.ok) {
        this.addToField('appRegistrationFee', tv.reg);
        this.addToField('licFilingFee', tv.ff);
        this.addToField('licConstructionPermitFee', tv.cpf);
        this.addToField('licRadioStationLicense', tv.lf);
        this.addToField('licInspectionFee', tv.ifee);
        this.addToField('licSurcharges', tv.sur);
        this.addToField('dst', tv.dst);
        this.addToField('appModificationFee', tv.mod);
      }

      this.applyDuplicateOthersCharge(hasDuplicate);
      return;
    }

    if (parsedShipTop && !up.includes('COASTAL')) {
      const rowKey = rowKeyFromParsed(parsedShipTop);
      const txns = parsedShipTop.txns?.length ? [...parsedShipTop.txns] : txn ? [txn] : [];

      if (hasRenewTxn && !txns.includes('RENEW')) txns.push('RENEW');

      const isDeletion = parsedShipTop.kind === 'DEL';
      if (!txns.length && !isDeletion) return;

      const ship = buildShipParse(
        rowKey,
        options.wEq,
        options.SHIP_UNITS,
        options.s100,
        parsedShipTop.purchaseUnits,
        parsedShipTop.sellTransferUnits,
        parsedShipTop.possessStorageUnits
      );

      const res = computeShipStation(
        ship,
        options.YEARS,
        txns,
        SHIP_STATION as Record<string, ShipStationRow>,
        DELAY_MONTHS
      );

      this.addToField('licPermitToPurchase', res.Purchase);
      this.addToField('licFilingFee', res.FF);
      this.addToField('licPermitToPossess', res.Possess);
      this.addToField('licConstructionPermitFee', res.CPF);
      this.addToField('licRadioStationLicense', res.LF);
      this.addToField('licInspectionFee', res.IF);
      this.addToField('licSurcharges', res.SUR);
      this.addToField('appClearanceCertificationFee', res.CERT);
      this.addToField('appModificationFee', res.MOD);
      this.addToField('appOthers', res.OTH);
      this.addToField('dst', res.DST);
      this.applyDuplicateOthersCharge(hasDuplicate);
      return;
    }

    this.applyDuplicateOthersCharge(hasDuplicate);
  }

  private cleanParticularsTxnText(text: string): string {
    return String(text ?? '')
      .replace(/\bNEW\b/gi, '')
      .replace(/\bRENEWAL\b/gi, '')
      .replace(/\bRENEW\b/gi, '')
      .replace(/\bMODIFICATION\b/gi, '')
      .replace(/\bMOD\b/gi, '')
      .replace(/\bDUPLICATE\b/gi, '')
      .replace(/\s+-\s+-/g, ' - ')
      .replace(/\s{2,}/g, ' ')
      .replace(/-\s*$/g, '')
      .trim();
  }

  private splitParticularsEntries(text: string): string[] {
    return String(text ?? '')
      .split('||')
      .map((part) => part.trim())
      .filter(Boolean);
  }

  private buildParticularsWithTxn(baseText: string, txnLabels: string[], duplicate: boolean): string {
    let result = baseText.trim();

    for (const txnLabel of txnLabels) {
      if (!result.toUpperCase().includes(txnLabel)) {
        result = `${result} - ${txnLabel}`;
      }
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

    if (cleanToday.getDate() > expiry.getDate()) {
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
