// src/app/.../soa-fees/compute/amateur.compute.ts

export type TxnFlags = {
  txnNew: boolean;
  txnRenew: boolean;
  txnMod: boolean;
};

export type AmateurRow = {
  Purchase: number;
  Possess: number;
  STF: number;
  FF: number;
  CPF: number;
  LF: number;
  ROC: number;
  MOD: number;
  DST: number;
  SUR50: number;
  SUR100: number;
  SP?: number;
};

export type AmateurRates = {
  AT_ROC: AmateurRow;

  AT_RSL_A: AmateurRow;
  AT_RSL_B: AmateurRow;
  AT_RSL_C: AmateurRow;
  AT_RSL_D: AmateurRow;

  AT_LIFETIME: AmateurRow;

  AT_CLUB_SIMPLEX: AmateurRow;
  AT_CLUB_REPEATER: AmateurRow;

  TEMPORARY: AmateurRow;

  SPECIAL_EVENT: AmateurRow;
  VANITY: AmateurRow;

  POSSESS_STORAGE: AmateurRow;
};

export type AmateurResult = {
  maPermitPurchase: number;
  maPermitPossess: number;
  maStf: number;

  maRadioStationLicense: number; // LF / club / vanity / temporary / special event
  maRadioOperatorsCert: number;  // ROC only

  maApplicationFee: number;
  maFilingFee: number;
  maConstructionPermitFee: number;
  maSurcharges: number;
  maDST: number;
  maModificationFee: number;
  total: number;
  kind: string;
};

const num = (v: any): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const round2 = (n: number): number =>
  Math.round((num(n) + Number.EPSILON) * 100) / 100;

const AMATEUR_RATES: AmateurRates = {
  AT_ROC: {
    Purchase: 0, Possess: 0, STF: 0, FF: 0, CPF: 0, LF: 0, ROC: 60, MOD: 50, DST: 30, SUR50: 30, SUR100: 60,
  },

  AT_RSL_A: {
    Purchase: 50, Possess: 50, STF: 50, FF: 60, CPF: 0, LF: 120, ROC: 60, MOD: 50, DST: 30, SUR50: 60, SUR100: 120,
  },
  AT_RSL_B: {
    Purchase: 50, Possess: 50, STF: 50, FF: 60, CPF: 0, LF: 132, ROC: 60, MOD: 50, DST: 30, SUR50: 66, SUR100: 132,
  },
  AT_RSL_C: {
    Purchase: 50, Possess: 50, STF: 50, FF: 60, CPF: 0, LF: 144, ROC: 60, MOD: 50, DST: 30, SUR50: 72, SUR100: 144,
  },
  AT_RSL_D: {
    Purchase: 50, Possess: 50, STF: 50, FF: 60, CPF: 0, LF: 144, ROC: 60, MOD: 50, DST: 30, SUR50: 72, SUR100: 144,
  },

  AT_LIFETIME: {
    Purchase: 50, Possess: 50, STF: 0, FF: 60, CPF: 0, LF: 50, ROC: 0, MOD: 50, DST: 30, SUR50: 0, SUR100: 0,
  },

  AT_CLUB_SIMPLEX: {
    Purchase: 50, Possess: 50, STF: 50, FF: 180, CPF: 600, LF: 700, ROC: 0, MOD: 50, DST: 30, SUR50: 350, SUR100: 700,
  },
  AT_CLUB_REPEATER: {
    Purchase: 50, Possess: 50, STF: 50, FF: 180, CPF: 600, LF: 1320, ROC: 0, MOD: 50, DST: 30, SUR50: 660, SUR100: 1320,
  },

  TEMPORARY: {
    Purchase: 50, Possess: 50, STF: 0, FF: 60, CPF: 0, LF: 120, ROC: 60, MOD: 0, DST: 30, SUR50: 0, SUR100: 0,
  },

  SPECIAL_EVENT: {
    Purchase: 0, Possess: 0, STF: 0, FF: 0, CPF: 0, LF: 0, ROC: 0, MOD: 0, DST: 30, SUR50: 0, SUR100: 0, SP: 120,
  },

  VANITY: {
    Purchase: 0, Possess: 0, STF: 0, FF: 0, CPF: 0, LF: 0, ROC: 0, MOD: 0, DST: 30, SUR50: 0, SUR100: 0, SP: 1000,
  },

  POSSESS_STORAGE: {
    Purchase: 0, Possess: 50, STF: 0, FF: 0, CPF: 0, LF: 0, ROC: 0, MOD: 0, DST: 30, SUR50: 0, SUR100: 0,
  },
};

function normalize(text: string): string {
  return String(text ?? '').toUpperCase().replace(/\s+/g, ' ').trim();
}

function parseUnits(particulars: string): number {
  const up = normalize(particulars);

  const m1 = /UNITS?_([0-9]+)/.exec(up);
  if (m1?.[1]) return Math.max(1, Math.floor(Number(m1[1])));

  const m2 = /([0-9]+)\s*UNITS?/.exec(up);
  if (m2?.[1]) return Math.max(1, Math.floor(Number(m2[1])));

  return 1;
}

function detectKey(particulars: string, cls: string): keyof AmateurRates {
  const p = normalize(particulars);
  const c = String(cls ?? 'A').trim().toUpperCase();

  if (p.includes('SPECIAL EVENT')) return 'SPECIAL_EVENT';
  if (p.includes('VANITY')) return 'VANITY';
  if (p.includes('TEMPORARY') || p.includes('FOREIGN VISITOR')) return 'TEMPORARY';

  if (p.includes('POSSESS') && (p.includes('STORAGE') || p.includes('RADIO STATIONS'))) {
    return 'POSSESS_STORAGE';
  }

  if (p.includes('AT-CLUB') || (p.includes('CLUB') && p.includes('RSL'))) {
    if (p.includes('REPEATER')) return 'AT_CLUB_REPEATER';
    return 'AT_CLUB_SIMPLEX';
  }

  if (p.includes('LIFETIME')) return 'AT_LIFETIME';
  if (p.includes('AT-ROC') || (p.includes('AT') && p.includes('ROC'))) return 'AT_ROC';

  if (c === 'B') return 'AT_RSL_B';
  if (c === 'C') return 'AT_RSL_C';
  if (c === 'D') return 'AT_RSL_D';
  return 'AT_RSL_A';
}

export function computeAmateurRenewalSurcharge(
  baseAmount: number,
  delayMonths: number
): number {
  const base = num(baseAmount);
  const months = Math.max(0, num(delayMonths));

  if (months <= 0) return 0;
  if (months <= 6) return round2(base * 0.5);
  if (months <= 12) return round2(base * 1.0);

  const extraMonths = months - 12;
  const extraHalfYears = Math.ceil(extraMonths / 6);

  return round2(base * (1 + extraHalfYears * 0.5));
}

export function computeAmateur(
  particulars: string,
  cls: string,
  years: number,
  txn: TxnFlags,
  delayMonths: number = 0
): AmateurResult {
  const yr = Math.max(1, Math.floor(num(years) || 1));
  const unit = parseUnits(particulars);
  const key = detectKey(particulars, cls);
  const row = AMATEUR_RATES[key];
  const p = normalize(particulars);

  const isPermitPurchasePossess =
    p.includes('PERMIT TO PURCHASE') ||
    p.includes('PERMIT TO POSSESS') ||
    p.includes('PURCHASE/POSSESS') ||
    (p.includes('PURCHASE') && p.includes('POSSESS'));

  const isSellTransfer =
    p.includes('SELL/TRANSFER') ||
    p.includes('SELL / TRANSFER') ||
    p.includes('TRANSFER');

  let maPermitPurchase = 0;
  let maPermitPossess = 0;
  let maStf = 0;

  let maRadioStationLicense = 0;
  let maRadioOperatorsCert = 0;

  let maApplicationFee = 0;
  let maFilingFee = 0;
  let maConstructionPermitFee = 0;
  let maSurcharges = 0;
  let maModificationFee = 0;
  const maDST = num(row.DST);

  if (key === 'AT_ROC') {
    if (txn.txnNew) {
      maRadioOperatorsCert = num(row.ROC) * yr;
    }

    if (txn.txnRenew) {
      maRadioOperatorsCert = num(row.ROC) * yr;
      maSurcharges = computeAmateurRenewalSurcharge(num(row.ROC), delayMonths);
    }

    if (txn.txnMod) {
      maModificationFee = num(row.MOD);
      if (!txn.txnNew && !txn.txnRenew) {
        maRadioOperatorsCert = 0;
        maSurcharges = 0;
      }
    }
  }

  else if (key.startsWith('AT_RSL_')) {
    if (isSellTransfer) {
      maStf = num(row.STF) * unit;
    } else if (isPermitPurchasePossess) {
      maPermitPurchase = num(row.Purchase) * unit;
      maPermitPossess = num(row.Possess) * unit;
    } else {
      if (txn.txnNew) {
        maFilingFee = num(row.FF);
        maRadioStationLicense = num(row.LF) * yr;
      }

      if (txn.txnRenew) {
        maRadioStationLicense = num(row.LF) * yr;
        maSurcharges = computeAmateurRenewalSurcharge(num(row.LF), delayMonths);
      }

      if (txn.txnMod) {
        maFilingFee = num(row.FF);
        maModificationFee = num(row.MOD);

        if (!txn.txnNew && !txn.txnRenew) {
          maRadioStationLicense = 0;
          maSurcharges = 0;
        }
      }
    }
  }

  else if (key === 'AT_LIFETIME') {
    if (isPermitPurchasePossess) {
      maPermitPurchase = num(row.Purchase) * unit;
      maPermitPossess = num(row.Possess) * unit;
    } else {
      if (txn.txnNew) {
        maRadioStationLicense = num(row.LF);
      }

      if (txn.txnMod) {
        maFilingFee = num(row.FF);
        maModificationFee = num(row.MOD);

        if (!txn.txnNew) {
          maRadioStationLicense = 0;
        }
      }
    }
  }

  else if (key === 'AT_CLUB_SIMPLEX' || key === 'AT_CLUB_REPEATER') {
    if (isPermitPurchasePossess) {
      maPermitPurchase = num(row.Purchase) * unit;
      maPermitPossess = num(row.Possess) * unit;
    } else {
      if (txn.txnNew) {
        maFilingFee = num(row.FF);
        maConstructionPermitFee = num(row.CPF);
        maRadioStationLicense = num(row.LF) * yr;
      }

      if (txn.txnRenew) {
        maRadioStationLicense = num(row.LF) * yr;
        maSurcharges = computeAmateurRenewalSurcharge(num(row.LF), delayMonths);
      }

      if (txn.txnMod) {
        maFilingFee = num(row.FF);
        maConstructionPermitFee = num(row.CPF);
        maModificationFee = num(row.MOD);

        if (!txn.txnNew && !txn.txnRenew) {
          maRadioStationLicense = 0;
          maSurcharges = 0;
        }
      }
    }
  }

  else if (key === 'TEMPORARY') {
    maFilingFee = num(row.FF);
    maPermitPurchase = num(row.Purchase) * unit;
    maPermitPossess = num(row.Possess) * unit;

    maRadioOperatorsCert = num(row.ROC) * yr;
    maRadioStationLicense = num(row.LF) * yr;
  }

  else if (key === 'VANITY') {
    maRadioStationLicense = num(row.SP) * yr;
  }

  else if (key === 'SPECIAL_EVENT') {
    maRadioStationLicense = num(row.SP);
  }

  else if (key === 'POSSESS_STORAGE') {
    maPermitPossess = num(row.Possess) * unit;
  }

  const total = round2(
    maPermitPurchase +
    maPermitPossess +
    maStf +
    maRadioStationLicense +
    maRadioOperatorsCert +
    maApplicationFee +
    maFilingFee +
    maConstructionPermitFee +
    maSurcharges +
    maModificationFee +
    maDST
  );

  return {
    maPermitPurchase: round2(maPermitPurchase),
    maPermitPossess: round2(maPermitPossess),
    maStf: round2(maStf),
    maRadioStationLicense: round2(maRadioStationLicense),
    maRadioOperatorsCert: round2(maRadioOperatorsCert),
    maApplicationFee: round2(maApplicationFee),
    maFilingFee: round2(maFilingFee),
    maConstructionPermitFee: round2(maConstructionPermitFee),
    maSurcharges: round2(maSurcharges),
    maDST: round2(maDST),
    maModificationFee: round2(maModificationFee),
    total,
    kind: String(key),
  };
}