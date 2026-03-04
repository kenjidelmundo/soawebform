import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

export type CoastalSubtype = 'CoastalStations' | 'HF';

export type CoastalSubtypeDialogResult = { value: CoastalSubtype };

@Component({
  selector: 'app-coastal-subtype-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dlg">
      <div class="dlgHead">Select Coastal Subtype</div>

      <div class="btnGrid">
        <button type="button" class="pickBtn" (click)="pick('CoastalStations')">
          <span class="txt">Coastal Stations</span>
        </button>

        <button type="button" class="pickBtn" (click)="pick('HF')">
          <span class="txt">HIGH FREQUENCY (HF)</span>
        </button>
      </div>

      <div class="dlgFoot">
        <button type="button" class="btn" (click)="close()">Cancel</button>
      </div>
    </div>
  `,
  styles: [`
    .dlg{
      width:100%;
      max-width:92vw;
      padding:14px;
      box-sizing:border-box;
      overflow-x:hidden;
      font-family:Arial,sans-serif;
      background:#fff;
    }
    .dlgHead{ font-size:18px; font-weight:700; margin-bottom:12px; }

    /* ✅ tile grid */
    .btnGrid{ display:grid; grid-template-columns:1fr 1fr; gap:12px; }

    /* ✅ tile button */
    .pickBtn{
      height:86px;
      border:1px solid #bbb;
      border-radius:12px;
      background:#fff;
      cursor:pointer;
      display:grid;
      place-items:center;
      padding:10px;
      text-align:center;
    }
    .pickBtn:hover{ border-color:#2f74ff; }

    .txt{
      font-size:14px;
      font-weight:700;
      line-height:1.2;
    }

    .dlgFoot{ margin-top:14px; display:flex; justify-content:flex-end; }
    .btn{
      height:34px;
      padding:0 12px;
      border:1px solid #999;
      background:#fff;
      border-radius:6px;
      cursor:pointer;
    }
  `],
})
export class CoastalSubtypeDialogComponent {
  constructor(
    private ref: MatDialogRef<CoastalSubtypeDialogComponent, CoastalSubtypeDialogResult>
  ) {}

  pick(value: CoastalSubtype) {
    this.ref.close({ value });
  }

  close() {
    this.ref.close();
  }
}