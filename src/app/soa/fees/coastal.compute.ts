export type TxnType = 'NEW' | 'RENEW' | 'MOD';

export type CoastalSubtype =
  | 'PublicCoastalStations'
  | 'PublicHF'
  | 'PrivateTelegraphy'
  | 'PrivateTelephony';

export type CoastalOption =
  | 'PUBLIC_COASTAL_HIGH'
  | 'PUBLIC_COASTAL_MED'
  | 'PUBLIC_COASTAL_LOW'
  | 'PUBLIC_HF_HIGH'
  | 'PUBLIC_HF_MED'
  | 'PUBLIC_HF_LOW'
  | 'PUBLIC_HF_VHF'
  | 'PRIVATE_RT_HIGH'
  | 'PRIVATE_RT_MED'
  | 'PRIVATE_RT_LOW'
  | 'PRIVATE_RP_HF'
  | 'PRIVATE_RP_VHF';

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
  stf: number;
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
  PUBLIC_COASTAL_HIGH: {
    key: 'PUBLIC_COASTAL_HIGH',
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
  PUBLIC_COASTAL_MED: {
    key: 'PUBLIC_COASTAL_MED',
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
  PUBLIC_COASTAL_LOW: {
    key: 'PUBLIC_COASTAL_LOW',
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

  PUBLIC_HF_HIGH: {
    key: 'PUBLIC_HF_HIGH',
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
  PUBLIC_HF_MED: {
    key: 'PUBLIC_HF_MED',
    ff: 180,
    purchase: 120,
    possess: 96,
    cp: 480,
    lf: 1080,
    ifee: 720,
    mod: 180,
    dst: 30,
    sur50: 540,
    sur100: 1080,
  },
  PUBLIC_HF_LOW: {
    key: 'PUBLIC_HF_LOW',
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
  PUBLIC_HF_VHF: {
    key: 'PUBLIC_HF_VHF',
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

  PRIVATE_RT_HIGH: {
    key: 'PRIVATE_RT_HIGH',
    ff: 180,
    purchase: 240,
    possess: 120,
    cp: 1320,
    lf: 1440,
    ifee: 720,
    mod: 180,
    dst: 30,
    sur50: 720,
    sur100: 1440,
  },
  PRIVATE_RT_MED: {
    key: 'PRIVATE_RT_MED',
    ff: 180,
    purchase: 120,
    possess: 96,
    cp: 960,
    lf: 1200,
    ifee: 720,
    mod: 180,
    dst: 30,
    sur50: 600,
    sur100: 1200,
  },
  PRIVATE_RT_LOW: {
    key: 'PRIVATE_RT_LOW',
    ff: 180,
    purchase: 96,
    possess: 60,
    cp: 600,
    lf: 1080,
    ifee: 720,
    mod: 180,
    dst: 30,
    sur50: 540,
    sur100: 1080,
  },
  PRIVATE_RP_HF: {
    key: 'PRIVATE_RP_HF',
    ff: 180,
    purchase: 120,
    possess: 96,
    cp: 480,
    lf: 720,
    ifee: 720,
    mod: 180,
    dst: 30,
    sur50: 360,
    sur100: 720,
  },
  PRIVATE_RP_VHF: {
    key: 'PRIVATE_RP_VHF',
    ff: 180,
    purchase: 120,
    possess: 96,
    cp: 480,
    lf: 480,
    ifee: 480,
    mod: 180,
    dst: 30,
    sur50: 240,
    sur100: 480,
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

  const isPrivateTelegraphy = t.includes('RADIO TELEGRAPHY');
  const isPrivateTelephony = t.includes('RADIO TELEPHONY');
  const isPublicHF = t.includes('HIGH FREQUENCY') || /\bHF\b/.test(t);
  const hasHighPowered =
    t.includes('HIGH POWERED') ||
    t.includes('ABOVE 100W') ||
    t.includes('(100W)');
  const hasMediumPowered =
    t.includes('MEDIUM POWERED') ||
    t.includes('25W UP TO 100W') ||
    t.includes('ABOVE 25W');
  const hasLowPowered =
    t.includes('LOW POWERED') ||
    t.includes('25W BELOW') ||
    t.includes('25W AND BELOW');

  if (isPrivateTelegraphy) {
    if (hasMediumPowered) {
      return { subtype: 'PrivateTelegraphy', option: 'PRIVATE_RT_MED', serviceType };
    }
    if (hasLowPowered) {
      return { subtype: 'PrivateTelegraphy', option: 'PRIVATE_RT_LOW', serviceType };
    }
    return { subtype: 'PrivateTelegraphy', option: 'PRIVATE_RT_HIGH', serviceType };
  }

  if (isPrivateTelephony) {
    if (t.includes('VHF')) {
      return { subtype: 'PrivateTelephony', option: 'PRIVATE_RP_VHF', serviceType };
    }
    return { subtype: 'PrivateTelephony', option: 'PRIVATE_RP_HF', serviceType };
  }

  if (isPublicHF) {
    if (t.includes('VHF')) {
      return { subtype: 'PublicHF', option: 'PUBLIC_HF_VHF', serviceType };
    }
    if (hasMediumPowered) {
      return { subtype: 'PublicHF', option: 'PUBLIC_HF_MED', serviceType };
    }
    if (hasLowPowered) {
      return { subtype: 'PublicHF', option: 'PUBLIC_HF_LOW', serviceType };
    }
    return { subtype: 'PublicHF', option: 'PUBLIC_HF_HIGH', serviceType };
  }

  if (hasMediumPowered) {
    return { subtype: 'PublicCoastalStations', option: 'PUBLIC_COASTAL_MED', serviceType };
  }
  if (hasLowPowered) {
    return { subtype: 'PublicCoastalStations', option: 'PUBLIC_COASTAL_LOW', serviceType };
  }
  if (hasHighPowered) {
    return { subtype: 'PublicCoastalStations', option: 'PUBLIC_COASTAL_HIGH', serviceType };
  }

  return { subtype: 'PublicCoastalStations', option: 'PUBLIC_COASTAL_MED', serviceType };
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
  let stf = 0;
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
      ff = row.ff * u;
      purchase = row.purchase * u;
      possess = row.possess * u;
      dst = row.dst;
      total = ff + purchase + possess + dst;
    } else if (parsed.serviceType === 'SELL_TRANSFER') {
      // Citizen Charter A.4: STF(UNIT) + DST
      stf = 50 * u;
      dst = row.dst;
      total = stf + dst;
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
    stf: round2(stf),
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
