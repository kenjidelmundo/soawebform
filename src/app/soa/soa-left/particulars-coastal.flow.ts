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

    const txn = ro.txn as ShipTxn;
    const power = ro.power as CoastalPower;
    const service = ro.service as CoastalService;

    const txnText = txn === 'MOD' ? 'MODIFICATION' : txn;

    const powerText =
      service === 'RADIO_TELEGRAPHY'
        ? power === 'HIGH_POWERED'
          ? 'HIGH POWERED'
          : power === 'MEDIUM_POWERED'
          ? 'MEDIUM POWERED'
          : 'LOW POWERED'
        : power;

    const serviceText = service === 'RADIO_TELEGRAPHY' ? 'RADIO TELEGRAPHY' : 'RADIO TELEPHONY';

    const finalText = `COASTAL STATION LICENSE - ${serviceText} - ${powerText} - ${txnText}`;

    const txnForForm: TxnType = txn === 'RENEW' ? 'RENEW' : txn === 'MOD' ? 'MOD' : 'NEW';

    finalize(finalText, txnForForm);
  });
}
