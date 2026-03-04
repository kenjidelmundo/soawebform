import { MatDialog } from '@angular/material/dialog';
import { TxnType, TxnTypeDialogComponent } from './txn-type-dialog.component';

import {
  MobilePhoneSubtype,
  MobilePhoneSubtypeDialogComponent,
} from './mobile-phone-subtype-dialog.component';

// ✅ returned by finalize(...)
export type MobilePhonePicked = {
  subtype: MobilePhoneSubtype;
  txn: TxnType;
};

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
  // example output:
  // "Mobile Phone Permits - MP Dealer(Main) - NEW"
  return `Mobile Phone Permits - ${mobileSubtypeLabel(p.subtype)} - ${p.txn}`;
}

/**
 * Mobile Phone permits flow:
 * 1) pick subtype (tile buttons)
 * 2) pick transaction type (NEW/RENEW/MOD)
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
    });

    ref2.afterClosed().subscribe((r2) => {
      if (!r2?.value) {
        cancel();
        return;
      }

      const txn: TxnType = r2.value;

      const picked: MobilePhonePicked = { subtype, txn };
      const finalText = buildParticularsText(picked);

      finalize(finalText, txn);
    });
  });
}