// amateur.compute.ts

export type TxnFlags = { txnNew: boolean; txnRenew: boolean; txnMod: boolean };

// ✅ row shape (from your sheet)
export type AmateurRow = {
  Purchase: number;
  Possess: number;
  STF: number;
  FF: number;
  CPF: number;
  LF: number;
  ROC: number;
  MOD: number;
  DST: number;
  SUR50: number;
  SUR100: number;
  SP?: number; // Vanity/Special event
};

export type AmateurRates = {
  AT_ROC: AmateurRow;

  AT_RSL_A: AmateurRow;
  AT_RSL_B: AmateurRow;
  AT_RSL_C: AmateurRow;
  AT_RSL_D: AmateurRow;

  AT_LIFETIME: AmateurRow;

  AT_CLUB_SIMPLEX: AmateurRow;
  AT_CLUB_REPEATER: AmateurRow;

  SPECIAL_EVENT: AmateurRow;
  VANITY: AmateurRow;

  POSSESS_STORAGE: AmateurRow;
};

export type AmateurResult = {
  maRadioStationLicense: number; // LF + ROC
  maFilingFee: number;           // Purchase + Possess + STF + FF + CPF
  maSurcharges: number;          // MOD + SUR
  maDST: number;
  total: number;
  kind: string;
};

const num = (v: any): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const round2 = (n: number): number =>
  Math.round((num(n) + Number.EPSILON) * 100) / 100;

function parseUnits(particulars: string): number {
  const up = String(particulars ?? '').toUpperCase();
  const m1 = /UNITS?_([0-9]+)/.exec(up);
  if (m1?.[1]) return Math.max(1, Math.floor(Number(m1[1])));
  const m2 = /([0-9]+)\s*UNITS?/.exec(up);
  if (m2?.[1]) return Math.max(1, Math.floor(Number(m2[1])));
  return 1;
}

function wantsSUR100(particulars: string): boolean {
  const up = String(particulars ?? '').toUpperCase();
  return up.includes('SUR100') || up.includes('100%');
}

function pickSUR(row: AmateurRow, particulars: string): number {
  return wantsSUR100(particulars) ? num(row.SUR100) : num(row.SUR50);
}

function detectKey(particulars: string, cls: string): keyof AmateurRates {
  const P = String(particulars ?? '').toUpperCase();
  const C = String(cls ?? 'A').trim().toUpperCase();

  if (P.includes('VANITY')) return 'VANITY';
  if (P.includes('SPECIAL EVENT') || P.includes('SPECIAL-EVENT')) return 'SPECIAL_EVENT';

  if (P.includes('POSSESS') && (P.includes('STORAGE') || P.includes('STATION'))) return 'POSSESS_STORAGE';

  if (P.includes('AT-CLUB') || (P.includes('CLUB') && P.includes('RSL'))) {
    if (P.includes('REPEATER')) return 'AT_CLUB_REPEATER';
    return 'AT_CLUB_SIMPLEX';
  }

  if (P.includes('LIFETIME')) return 'AT_LIFETIME';
  if (P.includes('AT-ROC') || (P.includes('AT') && P.includes('ROC'))) return 'AT_ROC';

  // default AT-RSL class
  if (C === 'B') return 'AT_RSL_B';
  if (C === 'C') return 'AT_RSL_C';
  if (C === 'D') return 'AT_RSL_D';
  return 'AT_RSL_A';
}

// ✅ COMPUTE using Citizen Charter formulas
export function computeAmateur(
  particulars: string,
  cls: string,
  years: number,
  txn: TxnFlags,
  rates: AmateurRates
): AmateurResult {
  const yr = Math.max(1, Math.floor(num(years) || 1));
  const unit = parseUnits(particulars);
  const key = detectKey(particulars, cls);
  const row = rates[key];

  const P = String(particulars ?? '').toUpperCase();

  const isPermitPurchasePossess =
    P.includes('PERMIT TO PURCHASE') ||
    P.includes('PERMIT TO POSSESS') ||
    P.includes('PURCHASE/POSSESS') ||
    (P.includes('PURCHASE') && P.includes('POSSESS'));

  const isSTF = P.includes('STF') || P.includes('SELFTRANSFER') || P.includes('SELF TRANSFER');

  let purchase = 0;
  let possess = 0;
  let stf = 0;
  let ff = 0;
  let cpf = 0;
  let lf = 0;
  let roc = 0;
  let mod = 0;
  const dst = num(row.DST);
  let sur = 0;

  // A) AT-ROC: NEW (ROC*YR)+DST | RENEW add SUR | MOD = MOD + DST
  if (key === 'AT_ROC') {
    if (txn.txnMod) {
      mod = num(row.MOD);
    } else {
      roc = num(row.ROC) * yr;
      if (txn.txnRenew) sur = pickSUR(row, particulars);
    }
  }

  // AT-RSL class: Permit or STF or normal new/renew/mod
  else if (key.startsWith('AT_RSL_')) {
    if (isSTF) {
      stf = num(row.STF) * unit; // (STF*UNIT)+DST
    } else if (isPermitPurchasePossess) {
      purchase = num(row.Purchase) * unit;
      possess = num(row.Possess) * unit; // (PUR*UNIT)+(POS*UNIT)+DST
    } else {
      ff = num(row.FF);

      if (txn.txnMod) {
        mod = num(row.MOD); // FF + MOD + DST
      } else {
        lf = num(row.LF) * yr; // FF + (LF*YR) + DST
        if (txn.txnRenew) sur = pickSUR(row, particulars); // + SUR
      }
    }
  }

  // AT-LIFETIME: NEW LF + DST | MOD FF+MOD+DST | Permit (PUR+POS)+DST
  else if (key === 'AT_LIFETIME') {
    if (isPermitPurchasePossess) {
      purchase = num(row.Purchase) * unit;
      possess = num(row.Possess) * unit;
    } else if (txn.txnMod) {
      ff = num(row.FF);
      mod = num(row.MOD);
    } else {
      lf = num(row.LF); // lifetime single LF (no * yr)
    }
  }

  // AT-CLUB: NEW FF+CPF+(LF*YR)+DST | RENEW FF+(LF*YR)+DST+SUR | MOD FF+CPF+MOD+DST
  else if (key === 'AT_CLUB_SIMPLEX' || key === 'AT_CLUB_REPEATER') {
    ff = num(row.FF);

    if (txn.txnMod) {
      cpf = num(row.CPF);
      mod = num(row.MOD);
    } else {
      lf = num(row.LF) * yr;
      if (txn.txnNew) cpf = num(row.CPF);
      if (txn.txnRenew) sur = pickSUR(row, particulars);
    }
  }

  // Vanity (per year): (SP*YR)+DST
  else if (key === 'VANITY') {
    lf = num(row.SP) * yr;
  }

  // Special event (per event): SP + DST
  else if (key === 'SPECIAL_EVENT') {
    lf = num(row.SP);
  }

  // Possess/storage: (POS*UNIT)+DST
  else if (key === 'POSSESS_STORAGE') {
    possess = num(row.Possess) * unit;
  }

  const total = round2(purchase + possess + stf + ff + cpf + lf + roc + mod + dst + sur);

  return {
    maRadioStationLicense: round2(lf + roc),
    maFilingFee: round2(purchase + possess + stf + ff + cpf),
    maSurcharges: round2(mod + sur),
    maDST: round2(dst),
    total,
    kind: String(key),
  };
}