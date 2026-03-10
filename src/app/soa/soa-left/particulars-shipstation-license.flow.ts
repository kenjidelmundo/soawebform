import { MatDialog } from '@angular/material/dialog';

import { ShipLicenseScope } from './ship-station-license-scope-dialog.component';

// ONE dialog for both domestic/international choices
import {
  ShipStationLicenseOptionsDialogComponent,
  ShipTxn,
  ShipPower,
  ShipStationLicenseOptionsResult,
} from './ship-station-license-options-dialog.component';

// =====================
// RETURN TYPE
// =====================
export type ShipStationLicensePicked = {
  scope: ShipLicenseScope;
  txns: ShipTxn[];
  power: ShipPower;
  purchasePossessUnits?: number;
  sellTransferUnits?: number;
  possessStorageUnits?: number;
};

export function openShipStationLicenseFlow(
  dialog: MatDialog,
  cancel: () => void,
  done: (picked: ShipStationLicensePicked) => void
): void {
  const ref = dialog.open(ShipStationLicenseOptionsDialogComponent, {
    width: '840px',
    maxWidth: '94vw',
    panelClass: 'soa-dlg',
    disableClose: true,
    autoFocus: false,
    restoreFocus: false,
  });

  ref.afterClosed().subscribe((r: ShipStationLicenseOptionsResult | undefined) => {
    if (!r?.txns?.length || !r?.power || !r?.scope) {
      cancel();
      return;
    }

    done({
      scope: r.scope as ShipLicenseScope,
      txns: r.txns as ShipTxn[],
      power: r.power as ShipPower,
      purchasePossessUnits: r.purchasePossessUnits,
      sellTransferUnits: r.sellTransferUnits,
      possessStorageUnits: r.possessStorageUnits,
    });
  });
}
