import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

export type ShipMain =
  | 'SHIP_STATION_LICENSE'
  | 'SHIP_EARTH_STATION_LICENSE'
  | 'COASTAL_STATION_LICENSE'
  | 'DELETION_CERTIFICATE';

export type ShipStationMainDialogResult = { value: ShipMain };

@Component({
  selector: 'app-ship-station-main-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dlg">
      <div class="dlgHead">Ship Station - Subtype</div>

      <div class="list">
        <label class="row" (click)="pick('SHIP_STATION_LICENSE')">
          <input type="checkbox" class="cb" [checked]="selected==='SHIP_STATION_LICENSE'" />
          <span class="txt">Ship Station License</span>
        </label>

        <label class="row" (click)="pick('SHIP_EARTH_STATION_LICENSE')">
          <input type="checkbox" class="cb" [checked]="selected==='SHIP_EARTH_STATION_LICENSE'" />
          <span class="txt">Ship Earth Station License</span>
        </label>

        <label class="row" (click)="pick('COASTAL_STATION_LICENSE')">
          <input type="checkbox" class="cb" [checked]="selected==='COASTAL_STATION_LICENSE'" />
          <span class="txt">Coastal Station License</span>
        </label>

        <label class="row" (click)="pick('DELETION_CERTIFICATE')">
          <input type="checkbox" class="cb" [checked]="selected==='DELETION_CERTIFICATE'" />
          <span class="txt">Deletion Certificate</span>
        </label>
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
export class ShipStationMainDialogComponent {
  selected: ShipMain | null = null;

  constructor(private ref: MatDialogRef<ShipStationMainDialogComponent, ShipStationMainDialogResult>) {}

  pick(v: ShipMain) { this.selected = v; }
  submit() { if (this.selected) this.ref.close({ value: this.selected }); }
  close() { this.ref.close(); }
}