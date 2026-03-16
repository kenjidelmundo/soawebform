import { MatDialog } from '@angular/material/dialog';

import { TxnType, TxnTypeDialogComponent } from './txn-type-dialog.component';
import {
  TvroCatvSubtype,
  TvroCatvSubtypeDialogComponent,
} from './tvrocatv-subtype-dialog.component';

/**
 * Flow:
 * 1) subtype (TVRO/CATV)
 * 2) txn type (NEW/RENEW/MOD/DUPLICATE)
 * 3) finalize text:
 *    TVRO/CATV - <Subtype> - <NEW/RENEW/MOD/DUPLICATE>
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
      data: {
        contextTitle: `TVRO/CATV - ${subtype}`,
        showDuplicate: true,
        allowDuplicateOnly: true,
      },
    });

    ref2.afterClosed().subscribe((r2: { value: TxnType | TxnType[] } | null) => {
      const selected: TxnType[] = Array.isArray(r2?.value)
        ? (r2?.value as TxnType[])
        : r2?.value
        ? [r2.value as TxnType]
        : [];
      const primarySelected = selected.filter((v) => v !== 'DUPLICATE');

      if (!selected.length) {
        cancel();
        return;
      }

      const txn: TxnType | undefined = primarySelected.length === 1
        ? (primarySelected[0] as TxnType)
        : selected.includes('DUPLICATE') && !primarySelected.length
        ? 'DUPLICATE'
        : undefined;

      if (!primarySelected.length && txn !== 'DUPLICATE') {
        cancel();
        return;
      }

      const orderedPrimary = ['NEW', 'RENEW', 'MOD'].filter((v) => primarySelected.includes(v as TxnType));
      const parts = txn === 'DUPLICATE'
        ? ['DUPLICATE']
        : [
            ...orderedPrimary,
            ...(selected.includes('DUPLICATE') ? ['DUPLICATE'] : []),
          ];
      const finalText = `TVRO/CATV - ${subtype} - ${parts.join(' - ')}`;
      finalize(finalText, txn);
    });
  });
}
