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
  txn?: TxnType;           // NEW / RENEW / MOD (optional)
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

      const subtypeLabel = coastalOptionLabel(option, subtype);

      // 3) TXN last (NEW / RENEW / MOD)
      const refTxn = dialog.open(TxnTypeDialogComponent, {
        width: '460px',
        disableClose: true,
        autoFocus: false,
        restoreFocus: false,
        data: {
          contextTitle: subtypeLabel,
          showPurchasePossess: true,
          showSellTransfer: true,
          showDuplicate: true,
        },
      });

      refTxn.afterClosed().subscribe((rTxn) => {
        const selected: TxnType[] = Array.isArray(rTxn?.value)
          ? rTxn.value
          : rTxn?.value
          ? [rTxn.value]
          : [];

        const purchasePossess = !!rTxn?.purchasePossess;
        const purchaseUnits = Math.max(1, Math.floor(Number(rTxn?.purchasePossessUnits || 1)));
        const sellTransfer = !!rTxn?.sellTransfer;
        const sellTransferUnits = Math.max(1, Math.floor(Number(rTxn?.sellTransferUnits || 1)));

        // Coastal charter flows are single-transaction paths; if MOD is checked,
        // keep it as the primary txn so MOD fees are computed.
        const primary: TxnType | undefined =
          (selected.includes('MOD') && 'MOD') ||
          (selected.includes('RENEW') && 'RENEW') ||
          (selected.includes('NEW') && 'NEW') ||
          undefined;

        if (!primary && !purchasePossess && !sellTransfer) {
          cancel();
          return;
        }

        const picked: CoastalLicensePicked = { subtype, option, txn: primary };

        // build your particulars text
        let finalText = buildCoastalLicenseFinalText(picked);

        if (purchasePossess) {
          finalText += ` - PERMIT TO PURCHASE/POSSESS - UNITS_${purchaseUnits}`;
        }

        if (sellTransfer) {
          finalText += ` - PERMIT TO SELL/TRANSFER - UNITS_${sellTransferUnits}`;
        }

        if (selected.includes('DUPLICATE')) {
          finalText += ' - DUPLICATE';
        }

        finalize(finalText, primary, picked);
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
  const optionLabel = coastalOptionLabel(p.option, p.subtype);
  const txnLabel = p.txn ? ` - ${p.txn}` : '';
  return `${service} - ${subtypeLabel} - ${optionLabel}${txnLabel}`;
}

function coastalOptionLabel(opt: CoastalOption, subtype?: CoastalSubtype): string {
  switch (opt) {
    // Coastal Stations
    case 'HighPoweredAbove100W':
      return 'Coastal Stations - High Powered (above 100W)';
    case 'MediumPowered25To100W':
      return 'Coastal Stations - Medium Powered (above 25W up to 100W)';
    case 'LowPowered25WBelow':
      return 'Coastal Stations - Low Powered (25W below)';

    // HF
    case 'HFHighPowered100W':
      return 'High Frequency (HF) - High Powered (100W)';
    case 'HFMediumPowered25To100W':
      return 'High Frequency (HF) - Medium Powered (25W up to 100W)';
    case 'HFLowPowered25WBelow':
      return 'High Frequency (HF) - Low Powered (25W below)';
    case 'VHF':
      return 'High Frequency (HF) - VHF';

    default:
      return subtype
        ? `${subtype === 'CoastalStations' ? 'Coastal Stations' : 'High Frequency (HF)'} - ${String(opt)}`
        : String(opt);
  }
}
