import { MatDialog } from '@angular/material/dialog';
import { TxnType } from './txn-type-dialog.component';

import {
  ShipStationMainDialogComponent,
  ShipMain,
} from './ship-station-main-dialog.component';

// Ship Station License (scope -> options) ✅ NO intl code anymore
import {
  openShipStationLicenseFlow,
  ShipStationLicensePicked,
} from './particulars-shipstation-license.flow';

// Coastal flow (telegraphy/telephony)
import { openCoastalParticularsFlow } from './particulars-coastal.flow';

// ✅ called by SoaLeftFormComponent
export function openShipStationParticularsFlow(
  dialog: MatDialog,
  cancel: () => void,
  finalize: (finalText: string, txn?: TxnType) => void
): void {
  const refMain = dialog.open(ShipStationMainDialogComponent, {
    width: '460px',
    maxWidth: '92vw',
    panelClass: 'soa-dlg',
    disableClose: true,
    autoFocus: false,
    restoreFocus: false,
  });

  refMain.afterClosed().subscribe((r0) => {
    if (!r0?.value) {
      cancel();
      return;
    }

    const main = r0.value as ShipMain;

    // ===================================================
    // 1) SHIP STATION LICENSE
    // ===================================================
    if (main === 'SHIP_STATION_LICENSE') {
      openShipStationLicenseFlow(dialog, cancel, (picked: ShipStationLicensePicked) => {
        const txnText = picked.txn === 'MOD' ? 'MODIFICATION' : picked.txn;

        // ✅ POWER TEXT: supports both old and new naming
        const powerText =
          picked.power === 'HIGH_POWERED'
            ? 'HIGH POWERED'
            : picked.power === 'MEDIUM_POWERED' || (picked.power as any) === 'HF_VHF_POWERED'
            ? 'MEDIUM POWERED'
            : 'LOW POWERED';

        const scopeText = picked.scope; // DOMESTIC / INTERNATIONAL

        // ✅ REMOVED intlCode completely
        const finalText = `SHIP STATION LICENSE - ${scopeText} - ${powerText} - ${txnText}`;

        // Map ShipTxn -> TxnType for your right panel
        const txnForForm: TxnType =
          picked.txn === 'RENEW' ? 'RENEW' : picked.txn === 'MOD' ? 'MOD' : 'NEW';

        finalize(finalText, txnForForm);
      });
      return;
    }

    // ===================================================
    // 2) SHIP EARTH STATION LICENSE (NO subtype, NO txn dialogs)
    // ===================================================
    if (main === 'SHIP_EARTH_STATION_LICENSE') {
      finalize('SHIP EARTH STATION LICENSE'); // ✅ txn undefined
      return;
    }

    // ===================================================
    // 3) DELETION CERTIFICATE (NO subtype, NO txn dialogs)
    // ===================================================
    if (main === 'DELETION_CERTIFICATE') {
      finalize('DELETION CERTIFICATE'); // ✅ txn undefined
      return;
    }

    // ===================================================
    // 4) COASTAL STATION LICENSE
    // ===================================================
    if (main === 'COASTAL_STATION_LICENSE') {
      openCoastalParticularsFlow(dialog, cancel, finalize);
      return;
    }

    cancel();
  });
}