import { MatDialog } from '@angular/material/dialog';
import { TxnType, TxnTypeDialogComponent } from './txn-type-dialog.component';

import {
  MobilePhoneSubtype,
  MobilePhoneSubtypeDialogComponent,
} from './mobile-phone-subtype-dialog.component';

// ✅ returned by finalize(...)
export type MobilePhonePicked = {
  subtype: MobilePhoneSubtype;
  txns: TxnType[];
  duplicate?: boolean;
};

type PrimaryTxnType = Exclude<TxnType, 'DUPLICATE'>;
const PRIMARY_TXN_ORDER: PrimaryTxnType[] = ['NEW', 'RENEW', 'MOD'];

// labels must match your screenshot text
function mobileSubtypeLabel(s: MobilePhoneSubtype): string {
  switch (s) {
    case 'RCE_DEALER':
      return 'RCE Dealer';
    case 'RCE_MANUFACTURER':
      return 'RCE Manufacturer';
    case 'RCE_SERVICE_CENTER':
      return 'RCE Service Center';
    case 'CPE_NON_MOBILE':
      return 'CPE Non- Mobile Phones';
    case 'CPE_MOBILE':
      return 'CPE Mobile Phones';
    case 'MP_DEALER_MAIN':
      return 'MP Dealer(Main)';
    case 'MP_DEALER_BRANCH':
      return 'MP Dealer(Branch)';
    case 'RETAILER_RESELLER':
      return 'Retailer/Reseller';
    case 'SERVICE_CENTER':
      return 'Service Center';
  }
}

// ✅ you can adjust this text format anytime to match your exact particulars template
function buildParticularsText(p: MobilePhonePicked): string {
  const parts = [
    ...p.txns,
    ...(p.duplicate ? ['DUPLICATE'] : []),
  ];
  return `Mobile Phone Permits - ${mobileSubtypeLabel(p.subtype)} - ${parts.join(' - ')}`;
}

/**
 * Mobile Phone permits flow:
 * 1) pick subtype (tile buttons)
 * 2) pick transaction type (NEW/RENEW/MOD, with MOD combinable)
 * 3) finalize(finalText, txn)
 */
export function openMobilePhoneParticularsFlow(
  dialog: MatDialog,
  cancel: () => void,
  finalize: (finalText: string, txn?: TxnType) => void
): void {
  const ref1 = dialog.open(MobilePhoneSubtypeDialogComponent, {
    width: '460px',
    disableClose: true,
    autoFocus: false,
    restoreFocus: false,
  });

  ref1.afterClosed().subscribe((r1) => {
    if (!r1?.value) {
      cancel();
      return;
    }

    const subtype: MobilePhoneSubtype = r1.value;

    const ref2 = dialog.open(TxnTypeDialogComponent, {
      width: '460px',
      disableClose: true,
      autoFocus: false,
      restoreFocus: false,
      data: {
        contextTitle: mobileSubtypeLabel(subtype),
        showDuplicate: true,
      },
    });

    ref2.afterClosed().subscribe((r2) => {
      const selected: TxnType[] = Array.isArray(r2?.value)
        ? (r2.value as TxnType[])
        : r2?.value
        ? [r2.value as TxnType]
        : [];
      const primarySelected = selected.filter((t): t is PrimaryTxnType => t !== 'DUPLICATE');

      if (!selected.length) {
        cancel();
        return;
      }

      const txn: TxnType | undefined =
        primarySelected.length === 1 ? (primarySelected[0] as TxnType) : undefined;

      if (!primarySelected.length) {
        cancel();
        return;
      }

      const duplicate = selected.includes('DUPLICATE');
      const orderedPrimary: PrimaryTxnType[] = PRIMARY_TXN_ORDER.filter((t) =>
        primarySelected.includes(t)
      );

      const picked: MobilePhonePicked = { subtype, txns: orderedPrimary, duplicate };
      const finalText = buildParticularsText(picked);

      finalize(finalText, txn);
    });
  });
}
