
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

// match your previous dialog values
export type CoastalSubtype = 'CoastalStations' | 'HF';

// OPTIONS
export type CoastalOption =
  // Coastal Stations options
  | 'HighPoweredAbove100W'
  | 'MediumPowered25To100W'
  | 'LowPowered25WBelow'
  // HF options
  | 'HFHighPowered100W'
  | 'HFMediumPowered25To100W'
  | 'HFLowPowered25WBelow'
  | 'VHF';

export type CoastalOptionsDialogData = {
  subtype: CoastalSubtype;
};

export type CoastalOptionsDialogResult = {
  value: CoastalOption;
};

@Component({
    selector: 'app-coastal-options-dialog',
    imports: [],
    template: `
    <div class="dlg">
      <div class="dlgHead">
        Select Option
        @if (data.subtype === 'CoastalStations') {
          <div class="sub">Coastal Stations</div>
        }
        @if (data.subtype === 'HF') {
          <div class="sub">HIGH FREQUENCY (HF)</div>
        }
      </div>
    
      <!-- COASTAL STATIONS -->
      @if (data.subtype === 'CoastalStations') {
        <div class="btnGrid">
          <button type="button" class="pickBtn" (click)="pick('HighPoweredAbove100W')">
            <span class="txt">High Powered</span>
            <span class="hint">above 100W</span>
          </button>
          <button type="button" class="pickBtn" (click)="pick('MediumPowered25To100W')">
            <span class="txt">Medium Powered</span>
            <span class="hint">above 25W up to 100W</span>
          </button>
          <button type="button" class="pickBtn" (click)="pick('LowPowered25WBelow')">
            <span class="txt">Low Powered</span>
            <span class="hint">25W below</span>
          </button>
        </div>
      }
    
      <!-- HIGH FREQUENCY (HF) -->
      @if (data.subtype === 'HF') {
        <div class="btnGrid">
          <button type="button" class="pickBtn" (click)="pick('HFHighPowered100W')">
            <span class="txt">HF High Powered</span>
            <span class="hint">100W</span>
          </button>
          <button type="button" class="pickBtn" (click)="pick('HFMediumPowered25To100W')">
            <span class="txt">HF Medium Powered</span>
            <span class="hint">25W up to 100W</span>
          </button>
          <button type="button" class="pickBtn" (click)="pick('HFLowPowered25WBelow')">
            <span class="txt">HF Low Powered</span>
            <span class="hint">25W below</span>
          </button>
          <button type="button" class="pickBtn" (click)="pick('VHF')">
            <span class="txt">VHF</span>
            <span class="hint">Option</span>
          </button>
        </div>
      }
    
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
    .dlgHead{ font-size:18px; font-weight:700; margin-bottom:10px; }
    .sub{ margin-top:4px; font-size:12px; font-weight:700; opacity:.75; }

    /* ✅ tile grid */
    .btnGrid{ display:grid; grid-template-columns:1fr 1fr; gap:12px; }

    /* ✅ tile button */
    .pickBtn{
      height:92px;
      border:1px solid #bbb;
      border-radius:12px;
      background:#fff;
      cursor:pointer;
      display:flex;
      flex-direction:column;
      align-items:center;
      justify-content:center;
      padding:10px;
      text-align:center;
    }
    .pickBtn:hover{ border-color:#2f74ff; }

    .txt{ font-size:14px; font-weight:800; line-height:1.15; }
    .hint{ margin-top:6px; font-size:12px; font-weight:700; opacity:.75; line-height:1.2; }

    .dlgFoot{ margin-top:14px; display:flex; justify-content:flex-end; }
    .btn{
      height:34px;
      padding:0 12px;
      border:1px solid #999;
      background:#fff;
      border-radius:6px;
      cursor:pointer;
    }
  `]
})
export class CoastalOptionsDialogComponent {
  constructor(
    private ref: MatDialogRef<CoastalOptionsDialogComponent, CoastalOptionsDialogResult>,
    @Inject(MAT_DIALOG_DATA) public data: CoastalOptionsDialogData
  ) {}

  pick(value: CoastalOption) {
    this.ref.close({ value });
  }

  close() {
    this.ref.close();
  }
}
