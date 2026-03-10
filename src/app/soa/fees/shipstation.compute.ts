// shipstation.compute.ts

export type PickedTxn =
  | 'NEW'
  | 'RENEW'
  | 'MOD'
  | 'DUPLICATE'
  | 'PURCHASE_POSSESS';

export type TxnFlags = {
  txnNew: boolean;
  txnRenew: boolean;
  txnMod: boolean;
  txnDuplicate: boolean;
  txnPurchasePossess: boolean;
};

export type ShipStationRow = {
  FF: number;
  Purchase: number;
  Possess: number;
  CPF: number;
  LF: number;
  IF: number;
  MOD: number;
  DST: number;
  SUR50: number;
  SUR100: number;
  CERT?: number;
};

export type ShipParse = {
  rowKey: string;
  withEquipment: boolean;
  units: number;
  sur100: boolean;
};

export type ShipResult = {
  FF: number;
  Purchase: number;
  Possess: number;
  CPF: number;
  LF: number;
  IF: number;
  MOD: number;
  DST: number;
  SUR: number;
  CERT: number;
  total: number;

  // backward compatibility
  PUR: number;
  POS: number;
  LFIF: number;
  INS: number;
};

export type ParsedShipText = {
  kind: 'SSL' | 'COASTAL_RT' | 'COASTAL_RP' | 'DEL';
  scope?: 'DOMESTIC' | 'INTERNATIONAL';
  power?: 'HIGH' | 'MEDIUM' | 'LOW' | 'SESCL';
  band?: 'HF' | 'VHF';
  txn?: PickedTxn;
};

const num = (v: any): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const round2 = (n: number): number =>
  Math.round((num(n) + Number.EPSILON) * 100) / 100;

const norm = (s: any) =>
  String(s ?? '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .replace(/\s*-\s*/g, ' - ')
    .trim();

export function txnFlagsFromTxn(txn: PickedTxn): TxnFlags {
  return {
    txnNew: txn === 'NEW',
    txnRenew: txn === 'RENEW',
    txnMod: txn === 'MOD',
    txnDuplicate: txn === 'DUPLICATE',
    txnPurchasePossess: txn === 'PURCHASE_POSSESS',
  };
}

export function buildShipParse(
  rowKey: string,
  withEquipment: boolean,
  units: number,
  sur100: boolean
): ShipParse {
  return {
    rowKey,
    withEquipment: !!withEquipment,
    units: Math.max(1, Math.floor(num(units) || 1)),
    sur100: !!sur100,
  };
}

// ----------------------------------------------------
// PARSER
// ----------------------------------------------------
export function parseParticularsText(text: string): ParsedShipText | null {
  const t = norm(text);
  if (!t) return null;

  if (t.includes('DELETION CERTIFICATE')) {
    return { kind: 'DEL' };
  }

  const txn: PickedTxn | null =
    t.includes('PURCHASE') && t.includes('POSSESS')
      ? 'PURCHASE_POSSESS'
      : t.includes('RENEW')
      ? 'RENEW'
      : t.includes('MODIFICATION') || t.includes('MOD')
      ? 'MOD'
      : t.includes('DUPLICATE')
      ? 'DUPLICATE'
      : t.includes('NEW')
      ? 'NEW'
      : null;

  if (t.startsWith('SHIP STATION LICENSE')) {
    const scope: 'DOMESTIC' | 'INTERNATIONAL' =
      t.includes('INTERNATIONAL') ? 'INTERNATIONAL' : 'DOMESTIC';

    const power: 'HIGH' | 'MEDIUM' | 'LOW' | 'SESCL' | null =
      t.includes('SESCL/LRIT/SSAS/SESFB')
        ? 'SESCL'
        : t.includes('HIGH POWERED')
        ? 'HIGH'
        : t.includes('MEDIUM POWERED')
        ? 'MEDIUM'
        : t.includes('LOW POWERED')
        ? 'LOW'
        : null;

    if (!power || !txn) return null;

    return { kind: 'SSL', scope, power, txn };
  }

  if (t.startsWith('COASTAL STATION LICENSE')) {
    if (t.includes('RADIO TELEGRAPHY')) {
      const power: 'HIGH' | 'MEDIUM' | 'LOW' | null =
        t.includes('HIGH POWERED')
          ? 'HIGH'
          : t.includes('MEDIUM POWERED')
          ? 'MEDIUM'
          : t.includes('LOW POWERED')
          ? 'LOW'
          : null;

      if (!power || !txn) return null;

      return { kind: 'COASTAL_RT', power, txn };
    }

    if (t.includes('RADIO TELEPHONY')) {
      const band: 'HF' | 'VHF' | null =
        t.includes('VHF') ? 'VHF' : t.includes('HF') ? 'HF' : null;

      if (!band || !txn) return null;

      return { kind: 'COASTAL_RP', band, txn };
    }
  }

  return null;
}

export function rowKeyFromParsed(p: ParsedShipText): string {
  if (p.kind === 'DEL') return 'CERT-DEL';

  if (p.kind === 'SSL') {
    const scope = p.scope === 'INTERNATIONAL' ? 'INT' : 'DOM';

    if (p.power === 'SESCL') {
      return 'SSL-INT-SESCL';
    }

    const pow =
      p.power === 'HIGH'
        ? 'HIGH'
        : p.power === 'MEDIUM'
        ? 'MED'
        : 'LOW';

    return `SSL-${scope}-${pow}`;
  }

  if (p.kind === 'COASTAL_RT') {
    const pow =
      p.power === 'HIGH'
        ? 'HIGH'
        : p.power === 'MEDIUM'
        ? 'MED'
        : 'LOW';
    return `PCS-RT-${pow}`;
  }

  return `PCS-RP-${p.band}`;
}

// ----------------------------------------------------
// SURCHARGE BY DELAY
// Note:
// 1 day to 6 months after expiration     = 50% of LF
// 6 months + 1 day to 12 months          = 100% of LF
// thereafter, additional 50% every 6 mos
// ----------------------------------------------------
export function getSurchargeFromDelay(lfTotal: number, delayMonths: number): number {
  const months = Math.max(0, Math.floor(num(delayMonths)));
  if (months <= 0) return 0;

  const blocksOfSixMonths = Math.ceil(months / 6);
  return round2(lfTotal * (blocksOfSixMonths * 0.5));
}

// ----------------------------------------------------
// COMPUTE
// A.1 / C.1 Purchase-Possess only
//   = FF(unit) + Purchase(unit) + Possess(unit) + DST
//
// A.2 / C.2 New without equipment
//   = CPF + LF(years) + IF(years) + DST
//
// A.3 / B.2 New with equipment
//   = FF(unit) + Purchase(unit) + Possess(unit) + CPF + LF(years) + IF(years) + DST
//
// A.4 / B.1 / C.3 Renew
//   = LF(years) + IF(years) + DST + SUR
//
// A.5 / C.4 Mod
//   = FF + CPF + MOD + DST
//
// F. Deletion
//   = FF + CERT + DST
//
// DUPLICATE
//   = FF + MOD + DST
// ----------------------------------------------------
export function computeShipStation(
  ship: ShipParse,
  years: number,
  txn: TxnFlags,
  SHIP_STATION: Record<string, ShipStationRow>,
  delayMonths: number = 0
): ShipResult {
  const row =
    SHIP_STATION[ship.rowKey] ??
    (ship.rowKey === 'SSL-INT-SESCL'
      ? SHIP_STATION['SSL-INT-SESCL']
      : SHIP_STATION['SSL-DOM-HIGH']);

  const units = Math.max(1, Math.floor(num(ship.units) || 1));
  const validYears = Math.max(1, Math.floor(num(years) || 1));
  const withEquip = !!ship.withEquipment;

  let FF = 0;
  let Purchase = 0;
  let Possess = 0;
  let CPF = 0;
  let LF = 0;
  let IF = 0;
  let MOD = 0;
  let DST = num(row.DST);
  let SUR = 0;
  let CERT = 0;

  const isDeletion = ship.rowKey === 'CERT-DEL';

  if (isDeletion) {
    FF = num(row.FF);
    CERT = num(row.CERT);
  } else if (txn.txnPurchasePossess) {
    FF = num(row.FF) * units;
    Purchase = num(row.Purchase) * units;
    Possess = num(row.Possess) * units;
  } else if (txn.txnMod) {
    FF = num(row.FF);
    CPF = num(row.CPF);
    MOD = num(row.MOD);
  } else if (txn.txnRenew) {
    LF = num(row.LF) * validYears;
    IF = num(row.IF) * validYears;
    SUR = getSurchargeFromDelay(LF, delayMonths);
  } else if (txn.txnDuplicate) {
    FF = num(row.FF);
    MOD = num(row.MOD);
  } else if (txn.txnNew) {
    CPF = num(row.CPF);
    LF = num(row.LF) * validYears;
    IF = num(row.IF) * validYears;

    if (withEquip) {
      FF = num(row.FF) * units;
      Purchase = num(row.Purchase) * units;
      Possess = num(row.Possess) * units;
    }
  }

  const total = round2(
    FF + Purchase + Possess + CPF + LF + IF + MOD + DST + SUR + CERT
  );

  return {
    FF: round2(FF),
    Purchase: round2(Purchase),
    Possess: round2(Possess),
    CPF: round2(CPF),
    LF: round2(LF),
    IF: round2(IF),
    MOD: round2(MOD),
    DST: round2(DST),
    SUR: round2(SUR),
    CERT: round2(CERT),
    total: round2(total),

    // backward compatibility
    PUR: round2(Purchase),
    POS: round2(Possess),
    LFIF: round2(LF + IF),
    INS: round2(IF),
  };
}

// ----------------------------------------------------
// RATE TABLE
// ----------------------------------------------------
export const SHIP_STATION: Record<string, ShipStationRow> = {
  // Ships in Domestic Trade
  'SSL-DOM-HIGH': {
    FF: 180,
    Purchase: 240,
    Possess: 120,
    CPF: 720,
    LF: 840,
    IF: 720,
    MOD: 180,
    DST: 30,
    SUR50: 420,
    SUR100: 840,
  },
  'SSL-DOM-MED': {
    FF: 180,
    Purchase: 120,
    Possess: 96,
    CPF: 600,
    LF: 720,
    IF: 720,
    MOD: 180,
    DST: 30,
    SUR50: 360,
    SUR100: 720,
  },
  'SSL-DOM-LOW': {
    FF: 180,
    Purchase: 96,
    Possess: 60,
    CPF: 480,
    LF: 600,
    IF: 720,
    MOD: 180,
    DST: 30,
    SUR50: 300,
    SUR100: 600,
  },

  // Ships in International Trade
  'SSL-INT-HIGH': {
    FF: 180,
    Purchase: 240,
    Possess: 120,
    CPF: 1200,
    LF: 1500,
    IF: 1200,
    MOD: 180,
    DST: 30,
    SUR50: 750,
    SUR100: 1500,
  },
  'SSL-INT-MED': {
    FF: 180,
    Purchase: 120,
    Possess: 96,
    CPF: 1200,
    LF: 1500,
    IF: 1200,
    MOD: 180,
    DST: 30,
    SUR50: 750,
    SUR100: 1500,
  },
  'SSL-INT-LOW': {
    FF: 180,
    Purchase: 96,
    Possess: 60,
    CPF: 1200,
    LF: 1500,
    IF: 1200,
    MOD: 180,
    DST: 30,
    SUR50: 750,
    SUR100: 1500,
  },

  // International SESCL / LRIT / SSAS / SESFB
  'SSL-INT-SESCL': {
    FF: 180,
    Purchase: 360,
    Possess: 360,
    CPF: 1200,
    LF: 1440,
    IF: 1200,
    MOD: 180,
    DST: 30,
    SUR50: 720,
    SUR100: 1440,
  },

  // Private Coastal Station: Radio Telegraphy
  'PCS-RT-HIGH': {
    FF: 180,
    Purchase: 240,
    Possess: 120,
    CPF: 1320,
    LF: 1440,
    IF: 720,
    MOD: 180,
    DST: 30,
    SUR50: 720,
    SUR100: 1440,
  },
  'PCS-RT-MED': {
    FF: 180,
    Purchase: 120,
    Possess: 96,
    CPF: 960,
    LF: 1200,
    IF: 720,
    MOD: 180,
    DST: 30,
    SUR50: 600,
    SUR100: 1200,
  },
  'PCS-RT-LOW': {
    FF: 180,
    Purchase: 96,
    Possess: 60,
    CPF: 600,
    LF: 1080,
    IF: 720,
    MOD: 180,
    DST: 30,
    SUR50: 540,
    SUR100: 1080,
  },

  // Private Coastal Station: Radio Telephony
  'PCS-RP-HF': {
    FF: 180,
    Purchase: 120,
    Possess: 96,
    CPF: 480,
    LF: 720,
    IF: 720,
    MOD: 180,
    DST: 30,
    SUR50: 360,
    SUR100: 720,
  },
  'PCS-RP-VHF': {
    FF: 180,
    Purchase: 120,
    Possess: 96,
    CPF: 480,
    LF: 480,
    IF: 480,
    MOD: 180,
    DST: 30,
    SUR50: 240,
    SUR100: 480,
  },

  // Certificate Fees
  'CERT-DEL': {
    FF: 180,
    Purchase: 0,
    Possess: 0,
    CPF: 0,
    LF: 0,
    IF: 0,
    MOD: 0,
    DST: 30,
    SUR50: 0,
    SUR100: 0,
    CERT: 200,
  },
};