import { MatDialog } from '@angular/material/dialog';
import { TxnType } from './txn-type-dialog.component';

import {
  ShipStationMainDialogComponent,
  ShipMain,
} from './ship-station-main-dialog.component';

import {
  openShipStationLicenseFlow,
  ShipStationLicensePicked,
} from './particulars-shipstation-license.flow';

import { openCoastalParticularsFlow } from './particulars-coastal.flow';

export function openShipStationParticularsFlow(
  dialog: MatDialog,
  cancel: () => void,
  finalize: (finalText: string, txn?: TxnType) => void
): void {
  const refMain = dialog.open(ShipStationMainDialogComponent, {
    width: '640px',
    maxWidth: '92vw',
    panelClass: 'soa-dlg',
    disableClose: false,
    autoFocus: false,
    restoreFocus: false,
  });

  refMain.afterClosed().subscribe((r0) => {
    if (!r0?.value) { cancel(); return; }

    const main = r0.value as ShipMain;

    if (main === 'SHIP_STATION_LICENSE') {
      openShipStationLicenseFlow(dialog, cancel, (picked: ShipStationLicensePicked) => {
        const labelMap: Record<string, string> = {
          NEW: 'NEW',
          RENEW: 'RENEW',
          MOD: 'MODIFICATION',
          DUPLICATE: 'DUPLICATE',
          PURCHASE_POSSESS: 'PURCHASE/POSSESS',
          SELL_TRANSFER: 'SELL/TRANSFER',
          POSSESS_STORAGE: 'POSSESS (STORAGE)',
        };

        const txnParts = picked.txns.map((t) => {
          const base = labelMap[t] ?? t;
          if (t === 'PURCHASE_POSSESS' && picked.purchasePossessUnits) {
            return `${base} - UNIT ${picked.purchasePossessUnits}`;
          }
          if (t === 'SELL_TRANSFER' && picked.sellTransferUnits) {
            return `${base} - UNIT ${picked.sellTransferUnits}`;
          }
          if (t === 'POSSESS_STORAGE' && picked.possessStorageUnits) {
            return `${base} - UNIT ${picked.possessStorageUnits}`;
          }
          return base;
        });

        const txnText = txnParts.join(' / ');

        const powerText =
          picked.power === 'HIGH_POWERED'
            ? 'HIGH POWERED'
            : picked.power === 'MEDIUM_POWERED' || (picked.power as any) === 'HF_VHF_POWERED'
            ? 'MEDIUM POWERED'
            : (picked.power as any) === 'SESCL_LRIT_SSAS_SESFB'
            ? 'SESCL/LRIT/SSAS/SESFB'
            : 'LOW POWERED';

        const scopeText = picked.scope;

        const codeText =
          picked.scope === 'INTERNATIONAL' && (picked as any).intlCode
            ? ` - ${(picked as any).intlCode}`
            : '';

        const finalText = `SHIP STATION LICENSE - ${scopeText} - ${powerText}${codeText} - ${txnText}`;

        const txnForForm: TxnType =
          picked.txns.includes('RENEW')
            ? 'RENEW'
            : picked.txns.includes('MOD')
            ? 'MOD'
            : 'NEW';

        finalize(finalText, txnForForm);
      });
      return;
    }

    if (main === 'DELETION_CERTIFICATE') { finalize('DELETION CERTIFICATE'); return; }
    if (main === 'COASTAL_STATION_LICENSE') {
      openCoastalParticularsFlow(dialog, cancel, finalize);
      return;
    }

    cancel();
  });
}
