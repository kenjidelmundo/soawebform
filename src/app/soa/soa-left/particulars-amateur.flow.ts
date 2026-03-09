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

    const refTxn = dialog.open(TxnTypeDialogComponent, {
      width: '520px',
      disableClose: true,
      autoFocus: false,
      restoreFocus: false,
      data: {
        showPurchasePossess: !isAtRoc && !isSpecialPermit,
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
      const units = Math.max(1, Math.floor(Number(resTxn.purchasePossessUnits || 1)));

      const txn: TxnType | undefined =
        (picked.includes('NEW') && 'NEW') ||
        (picked.includes('RENEW') && 'RENEW') ||
        (picked.includes('MOD') && 'MOD') ||
        undefined;

      if (!txn && !purchasePossess) {
        cancel();
        return;
      }

      let finalText = `Amateur - ${choice}`;

      if (purchasePossess) {
        finalText += ` - Purchase and Possess - UNITS_${units}`;
      }

      if (txn) {
        finalText += ` - ${txn === 'MOD' ? 'MODIFICATION' : txn}`;
      }

      finalize(finalText, txn);
    });
  });
}