export type TxnType = 'NEW' | 'RENEW' | 'MOD';

export type CoastalSubtype = 'CoastalStations' | 'HF';

export type CoastalOption =
  // Coastal Stations
  | 'HighPoweredAbove100W'
  | 'MediumPowered25To100W'
  | 'LowPowered25WBelow'
  // HF
  | 'HFHighPowered100W'
  | 'HFMediumPowered25To100W'
  | 'HFLowPowered25WBelow'
  | 'VHF';

export type CoastalRow = {
  key: CoastalOption;

  // table columns
  ff: number;
  purchase: number;
  possess: number;
  cp: number;
  lf: number;
  ifee: number;
  mod: number;
  dst: number;
  sur50: number;
  sur100: number;
};

export type CoastalParsed = {
  subtype: CoastalSubtype;
  option: CoastalOption;
};

export type CoastalSurchargeMode = 'NONE' | 'SUR50' | 'SUR100';

export type CoastalComputed = {
  // resolved
  parsed?: CoastalParsed;
  row?: CoastalRow;

  // inputs
  txn: TxnType;
  years: number; // can be decimal (your form uses 2 decimals)
  surchargeMode: CoastalSurchargeMode;

  // computed breakdown
  ff: number;
  purchase: number;
  possess: number;
  cp: number;
  lf: number;
  ifee: number;
  mod: number;
  dst: number;
  surcharge: number;

  total: number;
};

// ======================================================
// ✅ TABLE VALUES (from your screenshot)
// ======================================================
export const COASTAL_TABLE: Record<CoastalOption, CoastalRow> = {
  // COASTAL STATIONS
  HighPoweredAbove100W: {
    key: 'HighPoweredAbove100W',
    ff: 180,
    purchase: 240,
    possess: 120,
    cp: 1200,
    lf: 2160,
    ifee: 840,
    mod: 180,
    dst: 30,
    sur50: 1080,
    sur100: 2160,
  },
  MediumPowered25To100W: {
    key: 'MediumPowered25To100W',
    ff: 180,
    purchase: 120,
    possess: 96,
    cp: 840,
    lf: 1680,
    ifee: 840,
    mod: 180,
    dst: 30,
    sur50: 840,
    sur100: 1680,
  },
  LowPowered25WBelow: {
    key: 'LowPowered25WBelow',
    ff: 180,
    purchase: 96,
    possess: 60,
    cp: 480,
    lf: 1200,
    ifee: 840,
    mod: 180,
    dst: 30,
    sur50: 600,
    sur100: 1200,
  },

  // HIGH FREQUENCY (HF)
  HFHighPowered100W: {
    key: 'HFHighPowered100W',
    ff: 180,
    purchase: 240,
    possess: 120,
    cp: 480,
    lf: 1560,
    ifee: 840,
    mod: 180,
    dst: 30,
    sur50: 780,
    sur100: 1560,
  },
  HFMediumPowered25To100W: {
    key: 'HFMediumPowered25To100W',
    ff: 180,
    purchase: 240,
    possess: 120,
    cp: 480,
    lf: 1080,
    ifee: 720,
    mod: 180,
    dst: 30,
    sur50: 540,
    sur100: 1080,
  },
  HFLowPowered25WBelow: {
    key: 'HFLowPowered25WBelow',
    ff: 180,
    purchase: 120,
    possess: 96,
    cp: 480,
    lf: 480,
    ifee: 720,
    mod: 180,
    dst: 30,
    sur50: 240,
    sur100: 480,
  },
  VHF: {
    key: 'VHF',
    ff: 180,
    purchase: 96,
    possess: 60,
    cp: 480,
    lf: 1200,
    ifee: 480,
    mod: 180,
    dst: 30,
    sur50: 600,
    sur100: 1200,
  },
};

// ======================================================
// ✅ PARSER (reads your particulars string)
// Works with text like:
// "COASTAL STATION LICENSE - Coastal Stations - High Powered (above 100W)"
// "COASTAL STATION LICENSE - HIGH FREQUENCY (HF) - VHF"
// ======================================================
export function parseCoastalParticulars(particulars: string): CoastalParsed | null {
  const t = String(particulars ?? '').toUpperCase();

  if (!t.includes('COASTAL')) return null;

  const isTelephony = t.includes('RADIO TELEPHONY') || t.includes('TELEPHONY');
  const isTelegraphy = t.includes('RADIO TELEGRAPHY') || t.includes('TELEGRAPHY');
  const isHF = t.includes('HIGH FREQUENCY') || /\bHF\b/.test(t) || (isTelephony && t.includes('HF'));
  const subtype: CoastalSubtype = isHF ? 'HF' : 'CoastalStations';

  // Band first
  if (t.includes('VHF')) return { subtype: 'HF', option: 'VHF' };
  if (isTelephony && isHF && t.includes('HF')) return { subtype: 'HF', option: 'HFHighPowered100W' };

  // Telegraphy power detection (no wattage required)
  if (isTelegraphy || !isTelephony) {
    if (t.includes('HIGH')) return { subtype: 'CoastalStations', option: 'HighPoweredAbove100W' };
    if (t.includes('MED')) return { subtype: 'CoastalStations', option: 'MediumPowered25To100W' };
    if (t.includes('LOW')) return { subtype: 'CoastalStations', option: 'LowPowered25WBelow' };
  }

  // Telephony fallback: default HF if no VHF
  if (isTelephony) return { subtype: 'HF', option: 'HFHighPowered100W' };

  // Ultimate fallback: medium coastal
  return { subtype: 'CoastalStations', option: 'MediumPowered25To100W' };
}

// ======================================================
// ✅ COMPUTE
// TXN rules (based on your Citizen Charter column):
// - NEW  : CP + (LF * years) + (IF * years) + DST
// - RENEW: (LF * years) + (IF * years) + DST + SUR
// - MOD  : FF + CP + MOD + DST
//
// NOTE: Years can be decimal. If you want strict integer years,
// round it before calling this compute.
// ======================================================
export function computeCoastal(
  particulars: string,
  txn: TxnType,
  years: number,
  surchargeMode: CoastalSurchargeMode = 'NONE'
): CoastalComputed {
  const parsed = parseCoastalParticulars(particulars);
  const row = parsed ? COASTAL_TABLE[parsed.option] : undefined;

  const y = safeNum(years);

  // defaults
  let ff = 0, purchase = 0, possess = 0, cp = 0, lf = 0, ifee = 0, mod = 0, dst = 0, surcharge = 0;

  if (row) {
    // raw table values (per unit / per yr depending)
    ff = row.ff;
    purchase = row.purchase;
    possess = row.possess;
    cp = row.cp;
    lf = row.lf;
    ifee = row.ifee;
    mod = row.mod;
    dst = row.dst;

    if (txn === 'RENEW') {
      if (surchargeMode === 'SUR50') surcharge = row.sur50;
      if (surchargeMode === 'SUR100') surcharge = row.sur100;
    }
  }

  // computed totals per txn
  let total = 0;

  if (txn === 'NEW') {
    total = cp + (lf * y) + (ifee * y) + dst;
  } else if (txn === 'RENEW') {
    total = (lf * y) + (ifee * y) + dst + surcharge;
  } else if (txn === 'MOD') {
    total = ff + cp + mod + dst;
  } else {
    total = 0;
  }

  return {
    parsed: parsed ?? undefined,
    row,
    txn,
    years: y,
    surchargeMode,

    ff,
    purchase,
    possess,
    cp,
    lf,
    ifee,
    mod,
    dst,
    surcharge,

    total: round2(total),
  };
}

function safeNum(v: any): number {
  const n = Number(v ?? 0);
  return isFinite(n) ? n : 0;
}

function round2(n: number): number {
  return Number((Number(n ?? 0)).toFixed(2));
}
