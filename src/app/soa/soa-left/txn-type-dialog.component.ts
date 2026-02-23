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

      <div class="grid">
        <button type="button" class="opt" [class.on]="selected==='NEW'" (click)="select('NEW')">NEW</button>
        <button type="button" class="opt" [class.on]="selected==='RENEW'" (click)="select('RENEW')">RENEW</button>
        <button type="button" class="opt" [class.on]="selected==='MOD'" (click)="select('MOD')">MOD</button>
      </div>

      <div class="dlgFoot">
        <button type="button" class="btn" (click)="close()">Cancel</button>
        <button type="button" class="btn primary" [disabled]="!selected" (click)="submit()">Submit</button>
      </div>
    </div>
  `,
  styles: [`
    .dlg { width: 420px; max-width: 92vw; padding: 14px; font-family: Arial, sans-serif; }
    .dlgHead { font-size: 18px; font-weight: 700; margin-bottom: 12px; }

    .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
    .opt {
      height: 48px;
      border: 1px solid #bbb;
      border-radius: 10px;
      background: #fff;
      cursor: pointer;
      font-weight: 700;
    }
    .opt:hover { border-color: #2f74ff; }
    .opt.on { border-color: #2f74ff; outline: 2px solid rgba(47,116,255,.25); }

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