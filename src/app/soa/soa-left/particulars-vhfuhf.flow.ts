import { MatDialog } from '@angular/material/dialog';
import {
  VhfUhfSubtypeDialogComponent,
  VhfUhfSubtypeResult,
} from './vhf-uhf-subtype-dialog.component';

import { TxnTypeDialogComponent, TxnType } from './txn-type-dialog.component';

// ✅ same signature style as your other flows
export function openVhfUhfParticularsFlow(
  dialog: MatDialog,
  cancel: () => void,
  finalize: (finalText: string, txn?: TxnType) => void
): void {
  const ref = dialog.open(VhfUhfSubtypeDialogComponent, {
    width: '520px',
    maxWidth: '92vw',
    disableClose: true,
    autoFocus: false,
    restoreFocus: false,
    panelClass: 'soa-dlg',
  });

  ref.afterClosed().subscribe((picked?: VhfUhfSubtypeResult) => {
    if (!picked) {
      cancel();
      return;
    }

    // base text from subtype
    const baseText = `VHF/UHF RADIO STATIONS - ${picked.baseRadio} - ${picked.power}`;

    // ✅ open txn type after subtype
    const refTxn = dialog.open(TxnTypeDialogComponent, {
      width: '420px',
      maxWidth: '92vw',
      disableClose: true,
      autoFocus: false,
      restoreFocus: false,
      panelClass: 'soa-dlg',
      data: {
        contextTitle: baseText,
        showPurchasePossess: true,
        showStandaloneUnits: true,
        showDuplicate: true,
      },
    });

    refTxn.afterClosed().subscribe((r: any) => {
      const selected: TxnType[] = Array.isArray(r?.value)
        ? (r.value as TxnType[])
        : r?.value
        ? [r.value as TxnType]
        : [];

      const primary: TxnType | undefined =
        (selected.includes('MOD') && 'MOD') ||
        (selected.includes('RENEW') && 'RENEW') ||
        (selected.includes('NEW') && 'NEW') ||
        undefined;

      const purchasePossess = !!r?.purchasePossess;
      const purchasePossessUnits = Math.max(1, Math.floor(Number(r?.purchasePossessUnits || 1)));
      const primaryUnits = Math.max(1, Math.floor(Number(r?.standaloneUnits || 1)));
      const hasDuplicate = selected.includes('DUPLICATE');

      if (!primary && !purchasePossess) {
        cancel();
        return;
      }

      const parts: string[] = [];
      if (primary) {
        const primaryText = primary === 'MOD' ? 'MODIFICATION' : primary;
        parts.push(`${primaryText} - UNITS_${primaryUnits}`);
      }
      if (purchasePossess) {
        parts.push(`PURCHASE/POSSESS - UNITS_${purchasePossessUnits}`);
      }
      if (hasDuplicate) parts.push('DUPLICATE');

      const finalText = `${baseText} - ${parts.join(' - ')}`;

      finalize(finalText, primary);
    });
  });
}
