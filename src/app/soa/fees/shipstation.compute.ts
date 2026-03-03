// shipstation.compute.ts  (ALL-IN-ONE)

export type TxnFlags = { txnNew: boolean; txnRenew: boolean; txnMod: boolean };

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
  CERT?: number; // deletion cert fee
};

export type ShipParse = {
  rowKey: string;
  withEquipment: boolean;
  units: number;
  sur100: boolean;
};

export type ShipResult = {
  PUR: number;
  FF: number;
  POS: number;
  CPF: number;
  LFIF: number;
  INS: number;
  MOD: number;
  SUR: number;
  DST: number;
  total: number;
};

export type PickedTxn = 'NEW' | 'RENEW' | 'MOD' | 'DUPLICATE';

export type ParsedShipText = {
  kind: 'SSL' | 'COASTAL_RT' | 'COASTAL_RP' | 'DEL';
  scope?: 'DOMESTIC' | 'INTERNATIONAL';
  power?: 'HIGH' | 'MEDIUM' | 'LOW';
  band?: 'HF' | 'VHF';
  txn?: PickedTxn;
};

// ---------------- helpers ----------------
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
    txnNew: txn === 'NEW' || txn === 'DUPLICATE',
    txnRenew: txn === 'RENEW',
    txnMod: txn === 'MOD',
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

// ---------------- PARSER ----------------
//
// Supported Particulars text formats (what your flow creates):
// 1) SHIP STATION LICENSE - DOMESTIC - HIGH POWERED - RENEW
// 2) SHIP STATION LICENSE - INTERNATIONAL - MEDIUM POWERED - NEW
// 3) COASTAL STATION LICENSE - RADIO TELEGRAPHY - MEDIUM POWERED - RENEW
// 4) COASTAL STATION LICENSE - RADIO TELEPHONY - HF - NEW
// 5) DELETION CERTIFICATE
//
export function parseParticularsText(text: string): ParsedShipText | null {
  const t = norm(text);
  if (!t) return null;

  if (t.includes('DELETION CERTIFICATE')) {
    return { kind: 'DEL' };
  }

  if (t.startsWith('SHIP STATION LICENSE')) {
    const scope: any = t.includes('INTERNATIONAL') ? 'INTERNATIONAL' : 'DOMESTIC';

    const power: any = t.includes('HIGH POWERED')
      ? 'HIGH'
      : t.includes('MEDIUM POWERED')
      ? 'MEDIUM'
      : t.includes('LOW POWERED')
      ? 'LOW'
      : null;

    const txn: any = t.includes('RENEW')
      ? 'RENEW'
      : t.includes('MODIFICATION') || t.includes('MOD')
      ? 'MOD'
      : t.includes('DUPLICATE')
      ? 'DUPLICATE'
      : t.includes('NEW')
      ? 'NEW'
      : null;

    if (!power || !txn) return null;
    return { kind: 'SSL', scope, power, txn };
  }

  if (t.startsWith('COASTAL STATION LICENSE')) {
    if (t.includes('RADIO TELEGRAPHY')) {
      const power: any = t.includes('HIGH POWERED')
        ? 'HIGH'
        : t.includes('MEDIUM POWERED')
        ? 'MEDIUM'
        : t.includes('LOW POWERED')
        ? 'LOW'
        : null;

      const txn: any = t.includes('RENEW')
        ? 'RENEW'
        : t.includes('MODIFICATION') || t.includes('MOD')
        ? 'MOD'
        : t.includes('DUPLICATE')
        ? 'DUPLICATE'
        : t.includes('NEW')
        ? 'NEW'
        : null;

      if (!power || !txn) return null;
      return { kind: 'COASTAL_RT', power, txn };
    }

    if (t.includes('RADIO TELEPHONY')) {
      const band: any = t.includes('VHF') ? 'VHF' : t.includes('HF') ? 'HF' : null;

      const txn: any = t.includes('RENEW')
        ? 'RENEW'
        : t.includes('MODIFICATION') || t.includes('MOD')
        ? 'MOD'
        : t.includes('DUPLICATE')
        ? 'DUPLICATE'
        : t.includes('NEW')
        ? 'NEW'
        : null;

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
    const pow = p.power === 'HIGH' ? 'HIGH' : p.power === 'MEDIUM' ? 'MED' : 'LOW';
    return `SSL-${scope}-${pow}`;
  }

  if (p.kind === 'COASTAL_RT') {
    const pow = p.power === 'HIGH' ? 'HIGH' : p.power === 'MEDIUM' ? 'MED' : 'LOW';
    return `PCS-RT-${pow}`;
  }

  // COASTAL_RP
  return `PCS-RP-${p.band}`;
}

// ---------------- COMPUTE ----------------
export function computeShipStation(
  ship: ShipParse,
  years: number,
  txn: TxnFlags,
  SHIP_STATION: Record<string, ShipStationRow>
): ShipResult {
  const row = SHIP_STATION[ship.rowKey] ?? SHIP_STATION['SSL-DOM-HIGH'];

  const units = Math.max(1, Math.floor(ship.units || 1));
  const withEquip = !!ship.withEquipment;
  const sur = ship.sur100 ? row.SUR100 : row.SUR50;

  const isDeletion = ship.rowKey === 'CERT-DEL';
  const isCoastal = ship.rowKey.startsWith('PCS-RT-') || ship.rowKey.startsWith('PCS-RP-');

  let FF = 0,
    PUR = 0,
    POS = 0,
    CPF = 0,
    LF = 0,
    IF = 0,
    MOD = 0,
    DST = row.DST,
    SUR = 0;

  // F. DELETION: FF + CERT + DST
  if (isDeletion) {
    FF = row.FF;
    PUR = num(row.CERT); // use PUR holder to carry CERT
  }
  // C. Private Coastal Station
  else if (isCoastal) {
    if (txn.txnMod) {
      FF = row.FF;
      CPF = row.CPF;
      MOD = row.MOD;
    } else if (txn.txnRenew) {
      LF = row.LF * years;
      IF = row.IF * years;
      SUR = sur;
    } else {
      CPF = row.CPF;
      LF = row.LF * years;
      IF = row.IF * years;
    }
  }
  // A/B. Ship Station License Domestic/International
  else {
    if (txn.txnMod) {
      FF = row.FF;
      CPF = row.CPF;
      MOD = row.MOD;
    } else if (txn.txnRenew) {
      LF = row.LF * years;
      IF = row.IF * years;
      SUR = sur;
    } else {
      CPF = row.CPF;
      LF = row.LF * years;
      IF = row.IF * years;

      // NEW + WITH EQUIPMENT adds per-unit fees
      if (withEquip) {
        FF = row.FF * units;
        PUR = row.Purchase * units;
        POS = row.Possess * units;
      }
    }
  }

  const total = round2(FF + PUR + POS + CPF + LF + IF + MOD + DST + SUR);

  return {
    PUR: round2(PUR),
    FF: round2(FF),
    POS: round2(POS),
    CPF: round2(CPF),
    LFIF: round2(LF + IF),
    INS: 0,
    MOD: round2(MOD),
    SUR: round2(SUR),
    DST: round2(DST),
    total,
  };
}

// ---------------- TABLE (FROM YOUR SCREENSHOT) ----------------
export const SHIP_STATION: Record<string, ShipStationRow> = {
  // Ships in Domestic Trade
  'SSL-DOM-HIGH': { FF: 180, Purchase: 240, Possess: 120, CPF: 720, LF: 840, IF: 720, MOD: 180, DST: 30, SUR50: 420, SUR100: 840 },
  'SSL-DOM-MED':  { FF: 180, Purchase: 120, Possess: 96,  CPF: 600, LF: 720, IF: 720, MOD: 180, DST: 30, SUR50: 360, SUR100: 720 },
  'SSL-DOM-LOW':  { FF: 180, Purchase: 96,  Possess: 60,  CPF: 480, LF: 600, IF: 720, MOD: 180, DST: 30, SUR50: 300, SUR100: 600 },

  // Ships in International Trade
  'SSL-INT-HIGH': { FF: 180, Purchase: 240, Possess: 120, CPF: 1200, LF: 1500, IF: 1200, MOD: 180, DST: 30, SUR50: 750, SUR100: 1500 },
  'SSL-INT-MED':  { FF: 180, Purchase: 120, Possess: 96,  CPF: 1200, LF: 1500, IF: 1200, MOD: 180, DST: 30, SUR50: 750, SUR100: 1500 },
  'SSL-INT-LOW':  { FF: 180, Purchase: 96,  Possess: 60,  CPF: 1200, LF: 1500, IF: 1200, MOD: 180, DST: 30, SUR50: 750, SUR100: 1500 },

  // SESCL/LRIT/SSAS/SESFB row (keep in case you later re-enable)
  'SSL-INT-SESCL': { FF: 180, Purchase: 360, Possess: 360, CPF: 1200, LF: 1440, IF: 1200, MOD: 180, DST: 30, SUR50: 720, SUR100: 1440 },

  // Private Coastal Station: Radio Telegraphy
  'PCS-RT-HIGH': { FF: 180, Purchase: 240, Possess: 120, CPF: 1320, LF: 1440, IF: 720, MOD: 180, DST: 30, SUR50: 720, SUR100: 1440 },
  'PCS-RT-MED':  { FF: 180, Purchase: 120, Possess: 96,  CPF: 960,  LF: 1200, IF: 720, MOD: 180, DST: 30, SUR50: 600, SUR100: 1200 },
  'PCS-RT-LOW':  { FF: 180, Purchase: 96,  Possess: 60,  CPF: 600,  LF: 1080, IF: 720, MOD: 180, DST: 30, SUR50: 540, SUR100: 1080 },

  // Private Coastal Station: Radio Telephony
  'PCS-RP-HF':  { FF: 180, Purchase: 120, Possess: 96, CPF: 480, LF: 720, IF: 720, MOD: 180, DST: 30, SUR50: 360, SUR100: 720 },
  'PCS-RP-VHF': { FF: 180, Purchase: 120, Possess: 96, CPF: 480, LF: 480, IF: 480, MOD: 180, DST: 30, SUR50: 240, SUR100: 480 },

  // Certificate Fees
  'CERT-DEL': { FF: 180, Purchase: 0, Possess: 0, CPF: 0, LF: 0, IF: 0, MOD: 0, DST: 30, SUR50: 0, SUR100: 0, CERT: 200 },
};