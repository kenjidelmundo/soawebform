import { MatDialog } from '@angular/material/dialog';

import { TxnType, TxnTypeDialogComponent } from './txn-type-dialog.component';
import {
  TvroCatvSubtype,
  TvroCatvSubtypeDialogComponent,
} from './tvrocatv-subtype-dialog.component';

/**
 * Flow:
 * 1) subtype (TVRO/CATV)
 * 2) txn type (NEW/RENEW/MOD)
 * 3) finalize text:
 *    TVRO/CATV - <Subtype> - <NEW/RENEW/MOD>
 */
export function openTvroCatvParticularsFlow(
  dialog: MatDialog,
  cancel: () => void,
  finalize: (finalText: string, txn?: TxnType) => void
): void {
  const ref1 = dialog.open(TvroCatvSubtypeDialogComponent, {
    width: '460px',
    disableClose: true,
    autoFocus: false,
    restoreFocus: false,
  });

  ref1.afterClosed().subscribe((r1: { value: TvroCatvSubtype } | null) => {
    if (!r1?.value) {
      cancel();
      return;
    }

    const subtype = r1.value;

    const ref2 = dialog.open(TxnTypeDialogComponent, {
      width: '460px',
      disableClose: true,
      autoFocus: false,
      restoreFocus: false,
    });

    ref2.afterClosed().subscribe((r2: { value: TxnType } | null) => {
      if (!r2?.value) {
        cancel();
        return;
      }

      const txn = r2.value;
      const finalText = `TVRO/CATV - ${subtype} - ${txn}`;
      finalize(finalText, txn);
    });
  });
}