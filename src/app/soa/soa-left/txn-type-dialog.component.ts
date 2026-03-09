import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export type TxnType = 'NEW' | 'RENEW' | 'MOD';

export type TxnTypeDialogResult = {
  value: TxnType[];
  purchasePossess?: boolean;
  purchasePossessUnits?: number;
};

type TxnTypeDialogData = {
  showPurchasePossess?: boolean;
  contextTitle?: string;
};

@Component({
  selector: 'app-txn-type-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dlg">
      <div class="dlgHead">Transaction Type</div>
      <div class="contextTitle" *ngIf="contextTitle">{{ contextTitle }}</div>

      <div class="list" [class.twoCol]="showPurchasePossess">
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

        <div class="ppWrap" *ngIf="showPurchasePossess">
          <label
            class="row"
            (click)="$event.preventDefault(); togglePurchasePossess()"
          >
            <input
              type="checkbox"
              class="cb"
              [checked]="purchasePossess"
              tabindex="-1"
              aria-hidden="true"
            />
            <span class="box" [class.on]="purchasePossess"></span>
            <span class="txt">Purchase and Possess</span>
          </label>

          <div class="unitsRow" *ngIf="purchasePossess">
            <label class="unitsLabel" for="ppUnits">Unit:</label>
            <input
              id="ppUnits"
              type="number"
              class="unitsInput"
              min="1"
              step="1"
              [value]="purchasePossessUnits"
              (click)="$event.stopPropagation()"
              (input)="onUnitsInput($event)"
            />
          </div>
        </div>

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
          [disabled]="!canSubmit()"
          (click)="submit()"
        >
          Submit
        </button>
      </div>
    </div>
  `,
  styles: [`
    .dlg {
      width: 520px;
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

    .contextTitle {
      text-align: center;
      font-size: 13px;
      font-weight: 700;
      margin-bottom: 10px;
    }

    .list {
      display: grid;
      gap: 6px 18px;
      padding-left: 2px;
    }

    .list.twoCol {
      grid-template-columns: 1fr 1fr;
      align-items: start;
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

    .ppWrap {
      display: grid;
      gap: 6px;
      align-content: start;
    }

    .unitsRow {
      display: flex;
      align-items: center;
      gap: 8px;
      padding-left: 22px;
      margin-top: -2px;
    }

    .unitsLabel {
      font-size: 13px;
      font-weight: 700;
      min-width: 34px;
    }

    .unitsInput {
      width: 90px;
      height: 28px;
      border: 1px solid #999;
      border-radius: 4px;
      padding: 0 8px;
      font-size: 13px;
      box-sizing: border-box;
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
  purchasePossess = false;
  purchasePossessUnits = 1;

  readonly showPurchasePossess: boolean;
  readonly contextTitle: string;

  constructor(
    private ref: MatDialogRef<TxnTypeDialogComponent, TxnTypeDialogResult>,
    @Inject(MAT_DIALOG_DATA) private data: TxnTypeDialogData | null
  ) {
    this.showPurchasePossess = !!this.data?.showPurchasePossess;
    this.contextTitle = String(this.data?.contextTitle ?? '').trim();
  }

  isChecked(v: TxnType): boolean {
    return this.selected.includes(v);
  }

  canSubmit(): boolean {
    if (this.purchasePossess) {
      return Number.isFinite(this.purchasePossessUnits) && this.purchasePossessUnits >= 1;
    }
    return this.selected.length > 0;
  }

  toggle(v: TxnType): void {
    const has = this.selected.includes(v);

    if (has) {
      this.selected = this.selected.filter(x => x !== v);
      return;
    }

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

    this.selected = [...this.selected, v];
  }

  togglePurchasePossess(): void {
    this.purchasePossess = !this.purchasePossess;

    if (!this.purchasePossess) {
      this.purchasePossessUnits = 1;
    }
  }

  onUnitsInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const n = Math.floor(Number(input.value));
    this.purchasePossessUnits = Number.isFinite(n) && n >= 1 ? n : 1;
  }

  submit(): void {
    if (!this.canSubmit()) return;

    this.ref.close({
      value: this.selected,
      purchasePossess: this.purchasePossess,
      purchasePossessUnits: this.purchasePossess ? this.purchasePossessUnits : undefined,
    });
  }

  close(): void {
    this.ref.close();
  }
}