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

type RocTxn = 'NEW' | 'RENEW' | 'MOD';

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

function getEffectiveRocTxn(txn: TxnFlags): RocTxn {
  // ROC charter formulas are per transaction type.
  // If multiple flags are true, keep one effective txn to avoid blended formulas.
  if (txn.txnMod) return 'MOD';
  if (txn.txnRenew) return 'RENEW';
  return 'NEW';
}

function getRocCertCountFromParticulars(particulars: string): number {
  const up = normalize(particulars);

  const pats = [
    /\bNO\._\s*([0-9]+)\b/,
    /\bNO\.?\s*(?:OF\s*)?(?:CERT(?:IFICATE)?S?)?\s*[:=]?\s*([0-9]+)\b/,
    /\bQTY\s*[:=]?\s*([0-9]+)\b/,
  ];

  for (const pat of pats) {
    const m = up.match(pat);
    if (!m?.[1]) continue;
    const n = Math.floor(num(m[1]));
    if (n >= 1) return n;
  }

  return 1;
}

export function computeROC(
  particulars: string,
  years: number,
  txn: TxnFlags,
  delayMonths: number = 0
): RocResult {
  const key = getRocOperatorKeyFromParticulars(particulars);
  const row = getRocOperatorRowFromParticulars(particulars);
  const effectiveTxn = getEffectiveRocTxn(txn);
  const certCount = getRocCertCountFromParticulars(particulars);
  const yr = Math.max(1, Math.floor(num(years) || 1));

  let rocFF = 0;
  let rocAF = 0;
  let rocSemFee = 0;
  let rocRadioOperatorsCert = 0;
  let rocSurcharges = 0;
  let rocModificationFee = 0;
  let rocDST = num(row.DST);

  if (effectiveTxn === 'MOD') {
    // G. Modification of any certificate = MOD + DST
    rocModificationFee = num(row.MOD);
  } else if (effectiveTxn === 'RENEW') {
    // Renewal: ROC(YR) + DST + SUR
    if (key === 'TEMP-FOREIGN') {
      // Temporary ROC for Foreign Pilot is fixed as ROC + DST.
      rocRadioOperatorsCert = num(row.ROC);
      rocSurcharges = 0;
    } else {
      rocRadioOperatorsCert = num(row.ROC) * yr;
      rocSurcharges = computeRocRenewalSurcharge(num(row.ROC), delayMonths);
    }
  } else if (key === 'TEMP-FOREIGN') {
    // C. Temporary ROC for Foreign Pilot = ROC + DST
    rocRadioOperatorsCert = num(row.ROC);
  } else if (key === 'SROP') {
    // D.1 SROP (NEW) = AF + SEM + ROC(YR) + DST
    rocAF = num(row.AF);
    rocSemFee = num(row.SEM);
    rocRadioOperatorsCert = num(row.ROC) * yr;
  } else if (key === 'GROC' || key === 'RROC-RLM') {
    // E.1/F.1 (NEW) = FF + AF + ROC(YR) + DST
    rocFF = num(row.FF);
    rocAF = num(row.AF);
    rocRadioOperatorsCert = num(row.ROC) * yr;
  } else {
    // A.1/B.1 Commercial/RROC-Aircraft (NEW) = ROC(YR) + DST
    rocRadioOperatorsCert = num(row.ROC) * yr;
  }

  // Optional group multiplier: e.g. "NO. 5", "NO OF CERT 5", or "QTY 5"
  // Multiplies all fee components, including DST and surcharge.
  rocFF *= certCount;
  rocAF *= certCount;
  rocSemFee *= certCount;
  rocRadioOperatorsCert *= certCount;
  rocSurcharges *= certCount;
  rocModificationFee *= certCount;
  rocDST *= certCount;

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
    kind: certCount > 1 ? `${key}_X${certCount}` : key,
  };
}
