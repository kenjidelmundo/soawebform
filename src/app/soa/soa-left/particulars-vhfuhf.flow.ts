import { MatDialog } from '@angular/material/dialog';
import {
  VhfUhfSubtypeDialogComponent,
  VhfUhfSubtypeResult,
  rememberVhfUhfSubtypeSelection,
} from './vhf-uhf-subtype-dialog.component';

import { TxnTypeDialogComponent, TxnType } from './txn-type-dialog.component';

type VhfUhfStackEntry = {
  picked: VhfUhfSubtypeResult;
  primary?: TxnType;
  primaryUnits: number;
  purchasePossess: boolean;
  purchasePossessUnits: number;
  hasDuplicate: boolean;
};

type VhfUhfFlowState = {
  entries: VhfUhfStackEntry[];
  draftPicked?: VhfUhfSubtypeResult;
};

function buildEntryText(entry: VhfUhfStackEntry): string {
  const baseText = `VHF/UHF RADIO STATIONS - ${entry.picked.baseRadio} - ${entry.picked.power}`;
  const parts: string[] = [];

  if (entry.primary) {
    const primaryText = entry.primary === 'MOD' ? 'MODIFICATION' : entry.primary;
    parts.push(`${primaryText} - UNITS_${entry.primaryUnits}`);
  }

  if (entry.purchasePossess) {
    parts.push(`PURCHASE/POSSESS - UNITS_${entry.purchasePossessUnits}`);
  }

  if (entry.hasDuplicate) {
    parts.push('DUPLICATE');
  }

  return parts.length ? `${baseText} - ${parts.join(' - ')}` : baseText;
}

function buildFinalText(entries: VhfUhfStackEntry[]): string {
  return entries.map(buildEntryText).join(' || ');
}

// ✅ same signature style as your other flows
export function openVhfUhfParticularsFlow(
  dialog: MatDialog,
  cancel: () => void,
  finalize: (finalText: string, txn?: TxnType) => void
): void {
  const state: VhfUhfFlowState = {
    entries: [],
  };

  const openSubtypeDialog = (): void => {
    rememberVhfUhfSubtypeSelection({
      baseRadio: state.draftPicked?.baseRadio ?? null,
      power: state.draftPicked?.power ?? null,
    });

    const ref = dialog.open(VhfUhfSubtypeDialogComponent, {
      width: '520px',
      maxWidth: '92vw',
      disableClose: true,
      autoFocus: false,
      restoreFocus: false,
      panelClass: 'soa-dlg',
      data: {
        baseRadio: state.draftPicked?.baseRadio ?? null,
        power: state.draftPicked?.power ?? null,
      },
    });

    ref.afterClosed().subscribe((picked?: VhfUhfSubtypeResult) => {
      if (!picked) {
        cancel();
        return;
      }

      state.draftPicked = picked;
      openTxnDialog(picked);
    });
  };

  const openTxnDialog = (picked: VhfUhfSubtypeResult): void => {
    const baseText = `VHF/UHF RADIO STATIONS - ${picked.baseRadio} - ${picked.power}`;
    const refTxn = dialog.open(TxnTypeDialogComponent, {
      width: '420px',
      maxWidth: '92vw',
      disableClose: true,
      autoFocus: false,
      restoreFocus: false,
      panelClass: 'soa-dlg',
      data: {
        contextTitle: baseText,
        showPurchasePossess: true,
        showStandaloneUnits: true,
        showDuplicate: true,
        showBack: true,
        onBack: (r: any) => {
          const selected: TxnType[] = Array.isArray(r?.value)
            ? (r.value as TxnType[])
            : r?.value
            ? [r.value as TxnType]
            : [];

          const primary: TxnType | undefined =
            (selected.includes('MOD') && 'MOD') ||
            (selected.includes('RENEW') && 'RENEW') ||
            (selected.includes('NEW') && 'NEW') ||
            undefined;

          const purchasePossess = !!r?.purchasePossess;
          const purchasePossessUnits = Math.max(1, Math.floor(Number(r?.purchasePossessUnits || 1)));
          const primaryUnits = Math.max(1, Math.floor(Number(r?.standaloneUnits || 1)));
          const hasDuplicate = selected.includes('DUPLICATE');

          const entry: VhfUhfStackEntry | null =
            primary || purchasePossess || hasDuplicate
              ? {
                  picked,
                  primary,
                  primaryUnits,
                  purchasePossess,
                  purchasePossessUnits,
                  hasDuplicate,
                }
              : null;

          if (entry) {
            state.entries = [...state.entries, entry];
          }

          state.draftPicked = picked;
          setTimeout(() => {
            openSubtypeDialog();
          }, 0);
        },
      },
    });

    refTxn.afterClosed().subscribe((r: any) => {
        const selected: TxnType[] = Array.isArray(r?.value)
          ? (r.value as TxnType[])
          : r?.value
          ? [r.value as TxnType]
          : [];

        const primary: TxnType | undefined =
          (selected.includes('MOD') && 'MOD') ||
          (selected.includes('RENEW') && 'RENEW') ||
          (selected.includes('NEW') && 'NEW') ||
          undefined;

        const purchasePossess = !!r?.purchasePossess;
        const purchasePossessUnits = Math.max(1, Math.floor(Number(r?.purchasePossessUnits || 1)));
        const primaryUnits = Math.max(1, Math.floor(Number(r?.standaloneUnits || 1)));
        const hasDuplicate = selected.includes('DUPLICATE');

        const entry: VhfUhfStackEntry | null =
          primary || purchasePossess || hasDuplicate
            ? {
                picked,
                primary,
                primaryUnits,
                purchasePossess,
                purchasePossessUnits,
                hasDuplicate,
              }
            : null;

        if (r?.action === 'back') {
          if (entry) {
            state.entries = [...state.entries, entry];
          }
          state.draftPicked = picked;
          setTimeout(() => {
            openSubtypeDialog();
          }, 0);
          return;
        }

        if (!entry || (!primary && !purchasePossess)) {
          cancel();
          return;
        }

        const allEntries = [...state.entries, entry];
        const finalText = buildFinalText(allEntries);

        finalize(finalText, primary);
    });
  };

  openSubtypeDialog();
}
