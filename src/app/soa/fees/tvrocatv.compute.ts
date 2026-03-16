export type TvroCatvSubtype = 'TVRO' | 'CATV';
export type TvroCatvTxnFlags = {
  isNew: boolean;
  isRenew: boolean;
  isMod: boolean;
};

export type TvroCatvResult = {
  ok: boolean;

  reg: number;    // Registration Fee
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

// 1 day to 6 months = 50%; 6 months + 1 day to 12 months = 100%;
// thereafter +50% for every started 6 months.
const surchargeFromDelayMonths = (annualLF: number, delayMonths: number): number => {
  const lf = num(annualLF, 0);
  const months = Math.max(0, Math.floor(num(delayMonths, 0)));
  if (!lf || months <= 0) return 0;

  const blocksOfSixMonths = Math.ceil(months / 6);
  return round2(lf * (blocksOfSixMonths * 0.5));
};

export function computeTvroCatv(
  particularsText: string,
  years: number,
  txn: TvroCatvTxnFlags,
  _sur100: boolean,
  delayMonths: number = 0
): TvroCatvResult {
  const text = String(particularsText ?? '').toUpperCase();

  const isTVRO = text.includes('TVRO STATION LICENSE');
  const isCATV = text.includes('CATV STATION LICENSE');
  const hasRenew = !!txn.isRenew || /\bRENEW(AL)?\b/.test(text);
  const hasNew = (!!txn.isNew || /\bNEW\b/.test(text)) && !hasRenew;
  const hasMod = !!txn.isMod || /\bMOD(IFICATION)?\b/.test(text);

  if (!isTVRO && !isCATV) {
    return { ok: false, reg: 0, ff: 0, cpf: 0, lf: 0, ifee: 0, mod: 0, dst: 0, sur: 0 };
  }

  const YEARS = Math.max(1, Math.floor(num(years, 1)));

  // ===== RATES (from your sheet)
  // TVRO
  const TVRO_REG = 6500;
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
  let reg = 0;
  let ff = 0;
  let cpf = 0;
  let lf = 0;
  let ifee = 0;
  let mod = 0;
  let sur = 0;

  if (isTVRO) {
    if (!hasNew && !hasRenew && !hasMod) {
      return { ok: false, reg: 0, ff: 0, cpf: 0, lf: 0, ifee: 0, mod: 0, dst: 0, sur: 0 };
    }

    if (hasNew) {
      reg = TVRO_REG;
    }

    if (hasRenew) {
      lf += TVRO_LF * YEARS;
      sur += surchargeFromDelayMonths(TVRO_LF, delayMonths);
    }

    if (hasMod) {
      mod = TVRO_MOD;
    }

    const dst = hasNew || hasRenew || hasMod ? DST : 0;

    return {
      ok: true,
      reg: round2(reg),
      ff: 0,
      cpf: 0,
      lf: round2(lf),
      ifee: 0,
      mod: round2(mod),
      dst: round2(dst),
      sur: round2(sur),
    };
  }

  // CATV
  if (!hasNew && !hasRenew && !hasMod) {
    return { ok: false, reg: 0, ff: 0, cpf: 0, lf: 0, ifee: 0, mod: 0, dst: 0, sur: 0 };
  }

  if (hasNew) {
    ff = CATV_FF;
    cpf = CATV_CPF;
    lf += CATV_LF * YEARS;
    ifee += CATV_IF * YEARS;
  }

  if (hasRenew) {
    lf += CATV_LF * YEARS;
    ifee += CATV_IF * YEARS;
    sur += surchargeFromDelayMonths(CATV_LF, delayMonths);
  }

  if (hasMod) {
    mod = CATV_MOD;
  }

  const dst = hasNew || hasRenew || hasMod ? DST : 0;

  return {
    ok: true,
    reg: 0,
    ff: round2(ff),
    cpf: round2(cpf),
    lf: round2(lf),
    ifee: round2(ifee),
    mod: round2(mod),
    dst: round2(dst),
    sur: round2(sur),
  };
}
