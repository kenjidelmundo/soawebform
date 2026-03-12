import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export type TxnType = 'NEW' | 'RENEW' | 'MOD' | 'DUPLICATE';

export type TxnTypeDialogResult = {
  value: TxnType[];
  purchasePossess?: boolean;
  purchasePossessUnits?: number;
  sellTransfer?: boolean;
  sellTransferUnits?: number;
  possessStorage?: boolean;
  possessStorageUnits?: number;
  standaloneUnits?: number;
};

type TxnTypeDialogData = {
  showPurchasePossess?: boolean;
  showSellTransfer?: boolean;
  showPossessStorage?: boolean;
  showStandaloneUnits?: boolean;
  showDuplicate?: boolean;
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

        <div class="unitsRow" *ngIf="showStandaloneUnits && isChecked('NEW')">
          <label class="unitsLabel" for="txnUnitsNew">Unit:</label>
          <input
            id="txnUnitsNew"
            type="number"
            class="unitsInput"
            min="1"
            step="1"
            [value]="standaloneUnits"
            (click)="$event.stopPropagation()"
            (input)="onStandaloneUnitsInput($event)"
          />
        </div>

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

        <div class="unitsRow" *ngIf="showStandaloneUnits && isChecked('RENEW')">
          <label class="unitsLabel" for="txnUnitsRenew">Unit:</label>
          <input
            id="txnUnitsRenew"
            type="number"
            class="unitsInput"
            min="1"
            step="1"
            [value]="standaloneUnits"
            (click)="$event.stopPropagation()"
            (input)="onStandaloneUnitsInput($event)"
          />
        </div>

        <label
          class="row"
          *ngIf="showDuplicate"
          (click)="$event.preventDefault(); toggle('DUPLICATE')"
        >
          <input
            type="checkbox"
            class="cb"
            [checked]="isChecked('DUPLICATE')"
            tabindex="-1"
            aria-hidden="true"
          />
          <span class="box" [class.on]="isChecked('DUPLICATE')"></span>
          <span class="txt">Duplicate</span>
        </label>

        <div class="ppWrap" *ngIf="showSellTransfer">
          <label class="row" (click)="$event.preventDefault(); toggleSellTransfer()">
            <input
              type="checkbox"
              class="cb"
              [checked]="sellTransfer"
              tabindex="-1"
              aria-hidden="true"
            />
            <span class="box" [class.on]="sellTransfer"></span>
            <span class="txt">Permit to Sell/Transfer</span>
          </label>

          <div class="unitsRow" *ngIf="sellTransfer">
            <label class="unitsLabel" for="stUnits">Unit:</label>
            <input
              id="stUnits"
              type="number"
              class="unitsInput"
              min="1"
              step="1"
              [value]="sellTransferUnits"
              (click)="$event.stopPropagation()"
              (input)="onSellTransferUnitsInput($event)"
            />
          </div>
        </div>

        <div class="ppWrap" *ngIf="showPossessStorage">
          <label class="row" (click)="$event.preventDefault(); togglePossessStorage()">
            <input
              type="checkbox"
              class="cb"
              [checked]="possessStorage"
              tabindex="-1"
              aria-hidden="true"
            />
            <span class="box" [class.on]="possessStorage"></span>
            <span class="txt">Possess(Storage)</span>
          </label>

          <div class="unitsRow" *ngIf="possessStorage">
            <label class="unitsLabel" for="psUnits">Unit:</label>
            <input
              id="psUnits"
              type="number"
              class="unitsInput"
              min="1"
              step="1"
              [value]="possessStorageUnits"
              (click)="$event.stopPropagation()"
              (input)="onPossessStorageUnitsInput($event)"
            />
          </div>
        </div>

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

        <div class="unitsRow" *ngIf="showStandaloneUnits && isChecked('MOD')">
          <label class="unitsLabel" for="txnUnitsMod">Unit:</label>
          <input
            id="txnUnitsMod"
            type="number"
            class="unitsInput"
            min="1"
            step="1"
            [value]="standaloneUnits"
            (click)="$event.stopPropagation()"
            (input)="onStandaloneUnitsInput($event)"
          />
        </div>
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
      width: 100%;
      max-width: 100%;
      padding: 14px;
      font-family: Arial, sans-serif;
      background: #fff;
      box-sizing: border-box;
      overflow-x: hidden;
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
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
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
      min-width: 0;
    }

    .ppWrap {
      display: grid;
      gap: 6px;
      align-content: start;
      min-width: 0;
    }

    .unitsRow {
      display: flex;
      align-items: center;
      gap: 8px;
      padding-left: 22px;
      margin-top: -2px;
      min-width: 0;
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
      flex-wrap: wrap;
    }

    .btn {
      height: 34px;
      padding: 0 12px;
      border: 1px solid #999;
      background: #fff;
      border-radius: 6px;
      cursor: pointer;
      flex: 0 0 auto;
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
  sellTransfer = false;
  sellTransferUnits = 1;
  possessStorage = false;
  possessStorageUnits = 1;
  standaloneUnits = 1;

  readonly showPurchasePossess: boolean;
  readonly showSellTransfer: boolean;
  readonly showPossessStorage: boolean;
  readonly showStandaloneUnits: boolean;
  readonly showDuplicate: boolean;
  readonly contextTitle: string;

  constructor(
    private ref: MatDialogRef<TxnTypeDialogComponent, TxnTypeDialogResult>,
    @Inject(MAT_DIALOG_DATA) private data: TxnTypeDialogData | null
  ) {
    this.showPurchasePossess = !!this.data?.showPurchasePossess;
    this.showSellTransfer = !!this.data?.showSellTransfer;
    this.showPossessStorage = !!this.data?.showPossessStorage;
    this.showStandaloneUnits = !!this.data?.showStandaloneUnits;
    this.showDuplicate = !!this.data?.showDuplicate;
    this.contextTitle = String(this.data?.contextTitle ?? '').trim();
  }

  isChecked(v: TxnType): boolean {
    return this.selected.includes(v);
  }

  canSubmit(): boolean {
    if (this.purchasePossess) {
      return Number.isFinite(this.purchasePossessUnits) && this.purchasePossessUnits >= 1;
    }
    if (this.sellTransfer) {
      return Number.isFinite(this.sellTransferUnits) && this.sellTransferUnits >= 1;
    }
    if (this.possessStorage) {
      return Number.isFinite(this.possessStorageUnits) && this.possessStorageUnits >= 1;
    }
    if (this.showStandaloneUnits) {
      return (
        this.selected.length > 0 &&
        Number.isFinite(this.standaloneUnits) &&
        this.standaloneUnits >= 1
      );
    }
    return this.selected.length > 0 || this.sellTransfer || this.possessStorage;
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

  toggleSellTransfer(): void {
    this.sellTransfer = !this.sellTransfer;

    if (!this.sellTransfer) {
      this.sellTransferUnits = 1;
    }
  }

  togglePossessStorage(): void {
    this.possessStorage = !this.possessStorage;

    if (!this.possessStorage) {
      this.possessStorageUnits = 1;
    }
  }

  onUnitsInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const n = Math.floor(Number(input.value));
    this.purchasePossessUnits = Number.isFinite(n) && n >= 1 ? n : 1;
  }

  onPossessStorageUnitsInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const n = Math.floor(Number(input.value));
    this.possessStorageUnits = Number.isFinite(n) && n >= 1 ? n : 1;
  }

  onStandaloneUnitsInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const n = Math.floor(Number(input.value));
    this.standaloneUnits = Number.isFinite(n) && n >= 1 ? n : 1;
  }

  onSellTransferUnitsInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const n = Math.floor(Number(input.value));
    this.sellTransferUnits = Number.isFinite(n) && n >= 1 ? n : 1;
  }

  submit(): void {
    if (!this.canSubmit()) return;

    this.ref.close({
      value: this.selected,
      purchasePossess: this.purchasePossess,
      purchasePossessUnits: this.purchasePossess ? this.purchasePossessUnits : undefined,
      sellTransfer: this.sellTransfer,
      sellTransferUnits: this.sellTransfer ? this.sellTransferUnits : undefined,
      possessStorage: this.possessStorage,
      possessStorageUnits: this.possessStorage ? this.possessStorageUnits : undefined,
      standaloneUnits: this.showStandaloneUnits ? this.standaloneUnits : undefined,
    });
  }

  close(): void {
    this.ref.close();
  }
}
