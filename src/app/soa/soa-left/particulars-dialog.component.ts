import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

export type ParticularsDialogResult = {
  value: string;
};

@Component({
  selector: 'app-particulars-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dlg">
      <div class="dlgHead">Select Particulars</div>

      <div class="btnGrid">
        <button type="button" class="pickBtn" (click)="pick('ROC')">
          <span class="ico" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M12 2l3 6 7 .9-5 4.6 1.4 6.9L12 17.9 5.6 20.4 7 13.5 2 8.9 9 8z"/>
            </svg>
          </span>
          <span class="txt">ROC</span>
        </button>

        <button type="button" class="pickBtn" (click)="pick('Amateur')">
          <span class="ico" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M12 3c3.9 0 7 3.1 7 7 0 4.6-4.8 9.3-7 11-2.2-1.7-7-6.4-7-11 0-3.9 3.1-7 7-7zm0 3.2a3.8 3.8 0 100 7.6 3.8 3.8 0 000-7.6z"/>
            </svg>
          </span>
          <span class="txt">Amateur</span>
        </button>
      </div>

      <div class="dlgFoot">
        <button type="button" class="btn" (click)="close()">Cancel</button>
      </div>
    </div>
  `,
  styles: [`
    .dlg { width: 420px; max-width: 92vw; padding: 14px; font-family: Arial, sans-serif; }
    .dlgHead { font-size: 18px; font-weight: 700; margin-bottom: 12px; }

    .btnGrid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .pickBtn {
      height: 84px;
      border: 1px solid #bbb;
      border-radius: 10px;
      background: #fff;
      cursor: pointer;
      display: grid;
      place-items: center;
      gap: 6px;
    }
    .pickBtn:hover { border-color: #2f74ff; }

    .ico svg { width: 28px; height: 28px; fill: #2f74ff; }
    .txt { font-size: 14px; font-weight: 700; }

    .dlgFoot { margin-top: 14px; display: flex; justify-content: flex-end; }
    .btn { height: 34px; padding: 0 12px; border: 1px solid #999; background: #fff; border-radius: 6px; cursor: pointer; }
  `]
})
export class ParticularsDialogComponent {
  constructor(private ref: MatDialogRef<ParticularsDialogComponent, ParticularsDialogResult>) {}

  pick(type: 'ROC' | 'Amateur') {
    const value = type; 
    this.ref.close({ value });
  }

  close() {
    this.ref.close();
  }
}
