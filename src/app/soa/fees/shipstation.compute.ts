// src/app/.../soa-fees/compute/shipstation.compute.ts

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
  CERT?: number;
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

const num = (v: any): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const round2 = (n: number): number =>
  Math.round((num(n) + Number.EPSILON) * 100) / 100;

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

  const isEarth = ship.rowKey === 'SSL-INT-EARTH';
  const isCoastal = ship.rowKey.startsWith('PCS-RT-') || ship.rowKey.startsWith('PCS-RP-');
  const isDeletion = ship.rowKey === 'CERT-DEL';

  let FF = 0, PUR = 0, POS = 0, CPF = 0, LF = 0, IF = 0, MOD = 0, DST = row.DST, SUR = 0;

  // F. DELETION: FF + CERT + DST
  if (isDeletion) {
    FF = row.FF;
    PUR = num(row.CERT); // CERT stored here
  }
  // B. Ship Earth Station: ONLY RENEW / MOD
  else if (isEarth) {
    if (txn.txnMod) {
      FF  = row.FF * units;
      PUR = row.Purchase * units;
      POS = row.Possess * units;
      CPF = row.CPF;
      MOD = row.MOD;
    } else {
      LF = row.LF * years;
      IF = row.IF * years;
      SUR = sur;
    }
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
  // A. Ship Station License Domestic/International
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
        FF  = row.FF * units;
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
    total
  };
}