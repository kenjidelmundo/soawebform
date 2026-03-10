import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

export type ShipMain =
  | 'SHIP_STATION_LICENSE'
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

      <div class="grid">
        <button
          type="button"
          class="tile"
          (click)="pick('SHIP_STATION_LICENSE')"
        >
          <div class="tTitle">Ship Station License</div>
          <div class="tSub">Ship station license</div>
        </button>

        <button
          type="button"
          class="tile"
          (click)="pick('COASTAL_STATION_LICENSE')"
        >
          <div class="tTitle">Coastal Station License</div>
          <div class="tSub">Coastal station license</div>
        </button>

        <button
          type="button"
          class="tile"
          (click)="pick('DELETION_CERTIFICATE')"
        >
          <div class="tTitle">Deletion Certificate</div>
          <div class="tSub">Deletion certificate</div>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .dlg {
      width: 100%;
      max-width: 92vw;
      padding: 14px;
      box-sizing: border-box;
      overflow-x: hidden;
      font-family: Arial, sans-serif;
      background: #fff;
    }
    .dlgHead { font-size: 18px; font-weight: 800; margin-bottom: 12px; }

    /* ✅ Tile/Card buttons */
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

    .tile {
      text-align: left;
      border: 1px solid #cfcfcf;
      background: #fff;
      border-radius: 10px;
      padding: 12px 14px;
      cursor: pointer;
      box-sizing: border-box;
      outline: none;
      transition: box-shadow .12s ease, border-color .12s ease, transform .02s ease;
    }
    .tile:hover {
      border-color: #9db9ff;
      box-shadow: 0 2px 10px rgba(0,0,0,.06);
    }
    .tile:active { transform: translateY(1px); }

    .tile.on {
      border-color: #2f74ff;
      box-shadow: 0 2px 14px rgba(47,116,255,.18);
    }

    .tTitle { font-size: 14px; font-weight: 800; color: #111; }
    .tSub { margin-top: 2px; font-size: 12px; font-weight: 600; opacity: .75; }

    @media (max-width: 560px) {
      .grid { grid-template-columns: 1fr; }
    }
  `],
})
export class ShipStationMainDialogComponent {
  constructor(
    private ref: MatDialogRef<ShipStationMainDialogComponent, ShipStationMainDialogResult>
  ) {}

  pick(v: ShipMain) { this.ref.close({ value: v }); }
}
