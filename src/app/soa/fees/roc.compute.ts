// src/app/.../soa-fees/compute/roc.compute.ts

export type TxnFlags = { txnNew: boolean; txnRenew: boolean; txnMod: boolean };

export type RocOperatorRow = {
  ROC: number;
  DST: number;
  SUR50: number;
  SUR100: number;
};

export type RocResult = {
  rocRadioStationLicense: number;
  rocSurcharges: number;
  rocDST: number;
};

const num = (v: any): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export function getRocOperatorRowFromParticulars(
  particulars: string,
  ROC_OPERATOR: Record<string, RocOperatorRow>,
  ROC_DEFAULT: RocOperatorRow
): RocOperatorRow {
  const cleaned = String(particulars ?? '').toUpperCase().replace(/\s+/g, ' ').trim();
  const m = /(1RTG|2RTG|3RTG|1PHN|2PHN|3PHN)/.exec(cleaned);

  if (m?.[1] && ROC_OPERATOR[m[1]]) return ROC_OPERATOR[m[1]];
  if (cleaned.includes('RROC-AIRCRAFT') || cleaned.includes('AIRCRAFT')) return ROC_OPERATOR['RROC-AIRCRAFT'];
  if (cleaned.includes('RROC-RLM') || cleaned.includes('RLM')) return ROC_OPERATOR['RROC-RLM'];
  if (cleaned.includes('SROP')) return ROC_OPERATOR['SROP'];
  if (cleaned.includes('GROC')) return ROC_OPERATOR['GROC'];

  return ROC_DEFAULT;
}

export function computeROC(
  particulars: string,
  years: number,
  txn: TxnFlags,
  ROC_OPERATOR: Record<string, RocOperatorRow>,
  ROC_DEFAULT: RocOperatorRow,
  ROC_MOD_FEE: number
): RocResult {
  const op = getRocOperatorRowFromParticulars(particulars, ROC_OPERATOR, ROC_DEFAULT);

  let rocRadioStationLicense = 0;
  let rocSurcharges = 0;
  let rocDST = 0;

  if (txn.txnMod) {
    rocSurcharges = ROC_MOD_FEE;
    rocDST = num(op.DST);
    return { rocRadioStationLicense, rocSurcharges, rocDST };
  }

  if (txn.txnRenew) {
    rocRadioStationLicense = num(op.ROC) * years;
    rocDST = num(op.DST);

    rocSurcharges = num(op.SUR50);
    const up = String(particulars ?? '').toUpperCase();
    if (up.includes('SUR100') || up.includes('100%')) rocSurcharges = num(op.SUR100);

    return { rocRadioStationLicense, rocSurcharges, rocDST };
  }

  // NEW
  rocRadioStationLicense = num(op.ROC) * years;
  rocDST = num(op.DST);

  return { rocRadioStationLicense, rocSurcharges, rocDST };
}