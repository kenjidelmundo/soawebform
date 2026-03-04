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
    });

    refTxn.afterClosed().subscribe((r: any) => {
      const txn: TxnType | undefined = r?.value ?? r?.txn ?? r;
      if (!txn) {
        cancel();
        return;
      }

      const txnText = txn === 'MOD' ? 'MODIFICATION' : txn; // match your other patterns
      const finalText = `${baseText} - ${txnText}`;

      finalize(finalText, txn);
    });
  });
}