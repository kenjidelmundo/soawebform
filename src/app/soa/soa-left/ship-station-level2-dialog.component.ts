import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ShipSub } from './ship-station-sub-dialog.component';

export type ShipLevel = 'HIGH' | 'MED' | 'LOW' | 'HF' | 'VHF';
export type ShipStationLevelDialogResult = { value: ShipLevel };
export type ShipStationLevelDialogData = { sub: ShipSub };

@Component({
  selector: 'app-ship-station-level2-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dlg">
      <div class="dlgHead">Select Level</div>

      <div class="list">
        <ng-container *ngFor="let o of options">
          <label class="row" (click)="pick(o.value)">
            <input type="checkbox" class="cb" [checked]="selected===o.value" />
            <span class="txt">{{ o.label }}</span>
          </label>
        </ng-container>
      </div>

      <div class="dlgFoot">
        <button type="button" class="btn" (click)="close()">Cancel</button>
        <button type="button" class="btn primary" [disabled]="!selected" (click)="submit()">Submit</button>
      </div>
    </div>
  `,
  styles: [`
    .dlg { width:100%; max-width:92vw; padding:14px; box-sizing:border-box; overflow-x:hidden;
           font-family:Arial,sans-serif; background:#fff; }
    .dlgHead { font-size:18px; font-weight:700; margin-bottom:10px; }
    .list { display:grid; gap:8px; padding-left:2px; }
    .row { display:flex; align-items:center; gap:8px; cursor:pointer; font-weight:700; font-size:14px; }
    .cb { width:14px; height:14px; margin:0; pointer-events:none; }
    .dlgFoot { margin-top:14px; display:flex; justify-content:flex-end; gap:8px; }
    .btn { height:34px; padding:0 12px; border:1px solid #999; background:#fff; border-radius:6px; cursor:pointer; }
    .btn.primary { border-color:#2f74ff; background:#2f74ff; color:#fff; }
    .btn:disabled { opacity:.55; cursor:not-allowed; }
  `]
})
export class ShipStationLevel2DialogComponent {
  selected: ShipLevel | null = null;
  options: { label: string; value: ShipLevel }[] = [];

  constructor(
    private ref: MatDialogRef<ShipStationLevel2DialogComponent, ShipStationLevelDialogResult>,
    @Inject(MAT_DIALOG_DATA) public data: ShipStationLevelDialogData
  ) {
    const sub = data?.sub;

    // Telephony -> HF/VHF
    if (sub === 'COASTAL_RADIO_TP') {
      this.options = [
        { label: 'HF', value: 'HF' },
        { label: 'VHF', value: 'VHF' },
      ];
    } else {
      // Domestic / International / Radiotelegraphy -> High/Med/Low
      this.options = [
        { label: 'High Powered', value: 'HIGH' },
        { label: 'Medium Powered', value: 'MED' },
        { label: 'Low Powered', value: 'LOW' },
      ];
    }
  }

  pick(v: ShipLevel) { this.selected = v; }
  submit() { if (this.selected) this.ref.close({ value: this.selected }); }
  close() { this.ref.close(); }
}