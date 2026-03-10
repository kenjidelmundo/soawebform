import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

export type CoastalKind = 'RADIO_TELEGRAPHY' | 'RADIO_TELEPHONY';
export type CoastalKindDialogResult = { value: CoastalKind };

@Component({
  selector: 'app-coastal-kind-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dlg">
      <div class="dlgHead">Coastal Station License</div>
      <div class="sub">Choose service</div>

      <div class="list">
        <button type="button" class="row tile" (click)="pick('RADIO_TELEGRAPHY')">
          <span class="txt">Radio Telegraphy</span>
        </button>

        <button type="button" class="row tile" (click)="pick('RADIO_TELEPHONY')">
          <span class="txt">Radio Telephony</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .dlg { width:460px; max-width:92vw; padding:14px; box-sizing:border-box; overflow-x:hidden; font-family:Arial,sans-serif; background:#fff; }
    .dlgHead { font-size:18px; font-weight:700; margin-bottom:4px; }
    .sub { font-size:13px; font-weight:700; margin-bottom:10px; opacity:.85; }
    .list { display:grid; gap:10px; padding-left:0; }
    .row.tile {
      display:flex;
      align-items:center;
      gap:10px;
      cursor:pointer;
      font-weight:700;
      font-size:14px;
      user-select:none;
      width:100%;
      text-align:left;
      padding:10px 12px;
      border:1px solid #d0d0d0;
      border-radius:10px;
      background:#fff;
      transition: box-shadow .12s ease, border-color .12s ease, transform .02s ease;
    }
    .row.tile:hover { border-color:#9db9ff; box-shadow:0 2px 10px rgba(0,0,0,.06); }
    .row.tile:active { transform: translateY(1px); }
    .txt { font-size:14px; font-weight:700; }
  `]
})
export class CoastalKindDialogComponent {
  constructor(private ref: MatDialogRef<CoastalKindDialogComponent, CoastalKindDialogResult>) {}

  pick(v: CoastalKind) { this.ref.close({ value: v }); }
  close() { this.ref.close(); }
}
