import { MatDialog } from '@angular/material/dialog';

import {
  ShipStationLicenseScopeDialogComponent,
  ShipLicenseScope,
} from './ship-station-license-scope-dialog.component';

import {
  ShipStationLicenseOptionsDialogComponent,
  ShipTxn,
  ShipPower,
  ShipStationLicenseOptionsResult, // ✅ correct name from your component
} from './ship-station-license-options-dialog.component';

export type ShipStationLicensePicked = {
  scope: ShipLicenseScope;
  txn: ShipTxn;
  power: ShipPower;
  // ✅ intlCode removed
};

export function openShipStationLicenseFlow(
  dialog: MatDialog,
  cancel: () => void,
  done: (picked: ShipStationLicensePicked) => void
): void {
  // 1) scope (DOMESTIC / INTERNATIONAL)
  const ref1 = dialog.open(ShipStationLicenseScopeDialogComponent, {
    width: '460px',
    maxWidth: '92vw',
    panelClass: 'soa-dlg',
    disableClose: true,
    autoFocus: false,
    restoreFocus: false,
  });

  ref1.afterClosed().subscribe((r1: { value?: ShipLicenseScope } | undefined) => {
    if (!r1?.value) {
      cancel();
      return;
    }

    const scope = r1.value as ShipLicenseScope;

    // 2) options (txn + power) ✅ one dialog only
    const ref2 = dialog.open(ShipStationLicenseOptionsDialogComponent, {
      width: '720px',
      maxWidth: '92vw',
      panelClass: 'soa-dlg',
      disableClose: true,
      autoFocus: false,
      restoreFocus: false,
    });

    ref2.afterClosed().subscribe((r2: ShipStationLicenseOptionsResult | undefined) => {
      if (!r2?.txn || !r2?.power) {
        cancel();
        return;
      }

      done({
        scope,
        txn: r2.txn as ShipTxn,
        power: r2.power as ShipPower,
      });
    });
  });
}