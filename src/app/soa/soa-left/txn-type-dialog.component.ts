import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

export type TxnType = 'NEW' | 'RENEW' | 'MOD';
export type TxnTypeDialogResult = { value: TxnType };

@Component({
  selector: 'app-txn-type-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dlg">
      <div class="dlgHead">Transaction Type</div>

      <!-- ✅ plain checkbox list (no border cards) -->
      <div class="list">
        <label class="row">
          <input
            type="checkbox"
            class="cb"
            [checked]="selected==='NEW'"
            (change)="select('NEW')"
          />
          <span class="txt">New</span>
        </label>

        <label class="row">
          <input
            type="checkbox"
            class="cb"
            [checked]="selected==='RENEW'"
            (change)="select('RENEW')"
          />
          <span class="txt">Renew</span>
        </label>

        <label class="row">
          <input
            type="checkbox"
            class="cb"
            [checked]="selected==='MOD'"
            (change)="select('MOD')"
          />
          <span class="txt">Modification</span>
        </label>
      </div>

      <div class="dlgFoot">
        <button type="button" class="btn" (click)="close()">Cancel</button>
        <button type="button" class="btn primary" [disabled]="!selected" (click)="submit()">Submit</button>
      </div>
    </div>
  `,
  styles: [`
    .dlg { width: 420px; max-width: 92vw; padding: 14px; font-family: Arial, sans-serif; background: #fff; }
    .dlgHead { font-size: 18px; font-weight: 700; margin-bottom: 10px; }

    /* ✅ plain list like your screenshot */
    .list { display: grid; gap: 6px; padding-left: 2px; }
    .row {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-weight: 700;
      font-size: 14px;
      line-height: 1.2;
      user-select: none;
      padding: 0;           /* no tile feel */
      border: none;         /* no border */
      background: transparent;
    }
    .cb { width: 14px; height: 14px; margin: 0; }

    .dlgFoot {
      margin-top: 14px;
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    .btn {
      height: 34px;
      padding: 0 12px;
      border: 1px solid #999;
      background: #fff;
      border-radius: 6px;
      cursor: pointer;
    }
    .btn.primary {
      border-color: #2f74ff;
      background: #2f74ff;
      color: #fff;
    }
    .btn:disabled { opacity: .55; cursor: not-allowed; }
  `]
})
export class TxnTypeDialogComponent {
  selected: TxnType | null = null;

  constructor(private ref: MatDialogRef<TxnTypeDialogComponent, TxnTypeDialogResult>) {}

  // ✅ still single-select (checkbox look)
  select(v: TxnType) {
    this.selected = v;
  }

  submit() {
    if (!this.selected) return;
    this.ref.close({ value: this.selected });
  }

  close() {
    this.ref.close();
  }
}