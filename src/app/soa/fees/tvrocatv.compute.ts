export type TvroCatvTxn = 'NEW' | 'RENEW' | 'MOD';
export type TvroCatvSubtype = 'TVRO' | 'CATV';

export type TvroCatvResult = {
  ok: boolean;

  ff: number;     // Filing Fee
  cpf: number;    // Construction Permit Fee
  lf: number;     // License Fee (total for years)
  ifee: number;   // Inspection Fee (total for years)
  mod: number;    // Modification
  dst: number;    // DST
  sur: number;    // Surcharge (based on annual LF)
};

const num = (v: any, fb = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
};

const round2 = (n: any) => Math.round((num(n) + Number.EPSILON) * 100) / 100;

// surcharge based on ANNUAL LF only (not multiplied by years)
const surchargeFromAnnualLF = (annualLF: number, sur100: boolean): number => {
  const lf = num(annualLF, 0);
  if (!lf) return 0;
  return round2(sur100 ? lf * 1.0 : lf * 0.5);
};

export function computeTvroCatv(
  particularsText: string,
  years: number,
  txn: TvroCatvTxn,
  sur100: boolean
): TvroCatvResult {
  const text = String(particularsText ?? '').toUpperCase();

  const isTVRO = text.includes('TVRO STATION LICENSE');
  const isCATV = text.includes('CATV STATION LICENSE');

  if (!isTVRO && !isCATV) {
    return { ok: false, ff: 0, cpf: 0, lf: 0, ifee: 0, mod: 0, dst: 0, sur: 0 };
  }

  const YEARS = Math.max(1, Math.floor(num(years, 1)));

  // ===== RATES (from your sheet)
  // TVRO
  const TVRO_LF = 2600;
  const TVRO_MOD = 180;
  const DST = 30;

  // CATV
  const CATV_FF = 400;
  const CATV_CPF = 1140;
  const CATV_LF = 3600;
  const CATV_IF = 720;
  const CATV_MOD = 180;

  // defaults
  let ff = 0;
  let cpf = 0;
  let lf = 0;
  let ifee = 0;
  let mod = 0;
  let sur = 0;

  if (isTVRO) {
    if (txn === 'MOD') {
      mod = TVRO_MOD;
      // MOD + DST
      return { ok: true, ff: 0, cpf: 0, lf: 0, ifee: 0, mod: round2(mod), dst: DST, sur: 0 };
    }

    // LF/YR * years + DST
    lf = TVRO_LF * YEARS;

    // renew adds surcharge (based on annual LF only)
    if (txn === 'RENEW') {
      sur = surchargeFromAnnualLF(TVRO_LF, sur100);
    }

    return { ok: true, ff: 0, cpf: 0, lf: round2(lf), ifee: 0, mod: 0, dst: DST, sur: round2(sur) };
  }

  // CATV
  if (txn === 'MOD') {
    mod = CATV_MOD;
    return { ok: true, ff: 0, cpf: 0, lf: 0, ifee: 0, mod: round2(mod), dst: DST, sur: 0 };
  }

  lf = CATV_LF * YEARS;
  ifee = CATV_IF * YEARS;

  if (txn === 'NEW') {
    ff = CATV_FF;
    cpf = CATV_CPF;
    // FF + CPF + LF/YR*years + IF/YR*years + DST
    return {
      ok: true,
      ff: round2(ff),
      cpf: round2(cpf),
      lf: round2(lf),
      ifee: round2(ifee),
      mod: 0,
      dst: DST,
      sur: 0,
    };
  }

  // RENEW: (LF/YR*years) + (IF/YR*years) + DST + SUR
  sur = surchargeFromAnnualLF(CATV_LF, sur100);

  return {
    ok: true,
    ff: 0,
    cpf: 0,
    lf: round2(lf),
    ifee: round2(ifee),
    mod: 0,
    dst: DST,
    sur: round2(sur),
  };
}