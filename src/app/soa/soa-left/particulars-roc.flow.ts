import { MatDialog } from '@angular/material/dialog';
import { TxnTypeDialogComponent, TxnType } from './txn-type-dialog.component';
import { RocSubtypeDialogComponent } from './roc-subtype-dialog.component';
import { RocLevelDialogComponent } from './roc-level-dialog.component';

export function openRocParticularsFlow(
  dialog: MatDialog,
  cancel: () => void,
  finalize: (finalText: string, txn: TxnType) => void
) {
  const ref2 = dialog.open(RocSubtypeDialogComponent, {
    width: '520px',
    disableClose: true,
    autoFocus: false,
    restoreFocus: false,
  });

  ref2.afterClosed().subscribe((res2) => {
    if (!res2?.value) {
      cancel();
      return;
    }

    const subtype = String(res2.value ?? '').trim().toUpperCase();

    const openTxn = (base: string) => {
      const refTxn = dialog.open(TxnTypeDialogComponent, {
        width: '760px',
        maxWidth: '94vw',
        panelClass: 'soa-dlg',
        disableClose: true,
        autoFocus: false,
        restoreFocus: false,
        data: { contextTitle: base, showDuplicate: true },
      });

      refTxn.afterClosed().subscribe((resTxn) => {
        const selected: TxnType[] = Array.isArray(resTxn?.value)
          ? (resTxn.value as TxnType[])
          : resTxn?.value
          ? [resTxn.value as TxnType]
          : [];

        if (!selected.length) {
          cancel();
          return;
        }

        // build display text with all selected txn types
        const parts = selected.map((t: TxnType) => (t === 'MOD' ? 'MODIFICATION' : t));
        const finalText = `${base} - ${parts.join(' - ')}`;

        // DUPLICATE is additive only (+120 in Others). Keep base txn as NEW/RENEW/MOD.
        const priority: TxnType[] = ['RENEW', 'NEW', 'MOD'];
        const primary = (priority.find((p) => selected.includes(p)) ?? selected[0]) as TxnType;

        if (!priority.includes(primary)) {
          cancel();
          return;
        }

        finalize(finalText, primary);
      });
    };

    // RTG/PHN needs level dialog
    if (subtype === 'RTG' || subtype === 'PHN') {
      const refLevel = dialog.open(RocLevelDialogComponent, {
        width: '420px',
        disableClose: true,
        autoFocus: false,
        restoreFocus: false,
        data: { base: subtype },
      });

      refLevel.afterClosed().subscribe((resL) => {
        if (!resL?.value) {
          cancel();
          return;
        }

        const leveled = String(resL.value ?? '').trim().toUpperCase(); // 1RTG/2RTG/3RTG...
        openTxn(`ROC - ${leveled}`);
      });

      return;
    }

    openTxn(`ROC - ${subtype}`);
  });
}
