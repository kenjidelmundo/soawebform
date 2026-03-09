// src/app/.../soa-fees/compute/roc.compute.ts

export type TxnFlags = {
  txnNew: boolean;
  txnRenew: boolean;
  txnMod: boolean;
};

export type RocOperatorRow = {
  FF: number;
  AF: number;
  SEM: number;
  ROC: number;
  MOD: number;
  DST: number;
};

export type RocResult = {
  rocFF: number;
  rocAF: number;
  rocSemFee: number;
  rocRadioOperatorsCert: number;
  rocSurcharges: number;
  rocDST: number;
  rocModificationFee: number;
  total: number;
  kind: string;
};

const num = (v: any): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const round2 = (n: number): number =>
  Math.round((num(n) + Number.EPSILON) * 100) / 100;

const ROC_OPERATOR: Record<string, RocOperatorRow> = {
  '1RTG': { FF: 0, AF: 0, SEM: 0, ROC: 180, MOD: 120, DST: 30 },
  '2RTG': { FF: 0, AF: 0, SEM: 0, ROC: 120, MOD: 120, DST: 30 },
  '3RTG': { FF: 0, AF: 0, SEM: 0, ROC: 60, MOD: 120, DST: 30 },

  '1PHN': { FF: 0, AF: 0, SEM: 0, ROC: 120, MOD: 120, DST: 30 },
  '2PHN': { FF: 0, AF: 0, SEM: 0, ROC: 100, MOD: 120, DST: 30 },
  '3PHN': { FF: 0, AF: 0, SEM: 0, ROC: 60, MOD: 120, DST: 30 },

  'RROC-AIRCRAFT': { FF: 0, AF: 0, SEM: 0, ROC: 100, MOD: 120, DST: 30 },
  'TEMP-FOREIGN': { FF: 0, AF: 0, SEM: 0, ROC: 60, MOD: 120, DST: 30 },

  'SROP': { FF: 0, AF: 20, SEM: 20, ROC: 60, MOD: 120, DST: 30 },
  'GROC': { FF: 10, AF: 20, SEM: 0, ROC: 60, MOD: 120, DST: 30 },
  'RROC-RLM': { FF: 10, AF: 20, SEM: 0, ROC: 60, MOD: 120, DST: 30 },
};

const ROC_DEFAULT: RocOperatorRow = {
  FF: 0,
  AF: 0,
  SEM: 0,
  ROC: 60,
  MOD: 120,
  DST: 30,
};

function normalize(text: string): string {
  return String(text ?? '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function getRocOperatorKeyFromParticulars(particulars: string): string {
  const up = normalize(particulars);

  if (up.includes('TEMPORARY ROC') || up.includes('FOREIGN PILOT')) return 'TEMP-FOREIGN';

  if (up.includes('1RTG') || up.includes('RTG 1ST') || up.includes('RTG1ST')) return '1RTG';
  if (up.includes('2RTG') || up.includes('RTG 2ND') || up.includes('RTG2ND')) return '2RTG';
  if (up.includes('3RTG') || up.includes('RTG 3RD') || up.includes('RTG3RD')) return '3RTG';

  if (up.includes('1PHN') || up.includes('PHN 1ST') || up.includes('PHN1ST')) return '1PHN';
  if (up.includes('2PHN') || up.includes('PHN 2ND') || up.includes('PHN2ND')) return '2PHN';
  if (up.includes('3PHN') || up.includes('PHN 3RD') || up.includes('PHN3RD')) return '3PHN';

  if (up.includes('RROC-AIRCRAFT') || up.includes('RROC AIRCRAFT') || up.includes('AIRCRAFT')) {
    return 'RROC-AIRCRAFT';
  }

  if (up.includes('SROP')) return 'SROP';
  if (up.includes('GROC')) return 'GROC';
  if (up.includes('RROC-RLM') || up.includes('RROC RLM') || up.includes('RLM')) return 'RROC-RLM';

  return 'DEFAULT';
}

function getRocOperatorRowFromParticulars(particulars: string): RocOperatorRow {
  const key = getRocOperatorKeyFromParticulars(particulars);
  return key === 'DEFAULT' ? ROC_DEFAULT : (ROC_OPERATOR[key] ?? ROC_DEFAULT);
}

export function computeRocRenewalSurcharge(
  rocBaseAmount: number,
  delayMonths: number
): number {
  const base = num(rocBaseAmount);
  const months = Math.max(0, num(delayMonths));

  if (months <= 0) return 0;
  if (months <= 6) return round2(base * 0.5);
  if (months <= 12) return round2(base * 1.0);

  const extraMonths = months - 12;
  const extraHalfYears = Math.ceil(extraMonths / 6);

  return round2(base * (1 + extraHalfYears * 0.5));
}

export function computeROC(
  particulars: string,
  years: number,
  txn: TxnFlags,
  delayMonths: number = 0
): RocResult {
  const key = getRocOperatorKeyFromParticulars(particulars);
  const row = getRocOperatorRowFromParticulars(particulars);
  const yr = Math.max(1, Math.floor(num(years) || 1));

  let rocFF = 0;
  let rocAF = 0;
  let rocSemFee = 0;
  let rocRadioOperatorsCert = 0;
  let rocSurcharges = 0;
  let rocModificationFee = 0;
  const rocDST = num(row.DST);

  // TEMPORARY ROC FOR FOREIGN PILOT = ROC + DST
  if (key === 'TEMP-FOREIGN') {
    rocRadioOperatorsCert = num(row.ROC);
    if (txn.txnMod) rocModificationFee = num(row.MOD);

    return {
      rocFF: round2(rocFF),
      rocAF: round2(rocAF),
      rocSemFee: round2(rocSemFee),
      rocRadioOperatorsCert: round2(rocRadioOperatorsCert),
      rocSurcharges: round2(rocSurcharges),
      rocDST: round2(rocDST),
      rocModificationFee: round2(rocModificationFee),
      total: round2(
        rocFF + rocAF + rocSemFee + rocRadioOperatorsCert + rocSurcharges + rocModificationFee + rocDST
      ),
      kind: key,
    };
  }

  // SROP
  if (key === 'SROP') {
    if (txn.txnNew) {
      rocAF = num(row.AF);
      rocSemFee = num(row.SEM);
      rocRadioOperatorsCert = num(row.ROC) * yr;
    }

    if (txn.txnRenew) {
      rocRadioOperatorsCert = num(row.ROC) * yr;
      rocSurcharges = computeRocRenewalSurcharge(num(row.ROC), delayMonths);
    }

    if (txn.txnMod) {
      rocModificationFee = num(row.MOD);
    }

    return {
      rocFF: round2(rocFF),
      rocAF: round2(rocAF),
      rocSemFee: round2(rocSemFee),
      rocRadioOperatorsCert: round2(rocRadioOperatorsCert),
      rocSurcharges: round2(rocSurcharges),
      rocDST: round2(rocDST),
      rocModificationFee: round2(rocModificationFee),
      total: round2(
        rocFF + rocAF + rocSemFee + rocRadioOperatorsCert + rocSurcharges + rocModificationFee + rocDST
      ),
      kind: key,
    };
  }

  // GROC / RROC-RLM
  if (key === 'GROC' || key === 'RROC-RLM') {
    if (txn.txnNew) {
      rocFF = num(row.FF);
      rocAF = num(row.AF);
      rocRadioOperatorsCert = num(row.ROC) * yr;
    }

    if (txn.txnRenew) {
      rocRadioOperatorsCert = num(row.ROC) * yr;
      rocSurcharges = computeRocRenewalSurcharge(num(row.ROC), delayMonths);
    }

    if (txn.txnMod) {
      rocModificationFee = num(row.MOD);
    }

    return {
      rocFF: round2(rocFF),
      rocAF: round2(rocAF),
      rocSemFee: round2(rocSemFee),
      rocRadioOperatorsCert: round2(rocRadioOperatorsCert),
      rocSurcharges: round2(rocSurcharges),
      rocDST: round2(rocDST),
      rocModificationFee: round2(rocModificationFee),
      total: round2(
        rocFF + rocAF + rocSemFee + rocRadioOperatorsCert + rocSurcharges + rocModificationFee + rocDST
      ),
      kind: key,
    };
  }

  // COMMERCIAL ROC / RROC-AIRCRAFT
  if (txn.txnNew) {
    rocRadioOperatorsCert = num(row.ROC) * yr;
  }

  if (txn.txnRenew) {
    rocRadioOperatorsCert = num(row.ROC) * yr;
    rocSurcharges = computeRocRenewalSurcharge(num(row.ROC), delayMonths);
  }

  if (txn.txnMod) {
    rocModificationFee = num(row.MOD);
  }

  // if only MOD selected and no NEW/RENEW
  if (!txn.txnNew && !txn.txnRenew && txn.txnMod) {
    rocRadioOperatorsCert = 0;
    rocSurcharges = 0;
  }

  return {
    rocFF: round2(rocFF),
    rocAF: round2(rocAF),
    rocSemFee: round2(rocSemFee),
    rocRadioOperatorsCert: round2(rocRadioOperatorsCert),
    rocSurcharges: round2(rocSurcharges),
    rocDST: round2(rocDST),
    rocModificationFee: round2(rocModificationFee),
    total: round2(
      rocFF + rocAF + rocSemFee + rocRadioOperatorsCert + rocSurcharges + rocModificationFee + rocDST
    ),
    kind: key,
  };
}