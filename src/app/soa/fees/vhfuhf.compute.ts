// fees/vhfuhf.compute.ts

export type VhfUhfBaseRadio =
  | 'Fixed'
  | 'FX/FB'
  | 'Mobile'
  | 'Porta Base'
  | 'Porta Mobile'
  | 'Portable'
  | 'Repeater';

export type VhfUhfPower =
  | 'High Powered (above 100W)'
  | 'Medium Powered (above 25W up to 100W)'
  | 'Low Powered (25W and below)';

export type VhfTxn = 'NEW' | 'RENEW' | 'MOD';

export type VhfUhfPicked = {
  baseRadio: VhfUhfBaseRadio;
  power: VhfUhfPower;
  txn?: VhfTxn; // ✅ new (optional for backward compatibility)
};

export type VhfUhfFees = {
  // base rates (per sheet row)
  purchase: number;           // PUR
  possess: number;            // POS
  filingFee: number;          // FF
  constructionPermit: number; // CPF / CP
  licenseFee: number;         // LF
  inspectionFee: number;      // IF
  supervisionFee: number;     // SUF
  registrationFee: number;    // REG (kept but not used in citizen charter formulas you posted)
  modificationFee: number;    // MOD
  dst: number;                // DST

  // computed surcharge based on LF portion
  surLf50: number;            // SUR-LF 50%
  surLf100: number;           // SUR-LF 100%

  // optional totals
  totalNoSurcharge: number;
};

export type VhfUhfComputed = VhfUhfFees & {
  ok: boolean;
  reason?: string;

  baseRadio?: VhfUhfBaseRadio;
  power?: VhfUhfPower;
  txn: VhfTxn;

  unit: number;    // UNIT
  chUnit: number;  // CH_UNIT
  years: number;   // YR

  // citizen charter fee result for the selected txn
  surchargeApplied: number;
  total: number;
};

type VhfUhfRow = VhfUhfFees & { baseRadio: VhfUhfBaseRadio };

// ✅ values copied from your screenshot table (row-by-row)
const ROWS: Record<VhfUhfBaseRadio, VhfUhfRow> = {
  Fixed: {
    baseRadio: 'Fixed',
    purchase: 120,
    possess: 96,
    filingFee: 180,
    constructionPermit: 240,
    licenseFee: 480,
    inspectionFee: 480,
    supervisionFee: 40,
    registrationFee: 2000,
    modificationFee: 180,
    dst: 30,
    surLf50: 240,
    surLf100: 480,
    totalNoSurcharge: 0,
  },
  'FX/FB': {
    baseRadio: 'FX/FB',
    purchase: 120,
    possess: 96,
    filingFee: 180,
    constructionPermit: 240,
    licenseFee: 1080,
    inspectionFee: 480,
    supervisionFee: 120,
    registrationFee: 2000,
    modificationFee: 180,
    dst: 30,
    surLf50: 540,
    surLf100: 1080,
    totalNoSurcharge: 0,
  },
  Mobile: {
    baseRadio: 'Mobile',
    purchase: 120,
    possess: 96,
    filingFee: 180,
    constructionPermit: 240,
    licenseFee: 360,
    inspectionFee: 240,
    supervisionFee: 8,
    registrationFee: 2000,
    modificationFee: 180,
    dst: 30,
    surLf50: 180,
    surLf100: 360,
    totalNoSurcharge: 0,
  },
  'Porta Base': {
    baseRadio: 'Porta Base',
    purchase: 96,
    possess: 60,
    filingFee: 180,
    constructionPermit: 240,
    licenseFee: 840,
    inspectionFee: 480,
    supervisionFee: 80,
    registrationFee: 1500,
    modificationFee: 180,
    dst: 30,
    surLf50: 420,
    surLf100: 840,
    totalNoSurcharge: 0,
  },
  'Porta Mobile': {
    baseRadio: 'Porta Mobile',
    purchase: 96,
    possess: 60,
    filingFee: 180,
    constructionPermit: 240,
    licenseFee: 600,
    inspectionFee: 240,
    supervisionFee: 16,
    registrationFee: 1500,
    modificationFee: 180,
    dst: 30,
    surLf50: 300,
    surLf100: 600,
    totalNoSurcharge: 0,
  },
  Portable: {
    baseRadio: 'Portable',
    purchase: 96,
    possess: 60,
    filingFee: 180,
    constructionPermit: 240,
    licenseFee: 240,
    inspectionFee: 240,
    supervisionFee: 8,
    registrationFee: 1500,
    modificationFee: 180,
    dst: 30,
    surLf50: 120,
    surLf100: 240,
    totalNoSurcharge: 0,
  },
  Repeater: {
    baseRadio: 'Repeater',
    purchase: 240,
    possess: 120,
    filingFee: 180,
    constructionPermit: 600,
    licenseFee: 1320,
    inspectionFee: 480,
    supervisionFee: 0, // blank in sheet → treat as 0
    registrationFee: 3000,
    modificationFee: 180,
    dst: 30,
    surLf50: 660,
    surLf100: 1320,
    totalNoSurcharge: 0,
  },
};

// ✅ power overrides section from your sheet
const POWER_OVERRIDE: Record<VhfUhfPower, { purchase: number; possess: number }> = {
  'High Powered (above 100W)': { purchase: 240, possess: 120 },
  'Medium Powered (above 25W up to 100W)': { purchase: 120, possess: 96 },
  'Low Powered (25W and below)': { purchase: 96, possess: 60 },
};

function up(v: any): string {
  return String(v ?? '').toUpperCase();
}

function round2(n: number): number {
  const x = Number(n ?? 0);
  return Math.round((x + Number.EPSILON) * 100) / 100;
}

export function parseTxnFromParticulars(particulars: string): VhfTxn {
  const t = up(particulars);
  if (t.includes('RENEW')) return 'RENEW';
  if (t.includes('MOD')) return 'MOD';
  return 'NEW';
}

export function parseVhfUhfFromParticulars(particulars: string): VhfUhfPicked | null {
  const t = up(particulars);

  // must be VHF/UHF
  if (!t.includes('VHF') && !t.includes('UHF')) return null;

  const base: VhfUhfBaseRadio | null =
    t.includes('FX/FB') ? 'FX/FB' :
    t.includes('PORTA BASE') ? 'Porta Base' :
    t.includes('PORTA MOBILE') ? 'Porta Mobile' :
    t.includes('PORTABLE') ? 'Portable' :
    t.includes('REPEATER') ? 'Repeater' :
    t.includes('MOBILE') ? 'Mobile' :
    t.includes('FIXED') ? 'Fixed' :
    null;

  const power: VhfUhfPower | null =
    t.includes('ABOVE 100W') ? 'High Powered (above 100W)' :
    (t.includes('UP TO 100W') || t.includes('ABOVE 25W')) ? 'Medium Powered (above 25W up to 100W)' :
    (t.includes('25W') && (t.includes('BELOW') || t.includes('AND BELOW'))) ? 'Low Powered (25W and below)' :
    null;

  if (!base || !power) return null;

  const txn = parseTxnFromParticulars(particulars);
  return { baseRadio: base, power, txn };
}

/**
 * ✅ Citizen Charter formulas (your screenshot):
 *
 * Purchase/Possess (RT, FC, FB, ML, PJ) / REN:
 *   FEE_PUR_POS = (FF)(UNIT) + (PUR)(UNIT) + (POS)(UNIT) + DST
 *
 * Radio Station License (NEW):
 *   FEE_RSL = (CPF)(UNIT) + (LF/CH_UNIT)(YR) + (IF/UNIT)(YR) + (SUF/CH_UNIT)(YR) + DST
 *
 * Radio Station License (RENEWAL):
 *   FEE_RSL = (LF/CH_UNIT)(YR) + (IF/UNIT)(YR) + (SUF/CH_UNIT)(YR) + DST + SUR
 *
 * Radio Station License (MODIFICATION):
 *   FEE_RSL = (FF)(UNIT) + (CPF)(UNIT) + (MOD)(UNIT) + DST
 *
 * Notes:
 * - UNIT, CH_UNIT, YR are inputs (default to 1 if missing)
 * - SUR is based on the LF portion (same basis as LF/CH_UNIT * YR)
 */
export function computeVhfUhfWithTxn(
  particularsText: string,
  txn: VhfTxn,
  years: number,
  unit: number,
  chUnit: number,
  surchargeMode: 'NONE' | 'SUR50' | 'SUR100'
): VhfUhfComputed | null {
  const picked = parseVhfUhfFromParticulars(particularsText);
  if (!picked) return null;

  const row = ROWS[picked.baseRadio];
  if (!row) return null;

  const YEARS = Math.max(1, Math.floor(Number(years || 1)));
  const UNIT = Math.max(1, Math.floor(Number(unit || 1)));
  const CH_UNIT = Math.max(1, Math.floor(Number(chUnit || 1)));

  // start from row values
  const out: VhfUhfFees = { ...row };

  // apply power override for Purchase/Possess (Repeater keeps its own)
  if (picked.baseRadio !== 'Repeater') {
    const ov = POWER_OVERRIDE[picked.power];
    out.purchase = ov.purchase;
    out.possess = ov.possess;
  }

  // compute surcharge based on LF portion (LF/CH_UNIT * YR)
  const lfPortion = (out.licenseFee / CH_UNIT) * YEARS;
  const sur =
    surchargeMode === 'SUR100' ? lfPortion * 1.0 :
    surchargeMode === 'SUR50' ? lfPortion * 0.5 :
    0;

  // keep also classic sur columns (per base LF only)
  out.surLf50 = Math.round(out.licenseFee * 0.5);
  out.surLf100 = Math.round(out.licenseFee * 1.0);

  // compute fee based on txn
  let total = 0;

  if (txn === 'NEW') {
    total =
      (out.constructionPermit * UNIT) +
      (out.licenseFee / CH_UNIT) * YEARS +
      (out.inspectionFee / UNIT) * YEARS +
      (out.supervisionFee / CH_UNIT) * YEARS +
      out.dst;
  } else if (txn === 'RENEW') {
    total =
      (out.licenseFee / CH_UNIT) * YEARS +
      (out.inspectionFee / UNIT) * YEARS +
      (out.supervisionFee / CH_UNIT) * YEARS +
      out.dst +
      sur;
  } else {
    // MOD
    total =
      (out.filingFee * UNIT) +
      (out.constructionPermit * UNIT) +
      (out.modificationFee * UNIT) +
      out.dst;
  }

  // Optional: keep old "totalNoSurcharge" for reference (raw sum)
  out.totalNoSurcharge =
    out.purchase +
    out.possess +
    out.filingFee +
    out.constructionPermit +
    out.licenseFee +
    out.inspectionFee +
    out.supervisionFee +
    out.registrationFee +
    out.modificationFee +
    out.dst;

  return {
    ok: true,
    baseRadio: picked.baseRadio,
    power: picked.power,
    txn,
    unit: UNIT,
    chUnit: CH_UNIT,
    years: YEARS,
    surchargeApplied: round2(sur),
    total: round2(total),
    ...Object.fromEntries(Object.entries(out).map(([k, v]) => [k, typeof v === 'number' ? round2(v) : v])) as any,
  };
}

/**
 * ✅ Backward compatible:
 * - If you still call computeVhfUhf(text) like before, it returns base table numbers.
 * - Defaults txn=NEW, years=1, unit=1, chUnit=1, surchargeMode=NONE.
 */
export function computeVhfUhf(particularsText: string): VhfUhfFees | null {
  const picked = parseVhfUhfFromParticulars(particularsText);
  if (!picked) return null;

  const row = ROWS[picked.baseRadio];
  const out: VhfUhfFees = { ...row };

  if (picked.baseRadio !== 'Repeater') {
    const ov = POWER_OVERRIDE[picked.power];
    out.purchase = ov.purchase;
    out.possess = ov.possess;
  }

  out.surLf50 = Math.round(out.licenseFee * 0.5);
  out.surLf100 = Math.round(out.licenseFee * 1.0);

  out.totalNoSurcharge =
    out.purchase +
    out.possess +
    out.filingFee +
    out.constructionPermit +
    out.licenseFee +
    out.inspectionFee +
    out.supervisionFee +
    out.registrationFee +
    out.modificationFee +
    out.dst;

  return {
    ...out,
    purchase: round2(out.purchase),
    possess: round2(out.possess),
    filingFee: round2(out.filingFee),
    constructionPermit: round2(out.constructionPermit),
    licenseFee: round2(out.licenseFee),
    inspectionFee: round2(out.inspectionFee),
    supervisionFee: round2(out.supervisionFee),
    registrationFee: round2(out.registrationFee),
    modificationFee: round2(out.modificationFee),
    dst: round2(out.dst),
    surLf50: round2(out.surLf50),
    surLf100: round2(out.surLf100),
    totalNoSurcharge: round2(out.totalNoSurcharge),
  };
}