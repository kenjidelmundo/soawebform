// fees/mobilephone.compute.ts

export type MobilePhoneSubtypeKey =
  | 'RCE_DEALER'
  | 'RCE_MANUFACTURER'
  | 'RCE_SERVICE_CENTER'
  | 'CPE_NON_MOBILE'
  | 'CPE_MOBILE'  
  | 'MP_DEALER_MAIN'
  | 'MP_DEALER_BRANCH'
  | 'RETAILER_RESELLER'
  | 'SERVICE_CENTER';

export type MobilePhoneRow = {
  key: MobilePhoneSubtypeKey;
  label: string;

  ff: number;     // Filing Fee
  pf: number;     // Permit Fee
  ifee: number;   // Inspection Fee
  mod: number;    // Modification
  dst: number;    // DST
  sur50: number;  // Surcharge (50%)
  sur100: number; // Surcharge (100%)
};

export type TxnFlags = {
  isNew: boolean;
  isRenew: boolean;
  isMod: boolean;
};

export type MobilePhoneComputed = {
  ok: boolean;
  reason?: string;

  key?: MobilePhoneSubtypeKey;
  label?: string;

  years: number;
  txn: 'NEW' | 'RENEW' | 'MOD';
  surchargeMode: 'NONE' | 'SUR50' | 'SUR100';

  // breakdown (already computed amounts)
  ff: number;
  pf: number;
  ifee: number;
  mod: number;
  dst: number;
  sur: number;

  total: number;
};

export const MOBILE_PHONE_ROWS: MobilePhoneRow[] = [
  { key: 'RCE_DEALER',        label: 'RCE Dealer',               ff: 180, pf: 1200, ifee: 720,  mod: 120, dst: 30, sur50: 600,  sur100: 1200 },
  { key: 'RCE_MANUFACTURER',  label: 'RCE Manufacturer',         ff: 180, pf: 1760, ifee: 720,  mod: 120, dst: 30, sur50: 880,  sur100: 1760 },
  { key: 'RCE_SERVICE_CENTER',label: 'RCE Service Center',       ff: 180, pf: 720,  ifee: 720,  mod: 120, dst: 30, sur50: 360,  sur100: 720  },

  { key: 'CPE_NON_MOBILE',    label: 'CPE Non- Mobile Phones',   ff: 180, pf: 1200, ifee: 720,  mod: 120, dst: 30, sur50: 600,  sur100: 1200 },
  { key: 'CPE_MOBILE',        label: 'CPE Mobile Phones',        ff: 500, pf: 2500, ifee: 1500, mod: 120, dst: 30, sur50: 1250, sur100: 2500 },

  { key: 'MP_DEALER_MAIN',    label: 'MP Dealer(Main)',          ff: 500, pf: 2500, ifee: 1500, mod: 120, dst: 30, sur50: 1250, sur100: 2500 },
  { key: 'MP_DEALER_BRANCH',  label: 'MP Dealer(Branch)',        ff: 500, pf: 1500, ifee: 1500, mod: 120, dst: 30, sur50: 750,  sur100: 1500 },

  { key: 'RETAILER_RESELLER', label: 'Retailer/Reseller',        ff: 500, pf: 1500, ifee: 1500, mod: 120, dst: 30, sur50: 750,  sur100: 1500 },

  { key: 'SERVICE_CENTER',    label: 'Service Center',           ff: 180, pf: 1200, ifee: 720,  mod: 120, dst: 30, sur50: 600,  sur100: 1200 },
];

const ROW_BY_KEY = new Map<MobilePhoneSubtypeKey, MobilePhoneRow>(
  MOBILE_PHONE_ROWS.map((r) => [r.key, r])
);

function toUpperText(v: any): string {
  return String(v ?? '').toUpperCase().trim();
}

function num(v: any, fallback = 0): number {
  const n = Number(v ?? fallback);
  return Number.isFinite(n) ? n : fallback;
}

function round2(n: number): number {
  return Number((Number(n || 0)).toFixed(2));
}

export function detectSurchargeMode(particularsText: string): 'NONE' | 'SUR50' | 'SUR100' {
  const t = toUpperText(particularsText);

  if (t.includes('SUR100') || t.includes('SUR(100') || t.includes('100%')) return 'SUR100';
  if (t.includes('SUR50') || t.includes('SUR(50') || t.includes('50%')) return 'SUR50';

  return 'NONE';
}

export function detectMobilePhoneSubtype(particularsText: string): MobilePhoneSubtypeKey | null {
  const t = toUpperText(particularsText);

  // strongest matches first
  if (t.includes('RCE DEALER')) return 'RCE_DEALER';
  if (t.includes('RCE MANUFACTURER')) return 'RCE_MANUFACTURER';

  // "Service Center" exists in two rows; disambiguate by presence of RCE
  if (t.includes('RCE SERVICE CENTER')) return 'RCE_SERVICE_CENTER';

  if (t.includes('CPE NON') || t.includes('NON- MOBILE') || t.includes('NON MOBILE')) return 'CPE_NON_MOBILE';
  if (t.includes('CPE MOBILE')) return 'CPE_MOBILE';

  if (t.includes('MP DEALER') && t.includes('MAIN')) return 'MP_DEALER_MAIN';
  if (t.includes('MP DEALER') && t.includes('BRANCH')) return 'MP_DEALER_BRANCH';

  if (t.includes('RETAILER/RESELLER') || t.includes('RETAILER') || t.includes('RESELLER'))
    return 'RETAILER_RESELLER';

  // generic service center fallback
  if (t.includes('SERVICE CENTER')) {
    // if it mentions RCE anywhere, treat as RCE service center
    if (t.includes('RCE')) return 'RCE_SERVICE_CENTER';
    return 'SERVICE_CENTER';
  }

  return null;
}

export function computeMobilePhoneRenewalSurcharge(
  permitFeeBase: number,
  delayMonthsRaw: any
): number {
  const base = Math.max(0, num(permitFeeBase, 0));
  const months = Math.max(0, Math.floor(num(delayMonthsRaw, 0)));

  if (months <= 0) return 0;

  const blocksOfSixMonths = Math.ceil(months / 6);
  return round2(base * (blocksOfSixMonths * 0.5));
}

/**
 * Citizen Charter formulas implemented:
 * NEW:   TOTAL = FF + (PF * YR) + (IF * YR) + DST
 * RENEW: TOTAL = (PF * YR) + (IF * YR) + DST + SUR
 * MOD:   TOTAL = MOD + DST
 */
export function computeMobilePhone(
  particularsText: string,
  yearsRaw: any,
  flags: TxnFlags,
  delayMonthsRaw: any = 0
): MobilePhoneComputed {
  const years = Math.max(0, num(yearsRaw, 0));
  const delayMonths = Math.max(0, Math.floor(num(delayMonthsRaw, 0)));
  const text = toUpperText(particularsText);
  const key = detectMobilePhoneSubtype(particularsText);

  if (!key) {
    return { ok: false, reason: 'No Mobile Phone subtype detected', years, txn: 'NEW', surchargeMode: 'NONE',
      ff: 0, pf: 0, ifee: 0, mod: 0, dst: 0, sur: 0, total: 0 };
  }

  const row = ROW_BY_KEY.get(key);
  if (!row) {
    return { ok: false, reason: 'Subtype not mapped in table', years, txn: 'NEW', surchargeMode: 'NONE',
      ff: 0, pf: 0, ifee: 0, mod: 0, dst: 0, sur: 0, total: 0 };
  }

  const hasRenew = !!flags.isRenew || /\bRENEW(AL)?\b/.test(text);
  const hasNew = (!!flags.isNew || /\bNEW\b/.test(text)) && !hasRenew;
  const hasMod = !!flags.isMod || /\bMOD(IFICATION)?\b/.test(text);

  const txn: 'NEW' | 'RENEW' | 'MOD' =
    hasMod ? 'MOD' : hasRenew ? 'RENEW' : 'NEW';

  const explicitSurchargeMode = detectSurchargeMode(particularsText);
  const surchargeMode: 'NONE' | 'SUR50' | 'SUR100' =
    delayMonths > 0
      ? (delayMonths <= 6 ? 'SUR50' : 'SUR100')
      : explicitSurchargeMode;

  const sur = delayMonths > 0
    ? computeMobilePhoneRenewalSurcharge(row.pf, delayMonths)
    : surchargeMode === 'SUR100'
    ? row.sur100
    : surchargeMode === 'SUR50'
    ? row.sur50
    : 0;

  const safeYears = years > 0 ? years : 1;

  const pfTotal = row.pf * safeYears;
  const ifTotal = row.ifee * safeYears;

  let ff = 0;
  let pf = 0;
  let ifee = 0;
  let mod = 0;
  let dst = 0;

  if (hasNew) {
    ff += row.ff;
    pf += pfTotal;
    ifee += ifTotal;
  }

  if (hasRenew) {
    pf += pfTotal;
    ifee += ifTotal;
  }

  if (hasMod) {
    mod += row.mod;
  }

  if (hasNew || hasRenew || hasMod) {
    dst = row.dst;
  }

  const total = ff + pf + ifee + mod + dst + (hasRenew ? sur : 0);

  return {
    ok: true,
    key,
    label: row.label,
    years,
    txn,
    surchargeMode,
    ff: round2(ff),
    pf: round2(pf),
    ifee: round2(ifee),
    mod: round2(mod),
    dst: round2(dst),
    sur: round2(hasRenew ? sur : 0),
    total: round2(total),
  };
}
