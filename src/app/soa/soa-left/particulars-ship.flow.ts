import { MatDialog } from '@angular/material/dialog';
import { TxnTypeDialogComponent, TxnType } from './txn-type-dialog.component';

import { ShipStationMainDialogComponent, ShipMain } from './ship-station-main-dialog.component';
import { ShipStationSubDialogComponent, ShipSub } from './ship-station-sub-dialog.component';
import { ShipStationLevel2DialogComponent, ShipLevel } from './ship-station-level2-dialog.component';
import { ShipStationNewOptionsDialogComponent } from './ship-station-new-options-dialog.component.ts';

export function openShipStationParticularsFlow(
  dialog: MatDialog,
  cancel: () => void,
  finalize: (finalText: string, txn: TxnType) => void
) {
  const refMain = dialog.open(ShipStationMainDialogComponent, {
    width: '560px',
    disableClose: true,
    autoFocus: false,
    restoreFocus: false,
  });

  refMain.afterClosed().subscribe((resMain) => {
    if (!resMain?.value) {
      cancel();
      return;
    }

    const main = resMain.value as ShipMain;

    const refSub = dialog.open(ShipStationSubDialogComponent, {
      width: '560px',
      disableClose: true,
      autoFocus: false,
      restoreFocus: false,
      data: { main },
    });

    refSub.afterClosed().subscribe((resSub) => {
      if (!resSub?.value) {
        cancel();
        return;
      }

      const sub = resSub.value as ShipSub;

      const refLvl = dialog.open(ShipStationLevel2DialogComponent, {
        width: '520px',
        disableClose: true,
        autoFocus: false,
        restoreFocus: false,
        data: { sub },
      });

      refLvl.afterClosed().subscribe((resLvl) => {
        if (!resLvl?.value) {
          cancel();
          return;
        }

        const level = resLvl.value as ShipLevel;

        const refTxn = dialog.open(TxnTypeDialogComponent, {
          width: '460px',
          disableClose: true,
          autoFocus: false,
          restoreFocus: false,
        });

        refTxn.afterClosed().subscribe((resTxn) => {
          if (!resTxn?.value) {
            cancel();
            return;
          }

          const txn = resTxn.value as TxnType;
          const needsNewOptions =
            txn === 'NEW' && (sub === 'DOMESTIC_TRADE' || sub === 'INTERNATIONAL_TRADE');

          const finalizeText = (withEquip: boolean, units: number) => {
            const parts: string[] = [];
            parts.push('ShipStation');
            parts.push(String(main));
            parts.push(String(sub));
            parts.push(String(level));

            if (txn === 'NEW' && withEquip) {
              parts.push('WITH_EQUIPMENT');
              parts.push(`UNITS_${Math.max(1, Math.floor(units || 1))}`);
            }

            parts.push(txn === 'MOD' ? 'MODIFICATION' : txn);

            finalize(parts.join(' - '), txn);
          };

          if (!needsNewOptions) {
            finalizeText(false, 1);
            return;
          }

          const refOpt = dialog.open(ShipStationNewOptionsDialogComponent, {
            width: '560px',
            disableClose: true,
            autoFocus: false,
            restoreFocus: false,
          });

          refOpt.afterClosed().subscribe((opt) => {
            finalizeText(!!opt?.withEquipment, Number(opt?.units || 1));
          });
        });
      });
    });
  });
}