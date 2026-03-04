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

/**
 * Citizen Charter formulas implemented:
 * NEW:   TOTAL = FF + (PF/YR) + (IF/YR) + DST
 * RENEW: TOTAL = (PF/YR) + (IF/YR) + DST + SUR
 * MOD:   TOTAL = MOD + DST
 */
export function computeMobilePhone(
  particularsText: string,
  yearsRaw: any,
  flags: TxnFlags
): MobilePhoneComputed {
  const years = Math.max(0, Number(yearsRaw ?? 0) || 0);
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

  const txn: 'NEW' | 'RENEW' | 'MOD' =
    flags.isMod ? 'MOD' : flags.isRenew ? 'RENEW' : 'NEW';

  const surchargeMode = detectSurchargeMode(particularsText);

  const sur =
    surchargeMode === 'SUR100'
      ? row.sur100
      : surchargeMode === 'SUR50'
      ? row.sur50
      : 0;

  const safeYears = years > 0 ? years : 1; // avoid division by 0; Excel sheet typically assumes at least 1

  const pfPerYr = row.pf / safeYears;
  const ifPerYr = row.ifee / safeYears;

  let ff = 0,
    pf = 0,
    ifee = 0,
    mod = 0,
    dst = 0,
    total = 0;

  if (txn === 'NEW') {
    ff = row.ff;
    pf = pfPerYr;
    ifee = ifPerYr;
    mod = 0;
    dst = row.dst;
    total = ff + pf + ifee + dst;
  } else if (txn === 'RENEW') {
    ff = 0;
    pf = pfPerYr;
    ifee = ifPerYr;
    mod = 0;
    dst = row.dst;
    total = pf + ifee + dst + sur;
  } else {
    // MOD
    ff = 0;
    pf = 0;
    ifee = 0;
    mod = row.mod;
    dst = row.dst;
    total = mod + dst;
  }

  // keep 2 decimals like your periodYears precision
  const round2 = (n: number) => Number((Number(n || 0)).toFixed(2));

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
    sur: round2(sur),
    total: round2(total),
  };
}