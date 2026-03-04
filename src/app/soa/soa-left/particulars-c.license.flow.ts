import { MatDialog } from '@angular/material/dialog';

import { TxnTypeDialogComponent, TxnType } from './txn-type-dialog.component';

import {
  CoastalSubtypeDialogComponent,
  CoastalSubtype,
} from './coastal-subtype-dialog.component';

import {
  CoastalOptionsDialogComponent,
  CoastalOption,
} from './coastal-options-dialog.component';

export type CoastalLicensePicked = {
  subtype: CoastalSubtype; // CoastalStations | HF
  option: CoastalOption;   // selected option tile
  txn: TxnType;            // NEW / RENEW / MOD  (LAST step)
};

export function openCoastalLicenseParticularsFlow(
  dialog: MatDialog,
  cancel: () => void,
  finalize: (
    finalText: string,
    txn?: TxnType,
    picked?: CoastalLicensePicked
  ) => void
): void {
  // 1) Subtype first
  const refSub = dialog.open(CoastalSubtypeDialogComponent, {
    width: '460px',
    disableClose: true,
    autoFocus: false,
    restoreFocus: false,
  });

  refSub.afterClosed().subscribe((rSub) => {
    const subtype: CoastalSubtype | undefined = rSub?.value;
    if (!subtype) {
      cancel();
      return;
    }

    // 2) Options second (depends on subtype)
    const refOpt = dialog.open(CoastalOptionsDialogComponent, {
      width: '520px',
      disableClose: true,
      autoFocus: false,
      restoreFocus: false,
      data: { subtype },
    });

    refOpt.afterClosed().subscribe((rOpt) => {
      const option: CoastalOption | undefined = rOpt?.value;
      if (!option) {
        cancel();
        return;
      }

      // 3) TXN last (NEW / RENEW / MOD)
      const refTxn = dialog.open(TxnTypeDialogComponent, {
        width: '460px',
        disableClose: true,
        autoFocus: false,
        restoreFocus: false,
      });

      refTxn.afterClosed().subscribe((rTxn) => {
        const txn: TxnType | undefined = rTxn?.value;
        if (!txn) {
          cancel();
          return;
        }

        const picked: CoastalLicensePicked = { subtype, option, txn };

        // build your particulars text
        const finalText = buildCoastalLicenseFinalText(picked);

        finalize(finalText, txn, picked);
      });
    });
  });
}

// ==========================
// TEXT BUILDER
// ==========================
function buildCoastalLicenseFinalText(p: CoastalLicensePicked): string {
  const service = 'COASTAL STATION LICENSE';
  const subtypeLabel =
    p.subtype === 'CoastalStations' ? 'Coastal Stations' : 'HIGH FREQUENCY (HF)';
  const optionLabel = coastalOptionLabel(p.option);

  // If you want txn included in particulars text, keep this:
  // return `${service} - ${subtypeLabel} - ${optionLabel} - ${p.txn}`;

  // If you do NOT want txn in particulars text, use this:
  return `${service} - ${subtypeLabel} - ${optionLabel}`;
}

function coastalOptionLabel(opt: CoastalOption): string {
  switch (opt) {
    // Coastal Stations
    case 'HighPoweredAbove100W':
      return 'High Powered (above 100W)';
    case 'MediumPowered25To100W':
      return 'Medium Powered (above 25W up to 100W)';
    case 'LowPowered25WBelow':
      return 'Low Powered (25W below)';

    // HF
    case 'HFHighPowered100W':
      return 'HF High Powered (100W)';
    case 'HFMediumPowered25To100W':
      return 'HF Medium Powered (25W up to 100W)';
    case 'HFLowPowered25WBelow':
      return 'HF Low Powered (25W below)';
    case 'VHF':
      return 'VHF';

    default:
      return String(opt);
  }
}