export type TxnType = 'NEW' | 'RENEW' | 'MOD';

export type CoastalSubtype = 'CoastalStations' | 'HF';

export type CoastalOption =
  | 'HighPoweredAbove100W'
  | 'MediumPowered25To100W'
  | 'LowPowered25WBelow'
  | 'HFHighPowered100W'
  | 'HFMediumPowered25To100W'
  | 'HFLowPowered25WBelow'
  | 'VHF';

export type CoastalServiceType =
  | 'PURCHASE_POSSESS'
  | 'SELL_TRANSFER'
  | 'LICENSE';

export type CoastalRow = {
  key: CoastalOption;
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
  serviceType: CoastalServiceType;
};

export type CoastalSurchargeMode = 'NONE' | 'SUR50' | 'SUR100';

export type CoastalComputed = {
  parsed?: CoastalParsed;
  row?: CoastalRow;
  txn: TxnType;
  years: number;
  units: number;
  surchargeMode: CoastalSurchargeMode;

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

export const COASTAL_TABLE: Record<CoastalOption, CoastalRow> = {
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

export function parseCoastalParticulars(particulars: string): CoastalParsed | null {
  const t = String(particulars ?? '').toUpperCase();

  if (!t.includes('COASTAL')) return null;

  const hasPurchasePossess =
    t.includes('PURCHASE/POSSESS') ||
    (t.includes('PURCHASE') && t.includes('POSSESS'));

  const hasSellTransfer =
    t.includes('SELL/TRANSFER') ||
    (t.includes('SELL') && t.includes('TRANSFER'));

  let serviceType: CoastalServiceType = 'LICENSE';
  if (hasPurchasePossess) serviceType = 'PURCHASE_POSSESS';
  else if (hasSellTransfer) serviceType = 'SELL_TRANSFER';

  const isHF = t.includes('HIGH FREQUENCY') || /\bHF\b/.test(t);
  const subtype: CoastalSubtype = isHF ? 'HF' : 'CoastalStations';

  if (t.includes('VHF')) {
    return { subtype: 'HF', option: 'VHF', serviceType };
  }

  if (isHF) {
    if (t.includes('HIGH')) {
      return { subtype: 'HF', option: 'HFHighPowered100W', serviceType };
    }
    if (t.includes('MED')) {
      return { subtype: 'HF', option: 'HFMediumPowered25To100W', serviceType };
    }
    if (t.includes('LOW')) {
      return { subtype: 'HF', option: 'HFLowPowered25WBelow', serviceType };
    }
    return { subtype: 'HF', option: 'HFHighPowered100W', serviceType };
  }

  if (t.includes('HIGH')) {
    return { subtype: 'CoastalStations', option: 'HighPoweredAbove100W', serviceType };
  }
  if (t.includes('MED')) {
    return { subtype: 'CoastalStations', option: 'MediumPowered25To100W', serviceType };
  }
  if (t.includes('LOW')) {
    return { subtype: 'CoastalStations', option: 'LowPowered25WBelow', serviceType };
  }

  return { subtype: 'CoastalStations', option: 'MediumPowered25To100W', serviceType };
}

export function computeCoastal(
  particulars: string,
  txn: TxnType,
  years: number,
  surchargeMode: CoastalSurchargeMode = 'NONE',
  units: number = 1,
  delayMonths: number = 0
): CoastalComputed {
  const parsed = parseCoastalParticulars(particulars);
  const row = parsed ? COASTAL_TABLE[parsed.option] : undefined;

  const y = Math.max(1, safeNum(years));
  const u = Math.max(1, Math.floor(safeNum(units)));

  let ff = 0;
  let purchase = 0;
  let possess = 0;
  let cp = 0;
  let lf = 0;
  let ifee = 0;
  let mod = 0;
  let dst = 0;
  let surcharge = 0;
  let total = 0;

  if (row && parsed) {
    if (parsed.serviceType === 'PURCHASE_POSSESS') {
      ff = row.ff;
      purchase = row.purchase * u;
      possess = row.possess * u;
      dst = row.dst;
      total = ff + purchase + possess + dst;
    } else if (parsed.serviceType === 'SELL_TRANSFER') {
      purchase = row.purchase * u; // STF placeholder
      dst = row.dst;
      total = purchase + dst;
    } else {
      if (txn === 'NEW') {
        cp = row.cp;
        lf = row.lf * y;
        ifee = row.ifee * y;
        dst = row.dst;
        total = cp + lf + ifee + dst;
      } else if (txn === 'RENEW') {
        lf = row.lf * y;
        ifee = row.ifee * y;
        dst = row.dst;
        surcharge = delayMonths > 0
          ? computeCoastalRenewalSurcharge(lf, delayMonths)
          : surchargeMode === 'SUR100'
          ? row.sur100
          : surchargeMode === 'SUR50'
          ? row.sur50
          : 0;
        total = lf + ifee + dst + surcharge;
      } else {
        ff = row.ff;
        cp = row.cp;
        mod = row.mod;
        dst = row.dst;
        total = ff + cp + mod + dst;
      }
    }
  }

  return {
    parsed: parsed ?? undefined,
    row,
    txn,
    years: y,
    units: u,
    surchargeMode,
    ff: round2(ff),
    purchase: round2(purchase),
    possess: round2(possess),
    cp: round2(cp),
    lf: round2(lf),
    ifee: round2(ifee),
    mod: round2(mod),
    dst: round2(dst),
    surcharge: round2(surcharge),
    total: round2(total),
  };
}

export function computeCoastalRenewalSurcharge(
  lfTotal: number,
  delayMonths: number
): number {
  const lf = safeNum(lfTotal);
  const months = Math.max(0, Math.floor(safeNum(delayMonths)));
  if (months <= 0) return 0;

  // 1-6 months: 50%, 7-12 months: 100%, then +50% for every started 6 months
  const blocksOfSixMonths = Math.ceil(months / 6);
  return round2(lf * (blocksOfSixMonths * 0.5));
}

function safeNum(v: any): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function round2(n: number): number {
  return Number((Number(n ?? 0)).toFixed(2));
}
