// vhfuhf.compute.ts

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

export type VhfUhfPicked = {
  baseRadio: VhfUhfBaseRadio;
  power: VhfUhfPower;
};

export type VhfUhfFees = {
  purchase: number;
  possess: number;
  filingFee: number;          // FF
  constructionPermit: number; // CP
  licenseFee: number;         // LF
  inspectionFee: number;      // IF
  supervisionFee: number;     // SUF
  registrationFee: number;    // Reg
  modificationFee: number;    // MOD
  dst: number;                // DST
  surLf50: number;            // SUR-LF (50%)
  surLf100: number;           // SUR-LF (100%)
  totalNoSurcharge: number;   // sum excluding surcharge columns
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

export function parseVhfUhfFromParticulars(particulars: string): VhfUhfPicked | null {
  const t = String(particulars ?? '').toUpperCase();

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
    (t.includes('25W') && t.includes('BELOW')) ? 'Low Powered (25W and below)' :
    null;

  if (!base || !power) return null;
  return { baseRadio: base, power };
}

export function computeVhfUhf(particularsText: string): VhfUhfFees | null {
  const picked = parseVhfUhfFromParticulars(particularsText);
  if (!picked) return null;

  const row = ROWS[picked.baseRadio];
  const out: VhfUhfFees = { ...row };

  // ✅ apply power override for Purchase/Possess
  // (Repeater already has its own purchase/possess, keep it)
  if (picked.baseRadio !== 'Repeater') {
    const ov = POWER_OVERRIDE[picked.power];
    out.purchase = ov.purchase;
    out.possess = ov.possess;
  }

  // ✅ make surcharge always derived from LF (even if your sheet already has it)
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

  return out;
}