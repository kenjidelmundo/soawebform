import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ShipMain } from './ship-station-main-dialog.component';

export type ShipSub =
  | 'DOMESTIC_TRADE'
  | 'INTERNATIONAL_TRADE'
  | 'EARTH_STATION'
  | 'COASTAL_RADIO_TG'
  | 'COASTAL_RADIO_TP'
  | 'DELETION';

export type ShipStationSubDialogResult = { value: ShipSub };
export type ShipStationSubDialogData = { main: ShipMain };

@Component({
  selector: 'app-ship-station-sub-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dlg">
      <div class="dlgHead">{{ head }}</div>

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
export class ShipStationSubDialogComponent {
  selected: ShipSub | null = null;
  head = 'Select Option';
  options: { label: string; value: ShipSub }[] = [];

  constructor(
    private ref: MatDialogRef<ShipStationSubDialogComponent, ShipStationSubDialogResult>,
    @Inject(MAT_DIALOG_DATA) public data: ShipStationSubDialogData
  ) {
    const main = data?.main;

    if (main === 'SHIP_STATION_LICENSE') {
      this.head = 'Ship Station License';
      this.options = [
        { label: 'Ships in Domestic Trade', value: 'DOMESTIC_TRADE' },
        { label: 'Ships in International Trade', value: 'INTERNATIONAL_TRADE' },
      ];
    } else if (main === 'SHIP_EARTH_STATION_LICENSE') {
      this.head = 'Ship Earth Station License';
      this.options = [
        { label: 'SESCL / RIT / SSAS / SESFB', value: 'EARTH_STATION' },
      ];
    } else if (main === 'COASTAL_STATION_LICENSE') {
      this.head = 'Coastal Station License';
      this.options = [
        { label: 'Radio Telegraphy', value: 'COASTAL_RADIO_TG' },
        { label: 'Radio Telephony', value: 'COASTAL_RADIO_TP' },
      ];
    } else {
      this.head = 'Deletion Certificate';
      this.options = [
        { label: 'Deletion', value: 'DELETION' },
      ];
    }
  }

  pick(v: ShipSub) { this.selected = v; }
  submit() { if (this.selected) this.ref.close({ value: this.selected }); }
  close() { this.ref.close(); }
}