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

  TEMPORARY_A: AmateurRow;
  TEMPORARY_B: AmateurRow;
  TEMPORARY_C: AmateurRow;

  SPECIAL_EVENT: AmateurRow;
  VANITY: AmateurRow;

  POSSESS_STORAGE: AmateurRow;
};

export type AmateurResult = {
  maPermitPurchase: number;
  maPermitPossess: number;
  maStf: number;

  maRadioStationLicense: number;
  maRadioOperatorsCert: number;

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
  // A
  AT_ROC: {
    Purchase: 0,
    Possess: 0,
    STF: 0,
    FF: 0,
    CPF: 0,
    LF: 0,
    ROC: 60,
    MOD: 50,
    DST: 30,
    SUR50: 30,
    SUR100: 60,
  },

  // B
  AT_RSL_A: {
    Purchase: 50,
    Possess: 50,
    STF: 50,
    FF: 60,
    CPF: 0,
    LF: 120,
    ROC: 60,
    MOD: 50,
    DST: 30,
    SUR50: 60,
    SUR100: 120,
  },
  AT_RSL_B: {
    Purchase: 50,
    Possess: 50,
    STF: 50,
    FF: 60,
    CPF: 0,
    LF: 132,
    ROC: 60,
    MOD: 50,
    DST: 30,
    SUR50: 66,
    SUR100: 132,
  },
  AT_RSL_C: {
    Purchase: 50,
    Possess: 50,
    STF: 50,
    FF: 60,
    CPF: 0,
    LF: 144,
    ROC: 60,
    MOD: 50,
    DST: 30,
    SUR50: 72,
    SUR100: 144,
  },
  AT_RSL_D: {
    Purchase: 50,
    Possess: 50,
    STF: 50,
    FF: 60,
    CPF: 0,
    LF: 144,
    ROC: 60,
    MOD: 50,
    DST: 30,
    SUR50: 72,
    SUR100: 144,
  },

  // C
  AT_LIFETIME: {
    Purchase: 50,
    Possess: 50,
    STF: 0,
    FF: 60,
    CPF: 0,
    LF: 50,
    ROC: 0,
    MOD: 50,
    DST: 30,
    SUR50: 0,
    SUR100: 0,
  },

  // D
  AT_CLUB_SIMPLEX: {
    Purchase: 50,
    Possess: 50,
    STF: 50,
    FF: 180,
    CPF: 600,
    LF: 700,
    ROC: 0,
    MOD: 50,
    DST: 30,
    SUR50: 350,
    SUR100: 700,
  },
  AT_CLUB_REPEATER: {
    Purchase: 50,
    Possess: 50,
    STF: 50,
    FF: 180,
    CPF: 600,
    LF: 1320,
    ROC: 0,
    MOD: 50,
    DST: 30,
    SUR50: 660,
    SUR100: 1320,
  },

  // E
  TEMPORARY_A: {
    Purchase: 50,
    Possess: 50,
    STF: 0,
    FF: 60,
    CPF: 0,
    LF: 120,
    ROC: 60,
    MOD: 0,
    DST: 30,
    SUR50: 0,
    SUR100: 0,
  },
  TEMPORARY_B: {
    Purchase: 50,
    Possess: 50,
    STF: 0,
    FF: 60,
    CPF: 0,
    LF: 132,
    ROC: 60,
    MOD: 0,
    DST: 30,
    SUR50: 0,
    SUR100: 0,
  },
  TEMPORARY_C: {
    Purchase: 50,
    Possess: 50,
    STF: 0,
    FF: 60,
    CPF: 0,
    LF: 144,
    ROC: 60,
    MOD: 0,
    DST: 30,
    SUR50: 0,
    SUR100: 0,
  },

  // F / G / H
  SPECIAL_EVENT: {
    Purchase: 0,
    Possess: 0,
    STF: 0,
    FF: 0,
    CPF: 0,
    LF: 0,
    ROC: 0,
    MOD: 0,
    DST: 30,
    SUR50: 0,
    SUR100: 0,
    SP: 120,
  },

  VANITY: {
    Purchase: 0,
    Possess: 0,
    STF: 0,
    FF: 0,
    CPF: 0,
    LF: 0,
    ROC: 0,
    MOD: 0,
    DST: 30,
    SUR50: 0,
    SUR100: 0,
    SP: 1000,
  },

  POSSESS_STORAGE: {
    Purchase: 0,
    Possess: 50,
    STF: 0,
    FF: 0,
    CPF: 0,
    LF: 0,
    ROC: 0,
    MOD: 0,
    DST: 30,
    SUR50: 0,
    SUR100: 0,
  },
};

function normalize(text: string): string {
  return String(text ?? '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
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
  if (p.includes('TEMPORARY') || p.includes('FOREIGN VISITOR')) {
    if (c === 'B') return 'TEMPORARY_B';
    if (c === 'C') return 'TEMPORARY_C';
    return 'TEMPORARY_A';
  }

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

function isPermitPurchasePossessText(p: string): boolean {
  return (
    p.includes('PERMIT TO PURCHASE') ||
    p.includes('PERMIT TO POSSESS') ||
    p.includes('PURCHASE/POSSESS') ||
    p.includes('PURCHASE AND POSSESS') ||
    (p.includes('PURCHASE') && p.includes('POSSESS'))
  );
}

function isSellTransferText(p: string): boolean {
  return (
    p.includes('SELL/TRANSFER') ||
    p.includes('SELL / TRANSFER') ||
    p.includes('SELL-TRANSFER') ||
    p.includes('TRANSFER')
  );
}

export function computeAmateurRenewalSurcharge(
  baseAmount: number,
  delayMonths: number
): number {
  const base = num(baseAmount);
  const months = Math.max(0, Math.floor(num(delayMonths)));

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

  const isPermitPurchasePossess = isPermitPurchasePossessText(p);
  const isSellTransfer = isSellTransferText(p);
  const isPossessStorage = key === 'POSSESS_STORAGE';

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
  let maDST = 0;

  // =====================================================
  // STANDALONE AMATEUR OPTIONS FIRST
  // These override normal NEW/RENEW/MOD formulas
  // =====================================================

  // B.1 / C.1 / D.1
  if (
    isPermitPurchasePossess &&
    (key.startsWith('AT_RSL_') || key === 'AT_LIFETIME' || key === 'AT_CLUB_SIMPLEX' || key === 'AT_CLUB_REPEATER')
  ) {
    maPermitPurchase = num(row.Purchase) * unit;
    maPermitPossess = num(row.Possess) * unit;
    maDST = num(row.DST);

    const total = round2(maPermitPurchase + maPermitPossess + maDST);

    return {
      maPermitPurchase: round2(maPermitPurchase),
      maPermitPossess: round2(maPermitPossess),
      maStf: 0,
      maRadioStationLicense: 0,
      maRadioOperatorsCert: 0,
      maApplicationFee: 0,
      maFilingFee: 0,
      maConstructionPermitFee: 0,
      maSurcharges: 0,
      maDST: round2(maDST),
      maModificationFee: 0,
      total,
      kind: `${String(key)}_PURCHASE_POSSESS`,
    };
  }

  // B.5
  if (isSellTransfer && key.startsWith('AT_RSL_')) {
    maStf = num(row.STF) * unit;
    maDST = num(row.DST);

    const total = round2(maStf + maDST);

    return {
      maPermitPurchase: 0,
      maPermitPossess: 0,
      maStf: round2(maStf),
      maRadioStationLicense: 0,
      maRadioOperatorsCert: 0,
      maApplicationFee: 0,
      maFilingFee: 0,
      maConstructionPermitFee: 0,
      maSurcharges: 0,
      maDST: round2(maDST),
      maModificationFee: 0,
      total,
      kind: `${String(key)}_SELL_TRANSFER`,
    };
  }

  // H
  if (isPossessStorage) {
    maPermitPossess = num(row.Possess) * unit;
    maDST = num(row.DST);

    const total = round2(maPermitPossess + maDST);

    return {
      maPermitPurchase: 0,
      maPermitPossess: round2(maPermitPossess),
      maStf: 0,
      maRadioStationLicense: 0,
      maRadioOperatorsCert: 0,
      maApplicationFee: 0,
      maFilingFee: 0,
      maConstructionPermitFee: 0,
      maSurcharges: 0,
      maDST: round2(maDST),
      maModificationFee: 0,
      total,
      kind: 'POSSESS_STORAGE',
    };
  }

  // =====================================================
  // NORMAL CHARTER COMPUTATION
  // =====================================================

  maDST = num(row.DST);

  // A.1 / A.2 / A.3
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

  // B.2 / B.3 / B.4
  else if (key.startsWith('AT_RSL_')) {
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

  // C.2 / C.3
  else if (key === 'AT_LIFETIME') {
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

  // D.2 / D.3 / D.4
  else if (key === 'AT_CLUB_SIMPLEX' || key === 'AT_CLUB_REPEATER') {
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

  // E
  else if (key === 'TEMPORARY_A' || key === 'TEMPORARY_B' || key === 'TEMPORARY_C') {
    maFilingFee = num(row.FF);
    maPermitPurchase = num(row.Purchase) * unit;
    maPermitPossess = num(row.Possess) * unit;
    maRadioOperatorsCert = num(row.ROC) * yr;
    maRadioStationLicense = num(row.LF) * yr;
  }

  // F.1 / F.2
  else if (key === 'VANITY') {
    maRadioStationLicense = num(row.SP) * yr;
  }

  // G
  else if (key === 'SPECIAL_EVENT') {
    maRadioStationLicense = num(row.SP);
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
