import { MatDialog } from '@angular/material/dialog';
import { TxnTypeDialogComponent, TxnType } from './txn-type-dialog.component';
import { AmateurParticularsDialogComponent } from './amateur-particulars-dialog.component';

export function openAmateurParticularsFlow(
  dialog: MatDialog,
  cancel: () => void,
  finalize: (finalText: string, txn?: TxnType) => void
) {
  const refAm = dialog.open(AmateurParticularsDialogComponent, {
    width: '560px',
    disableClose: true,
    autoFocus: false,
    restoreFocus: false,
  });

  refAm.afterClosed().subscribe((resAm) => {
    if (!resAm?.amateurChoice) {
      cancel();
      return;
    }

    const choice = String(resAm.amateurChoice ?? '').trim();
    const choiceUpper = choice.toUpperCase();
    const isAtRoc = choiceUpper === 'AT-ROC';
    const isSpecialPermit = choiceUpper.includes('SPECIAL PERMIT');
    const isAtRslClass = /^AT-RSL CLASS [ABCD]$/.test(choiceUpper);
    const isTemporary = choiceUpper.includes('TEMPORARY PERMIT');

    const refTxn = dialog.open(TxnTypeDialogComponent, {
      width: '520px',
      disableClose: true,
      autoFocus: false,
      restoreFocus: false,
      data: {
        showPurchasePossess: !isAtRoc && !isSpecialPermit && !isTemporary,
        showSellTransfer: isAtRslClass && !isTemporary,
        showPossessStorage: isAtRslClass && !isTemporary,
        showStandaloneUnits: isTemporary,
        showDuplicate: true,
        contextTitle: choice,
      },
    });

    refTxn.afterClosed().subscribe((resTxn) => {
      if (!resTxn) {
        cancel();
        return;
      }

      const picked = Array.isArray(resTxn.value) ? resTxn.value : [];
      const purchasePossess = !!resTxn.purchasePossess;
      const sellTransfer = !!resTxn.sellTransfer;
      const possessStorage = !!resTxn.possessStorage;
      const standaloneUnits = Math.max(1, Math.floor(Number(resTxn.standaloneUnits || 1)));
      const purchasePossessUnits = Math.max(1, Math.floor(Number(resTxn.purchasePossessUnits || 1)));
      const sellTransferUnits = Math.max(1, Math.floor(Number(resTxn.sellTransferUnits || 1)));
      const possessStorageUnits = Math.max(1, Math.floor(Number(resTxn.possessStorageUnits || 1)));
      const modificationUnits = Math.max(1, Math.floor(Number(resTxn.modificationUnits || 1)));
      const hasDuplicate = picked.includes('DUPLICATE');

      const txn: TxnType | undefined =
        (picked.includes('NEW') && 'NEW') ||
        (picked.includes('RENEW') && 'RENEW') ||
        (picked.includes('MOD') && 'MOD') ||
        undefined;

      if (!txn && !purchasePossess && !sellTransfer && !possessStorage) {
        cancel();
        return;
      }

      let finalText = `Amateur - ${choice}`;

      if (isTemporary) {
        finalText += ` - UNITS_${standaloneUnits}`;
      }

      if (purchasePossess) {
        finalText += ` - Purchase and Possess - UNITS_${purchasePossessUnits}`;
      }

      if (sellTransfer) {
        finalText += ` - Permit to Sell/Transfer - UNITS_${sellTransferUnits}`;
      }

      if (possessStorage) {
        finalText += ` - Permit to Possess for Storage of Amateur Radio Stations - UNITS_${possessStorageUnits}`;
      }

      if (txn) {
        finalText += ` - ${txn === 'MOD' ? 'MODIFICATION' : txn}`;

        if (txn === 'MOD') {
          finalText += ` - UNITS_${modificationUnits}`;
        }
      }

      if (hasDuplicate) {
        finalText += ' - DUPLICATE';
      }

      finalize(finalText, txn);
    });
  });
}
