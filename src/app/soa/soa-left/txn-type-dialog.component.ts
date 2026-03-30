
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
  action?: 'submit' | 'back';
};

type TxnTypeDialogData = {
  showPurchasePossess?: boolean;
  showSellTransfer?: boolean;
  showPossessStorage?: boolean;
  showStandaloneUnits?: boolean;
  showDuplicate?: boolean;
  allowDuplicateOnly?: boolean;
  contextTitle?: string;
  showBack?: boolean;
  onBack?: (result: TxnTypeDialogResult) => void;
};

@Component({
    selector: 'app-txn-type-dialog',
    imports: [],
    template: `
    <div class="txnDlg">
      <div class="txnDlgHead">Transaction Type</div>
      @if (contextTitle) {
        <div class="txnContextTitle">{{ contextTitle }}</div>
      }

      <div class="txnList" [class.twoCol]="showPurchasePossess">
        <div class="txnWrap">
          <label class="txnRow" (click)="$event.preventDefault(); toggle('NEW')">
            <input
              type="checkbox"
              class="txnCb"
              [checked]="isChecked('NEW')"
              tabindex="-1"
              aria-hidden="true"
            />
            <span class="txnBox" [class.on]="isChecked('NEW')"></span>
            <span class="txnText">New</span>
          </label>

          @if (showStandaloneUnits && isChecked('NEW')) {
            <div class="txnUnitsRow">
              <label class="txnUnitsLabel" for="txnUnitsNew">Unit:</label>
              <input
                id="txnUnitsNew"
                type="number"
                class="txnUnitsInput"
                min="1"
                step="1"
                [value]="standaloneUnits"
                (click)="$event.stopPropagation()"
                (input)="onStandaloneUnitsInput($event)"
              />
            </div>
          }
        </div>

        @if (showPurchasePossess) {
          <div class="txnWrap">
            <label class="txnRow" (click)="$event.preventDefault(); togglePurchasePossess()">
              <input
                type="checkbox"
                class="txnCb"
                [checked]="purchasePossess"
                tabindex="-1"
                aria-hidden="true"
              />
              <span class="txnBox" [class.on]="purchasePossess"></span>
              <span class="txnText">Purchase and Possess</span>
            </label>
            @if (purchasePossess) {
              <div class="txnUnitsRow">
                <label class="txnUnitsLabel" for="ppUnits">Unit:</label>
                <input
                  id="ppUnits"
                  type="number"
                  class="txnUnitsInput"
                  min="1"
                  step="1"
                  [value]="purchasePossessUnits"
                  (click)="$event.stopPropagation()"
                  (input)="onUnitsInput($event)"
                />
              </div>
            }
          </div>
        }

        <div class="txnWrap">
          <label class="txnRow" (click)="$event.preventDefault(); toggle('RENEW')">
            <input
              type="checkbox"
              class="txnCb"
              [checked]="isChecked('RENEW')"
              tabindex="-1"
              aria-hidden="true"
            />
            <span class="txnBox" [class.on]="isChecked('RENEW')"></span>
            <span class="txnText">Renew</span>
          </label>

          @if (showStandaloneUnits && isChecked('RENEW')) {
            <div class="txnUnitsRow">
              <label class="txnUnitsLabel" for="txnUnitsRenew">Unit:</label>
              <input
                id="txnUnitsRenew"
                type="number"
                class="txnUnitsInput"
                min="1"
                step="1"
                [value]="standaloneUnits"
                (click)="$event.stopPropagation()"
                (input)="onStandaloneUnitsInput($event)"
              />
            </div>
          }
        </div>

        @if (showDuplicate) {
          <label class="txnRow" (click)="$event.preventDefault(); toggle('DUPLICATE')">
            <input
              type="checkbox"
              class="txnCb"
              [checked]="isChecked('DUPLICATE')"
              tabindex="-1"
              aria-hidden="true"
            />
            <span class="txnBox" [class.on]="isChecked('DUPLICATE')"></span>
            <span class="txnText">Duplicate</span>
          </label>
        }

        @if (showSellTransfer) {
          <div class="txnWrap">
            <label class="txnRow" (click)="$event.preventDefault(); toggleSellTransfer()">
              <input
                type="checkbox"
                class="txnCb"
                [checked]="sellTransfer"
                tabindex="-1"
                aria-hidden="true"
              />
              <span class="txnBox" [class.on]="sellTransfer"></span>
              <span class="txnText">Permit to Sell/Transfer</span>
            </label>
            @if (sellTransfer) {
              <div class="txnUnitsRow">
                <label class="txnUnitsLabel" for="stUnits">Unit:</label>
                <input
                  id="stUnits"
                  type="number"
                  class="txnUnitsInput"
                  min="1"
                  step="1"
                  [value]="sellTransferUnits"
                  (click)="$event.stopPropagation()"
                  (input)="onSellTransferUnitsInput($event)"
                />
              </div>
            }
          </div>
        }

        @if (showPossessStorage) {
          <div class="txnWrap">
            <label class="txnRow" (click)="$event.preventDefault(); togglePossessStorage()">
              <input
                type="checkbox"
                class="txnCb"
                [checked]="possessStorage"
                tabindex="-1"
                aria-hidden="true"
              />
              <span class="txnBox" [class.on]="possessStorage"></span>
              <span class="txnText">Possess(Storage)</span>
            </label>
            @if (possessStorage) {
              <div class="txnUnitsRow">
                <label class="txnUnitsLabel" for="psUnits">Unit:</label>
                <input
                  id="psUnits"
                  type="number"
                  class="txnUnitsInput"
                  min="1"
                  step="1"
                  [value]="possessStorageUnits"
                  (click)="$event.stopPropagation()"
                  (input)="onPossessStorageUnitsInput($event)"
                />
              </div>
            }
          </div>
        }

        <div class="txnWrap">
          <label class="txnRow" (click)="$event.preventDefault(); toggle('MOD')">
            <input
              type="checkbox"
              class="txnCb"
              [checked]="isChecked('MOD')"
              tabindex="-1"
              aria-hidden="true"
            />
            <span class="txnBox" [class.on]="isChecked('MOD')"></span>
            <span class="txnText">Modification</span>
          </label>

          @if (showStandaloneUnits && isChecked('MOD')) {
            <div class="txnUnitsRow">
              <label class="txnUnitsLabel" for="txnUnitsMod">Unit:</label>
              <input
                id="txnUnitsMod"
                type="number"
                class="txnUnitsInput"
                min="1"
                step="1"
                [value]="standaloneUnits"
                (click)="$event.stopPropagation()"
                (input)="onStandaloneUnitsInput($event)"
              />
            </div>
          }
        </div>
      </div>

      <div class="txnFoot">
        @if (showBack) {
          <button type="button" class="txnBtn" (click)="back()">Back</button>
        }
        <button type="button" class="txnBtn" (click)="close()">Cancel</button>
        <button
          type="button"
          class="txnBtn txnBtnPrimary"
          [disabled]="!canSubmit()"
          (click)="submit()"
        >
          Submit
        </button>
      </div>
    </div>
    `,
    styles: [`
    .txnDlg {
      width: 100%;
      max-width: 760px;
      padding: 18px 18px 16px;
      font-family: Arial, sans-serif;
      background: #fff;
      box-sizing: border-box;
      overflow: hidden;
    }

    .txnDlgHead {
      font-size: 24px;
      font-weight: 800;
      color: #111;
      margin-bottom: 8px;
    }

    .txnContextTitle {
      text-align: center;
      font-size: 15px;
      font-weight: 700;
      color: #1d1d1d;
      margin-bottom: 16px;
    }

    .txnList {
      display: grid;
      gap: 10px 28px;
      align-items: start;
    }

    .txnList.twoCol {
      grid-template-columns: repeat(2, minmax(240px, 1fr));
      align-items: start;
    }

    .txnRow {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-weight: 800;
      font-size: 14px;
      line-height: 1.25;
      user-select: none;
      padding: 0;
      border: none;
      background: transparent;
      min-width: 0;
    }

    .txnWrap {
      display: grid;
      gap: 6px;
      align-content: start;
      min-width: 0;
    }

    .txnUnitsRow {
      display: flex;
      align-items: center;
      gap: 8px;
      padding-left: 28px;
      margin-top: -1px;
      min-width: 0;
    }

    .txnUnitsLabel {
      font-size: 13px;
      font-weight: 700;
      min-width: 36px;
      color: #42536a;
    }

    .txnUnitsInput {
      width: 96px;
      height: 34px;
      border: 1px solid #b8c0cc;
      border-radius: 8px;
      padding: 0 8px;
      font-size: 14px;
      box-sizing: border-box;
    }

    .txnCb {
      position: absolute;
      opacity: 0;
      width: 0;
      height: 0;
      pointer-events: none;
    }

    .txnBox {
      width: 14px;
      height: 14px;
      border: 1px solid #727272;
      border-radius: 2px;
      background: #fff;
      display: inline-block;
      position: relative;
      flex: 0 0 14px;
    }

    .txnBox.on::after {
      content: "";
      position: absolute;
      left: 3px;
      top: 1px;
      width: 4px;
      height: 8px;
      border-right: 2px solid #2f74ff;
      border-bottom: 2px solid #2f74ff;
      transform: rotate(45deg);
    }

    .txnText {
      display: inline-block;
      cursor: pointer;
    }

    .txnFoot {
      margin-top: 20px;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      flex-wrap: wrap;
    }

    .txnBtn {
      height: 36px;
      padding: 0 16px;
      border: 1px solid #b5bcc6;
      background: #fff;
      border-radius: 8px;
      cursor: pointer;
      flex: 0 0 auto;
      font-size: 14px;
    }

    .txnBtnPrimary {
      border-color: #8db2ff;
      background: #8db2ff;
      color: #fff;
    }

    .txnBtn:disabled {
      opacity: .55;
      cursor: not-allowed;
    }

    @media (max-width: 620px) {
      .txnList.twoCol {
        grid-template-columns: 1fr;
      }
    }
  `]
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
  readonly allowDuplicateOnly: boolean;
  readonly contextTitle: string;
  readonly showBack: boolean;

  constructor(
    private ref: MatDialogRef<TxnTypeDialogComponent, TxnTypeDialogResult>,
    @Inject(MAT_DIALOG_DATA) private data: TxnTypeDialogData | null
  ) {
    this.showPurchasePossess = !!this.data?.showPurchasePossess;
    this.showSellTransfer = !!this.data?.showSellTransfer;
    this.showPossessStorage = !!this.data?.showPossessStorage;
    this.showStandaloneUnits = !!this.data?.showStandaloneUnits;
    this.showDuplicate = !!this.data?.showDuplicate;
    this.allowDuplicateOnly = !!this.data?.allowDuplicateOnly;
    this.contextTitle = String(this.data?.contextTitle ?? '').trim();
    this.showBack =
      !!this.data?.showBack ||
      this.contextTitle.toUpperCase().includes('VHF/UHF RADIO STATIONS');
  }

  isChecked(v: TxnType): boolean {
    return this.selected.includes(v);
  }

  private hasPrimaryTxnSelected(): boolean {
    return this.selected.some((t) => t !== 'DUPLICATE');
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
        (this.hasPrimaryTxnSelected() || (this.allowDuplicateOnly && this.isChecked('DUPLICATE'))) &&
        Number.isFinite(this.standaloneUnits) &&
        this.standaloneUnits >= 1
      );
    }
    return (
      this.hasPrimaryTxnSelected() ||
      (this.allowDuplicateOnly && this.isChecked('DUPLICATE')) ||
      this.sellTransfer ||
      this.possessStorage ||
      this.purchasePossess
    );
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

  private buildResult(action: 'submit' | 'back'): TxnTypeDialogResult {
    return {
      value: this.selected,
      purchasePossess: this.purchasePossess,
      purchasePossessUnits: this.purchasePossess ? this.purchasePossessUnits : undefined,
      sellTransfer: this.sellTransfer,
      sellTransferUnits: this.sellTransfer ? this.sellTransferUnits : undefined,
      possessStorage: this.possessStorage,
      possessStorageUnits: this.possessStorage ? this.possessStorageUnits : undefined,
      standaloneUnits: this.showStandaloneUnits ? this.standaloneUnits : undefined,
      action,
    };
  }

  submit(): void {
    if (!this.canSubmit()) return;

    this.ref.close(this.buildResult('submit'));
  }

  back(): void {
    const result = this.buildResult('back');
    this.data?.onBack?.(result);
    this.ref.close(result);
  }

  close(): void {
    this.ref.close();
  }
}
