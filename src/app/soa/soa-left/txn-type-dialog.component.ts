import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

export type TxnType = 'NEW' | 'RENEW' | 'MOD';
export type TxnTypeDialogResult = { value: TxnType[] };

@Component({
  selector: 'app-txn-type-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dlg">
      <div class="dlgHead">Transaction Type</div>

      <div class="list">
        <label class="row" (click)="$event.preventDefault(); toggle('NEW')">
          <input
            type="checkbox"
            class="cb"
            [checked]="isChecked('NEW')"
            tabindex="-1"
            aria-hidden="true"
          />
          <span class="box" [class.on]="isChecked('NEW')"></span>
          <span class="txt">New</span>
        </label>

        <label class="row" (click)="$event.preventDefault(); toggle('RENEW')">
          <input
            type="checkbox"
            class="cb"
            [checked]="isChecked('RENEW')"
            tabindex="-1"
            aria-hidden="true"
          />
          <span class="box" [class.on]="isChecked('RENEW')"></span>
          <span class="txt">Renew</span>
        </label>

        <label class="row" (click)="$event.preventDefault(); toggle('MOD')">
          <input
            type="checkbox"
            class="cb"
            [checked]="isChecked('MOD')"
            tabindex="-1"
            aria-hidden="true"
          />
          <span class="box" [class.on]="isChecked('MOD')"></span>
          <span class="txt">Modification</span>
        </label>
      </div>

      <div class="dlgFoot">
        <button type="button" class="btn" (click)="close()">Cancel</button>
        <button
          type="button"
          class="btn primary"
          [disabled]="selected.length === 0"
          (click)="submit()"
        >
          Submit
        </button>
      </div>
    </div>
  `,
  styles: [`
    .dlg {
      width: 420px;
      max-width: 92vw;
      padding: 14px;
      font-family: Arial, sans-serif;
      background: #fff;
      box-sizing: border-box;
    }

    .dlgHead {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 10px;
    }

    .list {
      display: grid;
      gap: 6px;
      padding-left: 2px;
    }

    .row {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-weight: 700;
      font-size: 14px;
      line-height: 1.2;
      user-select: none;
      padding: 0;
      border: none;
      background: transparent;
    }

    .cb {
      position: absolute;
      opacity: 0;
      width: 0;
      height: 0;
      pointer-events: none;
    }

    .box {
      width: 14px;
      height: 14px;
      border: 1px solid #333;
      border-radius: 2px;
      background: #fff;
      display: inline-block;
      position: relative;
      flex: 0 0 14px;
    }

    .box.on::after {
      content: "";
      position: absolute;
      left: 3px;
      top: 3px;
      width: 7px;
      height: 4px;
      border-left: 2px solid #2f74ff;
      border-bottom: 2px solid #2f74ff;
      transform: rotate(-45deg);
    }

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

    .btn:disabled {
      opacity: .55;
      cursor: not-allowed;
    }
  `],
})
export class TxnTypeDialogComponent {
  selected: TxnType[] = [];

  constructor(
    private ref: MatDialogRef<TxnTypeDialogComponent, TxnTypeDialogResult>
  ) {}

  isChecked(v: TxnType): boolean {
    return this.selected.includes(v);
  }

  toggle(v: TxnType): void {
    const has = this.selected.includes(v);

    if (has) {
      this.selected = this.selected.filter(x => x !== v);
      return;
    }

    // ✅ NEW and RENEW are mutually exclusive
    if (v === 'NEW') {
      this.selected = this.selected.filter(x => x !== 'RENEW');
      this.selected = [...this.selected, 'NEW'];
      return;
    }

    if (v === 'RENEW') {
      this.selected = this.selected.filter(x => x !== 'NEW');
      this.selected = [...this.selected, 'RENEW'];
      return;
    }

    // ✅ MOD can be combined with either NEW or RENEW
    this.selected = [...this.selected, v];
  }

  submit(): void {
    if (this.selected.length === 0) return;
    this.ref.close({ value: this.selected });
  }

  close(): void {
    this.ref.close();
  }
}