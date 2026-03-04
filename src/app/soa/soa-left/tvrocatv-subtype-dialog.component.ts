import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';

export type TvroCatvSubtype =
  | 'TVRO Station License (Commercial / Non-Commercial)'
  | 'CATV Station License';

@Component({
  selector: 'app-tvrocatv-subtype-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  template: `
    <div class="dlg">
      <div class="dlgHead">TVRO / CATV</div>
      <div class="sub">Select Subtype</div>

      <div class="btnGrid">
        <button type="button" class="pickBtn" (click)="pick(options[0])">
          <span class="txt">{{ options[0] }}</span>
        </button>

        <button type="button" class="pickBtn" (click)="pick(options[1])">
          <span class="txt">{{ options[1] }}</span>
        </button>
      </div>

      <div class="dlgFoot">
        <button type="button" class="btn" (click)="close()">Cancel</button>
      </div>
    </div>
  `,
  styles: [`
    .dlg{ width:100%; max-width:92vw; padding:14px; box-sizing:border-box; overflow-x:hidden;
          font-family:Arial,sans-serif; background:#fff; }
    .dlgHead{ font-size:18px; font-weight:700; margin-bottom:4px; }
    .sub{ font-size:12px; opacity:.75; margin-bottom:12px; }

    .btnGrid{ display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .pickBtn{ min-height:70px; border:1px solid #bbb; border-radius:10px; background:#fff;
              cursor:pointer; display:grid; place-items:center; padding:10px; }
    .pickBtn:hover{ border-color:#2f74ff; }
    .txt{ font-size:13px; font-weight:700; text-align:center; padding:0 8px; line-height:1.2; }

    .dlgFoot{ margin-top:14px; display:flex; justify-content:flex-end; }
    .btn{ height:34px; padding:0 12px; border:1px solid #999; background:#fff; border-radius:6px; cursor:pointer; }
  `],
})
export class TvroCatvSubtypeDialogComponent {
  options: TvroCatvSubtype[] = [
    'TVRO Station License (Commercial / Non-Commercial)',
    'CATV Station License',
  ];

  constructor(
    private ref: MatDialogRef<TvroCatvSubtypeDialogComponent, { value: TvroCatvSubtype } | null>
  ) {}

  pick(value: TvroCatvSubtype) {
    this.ref.close({ value });
  }

  close() {
    this.ref.close(null);
  }
}