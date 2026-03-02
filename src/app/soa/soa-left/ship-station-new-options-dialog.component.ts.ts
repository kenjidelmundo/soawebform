import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';

export type ShipStationNewOptionsDialogResult = {
  withEquipment: boolean;
  units: number;
};

@Component({
  selector: 'app-ship-station-new-options-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="dlg">
      <div class="dlgHead">Ship Station - New Options</div>

      <div class="row">
        <label>
          <input type="checkbox" [(ngModel)]="withEquipment" />
          <span style="margin-left: 8px;">With Equipment</span>
        </label>
      </div>

      <div class="row" style="margin-top: 10px;">
        <span style="width: 90px; display: inline-block;">Units</span>
        <input
          type="number"
          min="1"
          step="1"
          [(ngModel)]="units"
          style="width: 120px;"
        />
      </div>

      <div class="actions">
        <button type="button" (click)="cancel()">Cancel</button>
        <button type="button" (click)="ok()">OK</button>
      </div>
    </div>
  `,
  styles: [
    `
      .dlg {
        padding: 12px;
      }
      .dlgHead {
        font-weight: 700;
        margin-bottom: 12px;
      }
      .row {
        display: flex;
        align-items: center;
      }
      .actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 14px;
      }
      button {
        padding: 6px 12px;
      }
    `,
  ],
})
export class ShipStationNewOptionsDialogComponent {
  withEquipment = false;
  units = 1;

  constructor(private ref: MatDialogRef<ShipStationNewOptionsDialogComponent>) {}

  cancel(): void {
    this.ref.close(null);
  }

  ok(): void {
    const u = Math.max(1, Math.floor(Number(this.units || 1)));
    const result: ShipStationNewOptionsDialogResult = {
      withEquipment: !!this.withEquipment,
      units: u,
    };
    this.ref.close(result);
  }
}