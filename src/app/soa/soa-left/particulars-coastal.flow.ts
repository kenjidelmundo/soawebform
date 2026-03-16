import { MatDialog } from '@angular/material/dialog';
import { TxnType } from './txn-type-dialog.component';

import {
  CoastalTelegraphyOptionsDialogComponent,
  CoastalTelegraphyOptionsResult,
  CoastalPower,
  CoastalService,
  ShipTxn,
} from './coastal-telegraphy-options-dialog.component';

export function openCoastalParticularsFlow(
  dialog: MatDialog,
  cancel: () => void,
  finalize: (finalText: string, txn?: TxnType) => void
): void {
  const ref = dialog.open(CoastalTelegraphyOptionsDialogComponent, {
    width: '840px',
    maxWidth: '94vw',
    panelClass: 'soa-dlg',
    disableClose: true,
    autoFocus: false,
    restoreFocus: false,
  });

  ref.afterClosed().subscribe((ro: CoastalTelegraphyOptionsResult | undefined) => {
    if (!ro?.txn || !ro?.power || !ro?.service) {
      cancel();
      return;
    }

    const txnList = Array.isArray(ro.txn) ? ro.txn as ShipTxn[] : [ro.txn as ShipTxn];
    const power = ro.power as CoastalPower;
    const service = ro.service as CoastalService;
    const purchasePossess = !!ro.purchasePossess;
    const purchaseUnits = Math.max(1, Math.floor(Number(ro.purchaseUnits || 1)));
    const sellTransfer = !!ro.sellTransfer;
    const sellTransferUnits = Math.max(1, Math.floor(Number(ro.sellTransferUnits || 1)));
    const hasDuplicate = !!ro.duplicate;

    const primary: ShipTxn =
      (txnList.includes('RENEW') && 'RENEW') ||
      (txnList.includes('NEW') && 'NEW') ||
      txnList[0];
    const hasMod = txnList.includes('MOD');

    const txnText = [primary, hasMod ? 'MODIFICATION' : null]
      .filter(Boolean)
      .map(t => (t === 'MOD' ? 'MODIFICATION' : t))
      .join(' - ');

    const powerText =
      service === 'RADIO_TELEGRAPHY'
        ? power === 'HIGH_POWERED'
          ? 'HIGH POWERED'
          : power === 'MEDIUM_POWERED'
          ? 'MEDIUM POWERED'
          : 'LOW POWERED'
        : power;

    const serviceText = service === 'RADIO_TELEGRAPHY' ? 'RADIO TELEGRAPHY' : 'RADIO TELEPHONY';

    let finalText = `COASTAL STATION LICENSE - ${serviceText} - ${powerText} - ${txnText}`;

    if (purchasePossess) {
      finalText += ` - PERMIT TO PURCHASE/POSSESS - UNITS_${purchaseUnits}`;
    }

    if (sellTransfer) {
      finalText += ` - PERMIT TO SELL/TRANSFER - UNITS_${sellTransferUnits}`;
    }

    if (hasDuplicate) {
      finalText += ' - DUPLICATE';
    }

    const txnForForm: TxnType = primary === 'RENEW' ? 'RENEW' : primary === 'MOD' ? 'MOD' : 'NEW';

    finalize(finalText, txnForForm);
  });
}
