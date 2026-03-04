import { MatDialog } from '@angular/material/dialog';
import {
  VhfUhfSubtypeDialogComponent,
  VhfUhfSubtypeResult,
} from './vhf-uhf-subtype-dialog.component';

// ✅ same signature style as your other flows
export function openVhfUhfParticularsFlow(
  dialog: MatDialog,
  cancel: () => void,
  finalize: (finalText: string) => void
): void {
  const ref = dialog.open(VhfUhfSubtypeDialogComponent, {
    width: '520px',
    maxWidth: '92vw',
    disableClose: true,
    autoFocus: false,
    restoreFocus: false,
    panelClass: 'soa-dlg',
  });

  ref.afterClosed().subscribe((picked?: VhfUhfSubtypeResult) => {
    if (!picked) {
      cancel();
      return;
    }

    // ✅ IMPORTANT: keep this consistent for parsing
    const finalText = `VHF/UHF RADIO STATIONS - ${picked.baseRadio} - ${picked.power}`;
    finalize(finalText);
  });
}