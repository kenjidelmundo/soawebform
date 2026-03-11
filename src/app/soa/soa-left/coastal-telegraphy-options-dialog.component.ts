import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

export type ShipTxn = 'NEW' | 'RENEW' | 'MOD';
export type CoastalService = 'RADIO_TELEGRAPHY' | 'RADIO_TELEPHONY';
export type CoastalPower =
  | 'HIGH_POWERED'
  | 'MEDIUM_POWERED'
  | 'LOW_POWERED'
  | 'HF'
  | 'VHF';

export type CoastalTelegraphyOptionsResult = {
  txn: ShipTxn[];
  txnMod?: boolean;
  purchasePossess?: boolean;
  purchaseUnits?: number;
  sellTransfer?: boolean;
  sellTransferUnits?: number;
  power: CoastalPower;
  service: CoastalService;
};

@Component({
  selector: 'app-coastal-telegraphy-options-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dlg">
      <div class="title">Coastal Station License</div>
      <div class="sub">Choose service + transaction + powered/band</div>
      <div class="context">Coastal Station License</div>

      <div class="grid">
        <!-- LEFT -->
        <div class="col">
          <div class="head">Transaction</div>

          <label class="row">
            <input class="cb" type="checkbox" [checked]="isCheckedTxn('NEW')" (change)="onTxnChange('NEW', $event)" />
            <span class="txt">New</span>
          </label>

          <label class="row">
            <input class="cb" type="checkbox" [checked]="isCheckedTxn('RENEW')" (change)="onTxnChange('RENEW', $event)" />
            <span class="txt">Renew</span>
          </label>

          <label class="row">
            <input class="cb" type="checkbox" [checked]="isCheckedTxn('MOD')" (change)="onTxnChange('MOD', $event)" />
            <span class="txt">Mod</span>
          </label>

          <label class="row">
            <input class="cb" type="checkbox" [checked]="purchasePossess" (change)="togglePurchasePossess()" />
            <span class="txt">Permit to Purchase/Possess</span>
          </label>
          <div class="unitsRow" *ngIf="purchasePossess">
            <span class="unitsLabel">Units:</span>
            <input class="unitsInput" type="number" min="1" step="1" [value]="purchaseUnits"
              (click)="$event.stopPropagation()" (input)="onPurchaseUnits($event)" />
          </div>

          <label class="row">
            <input class="cb" type="checkbox" [checked]="sellTransfer" (change)="toggleSellTransfer()" />
            <span class="txt">Permit to Sell/Transfer</span>
          </label>
          <div class="unitsRow" *ngIf="sellTransfer">
            <span class="unitsLabel">Units:</span>
            <input class="unitsInput" type="number" min="1" step="1" [value]="sellTransferUnits"
              (click)="$event.stopPropagation()" (input)="onSellUnits($event)" />
          </div>
        </div>

        <!-- POWER / BAND -->
        <div class="col">
          <div class="head">{{ service === 'RADIO_TELEGRAPHY' ? 'Powered' : 'Band' }}</div>

          <ng-container *ngIf="service === 'RADIO_TELEGRAPHY'; else telephony">
          <label class="row">
            <input class="cb" type="checkbox" [checked]="power==='HIGH_POWERED'" (change)="pickPower('HIGH_POWERED')" />
            <span class="txt">High Powered</span>
          </label>

          <label class="row">
            <input class="cb" type="checkbox" [checked]="power==='MEDIUM_POWERED'" (change)="pickPower('MEDIUM_POWERED')" />
            <span class="txt">Medium Powered</span>
          </label>

          <label class="row">
            <input class="cb" type="checkbox" [checked]="power==='LOW_POWERED'" (change)="pickPower('LOW_POWERED')" />
            <span class="txt">Low Powered</span>
          </label>
        </ng-container>

        <ng-template #telephony>
          <label class="row">
            <input class="cb" type="checkbox" [checked]="power==='HF'" (change)="pickPower('HF')" />
            <span class="txt">HF</span>
          </label>

          <label class="row">
            <input class="cb" type="checkbox" [checked]="power==='VHF'" (change)="pickPower('VHF')" />
            <span class="txt">VHF</span>
          </label>
        </ng-template>
      </div>

        <!-- SERVICE -->
        <div class="col">
          <div class="head">Service</div>

          <label class="row">
            <input class="cb" type="checkbox" [checked]="service==='RADIO_TELEGRAPHY'" (change)="pickService('RADIO_TELEGRAPHY')" />
            <span class="txt">Radio Telegraphy</span>
          </label>

          <label class="row">
            <input class="cb" type="checkbox" [checked]="service==='RADIO_TELEPHONY'" (change)="pickService('RADIO_TELEPHONY')" />
            <span class="txt">Radio Telephony</span>
          </label>
        </div>
      </div>

      <div class="foot">
        <button type="button" class="btn" (click)="close()">Cancel</button>
        <button type="button" class="btn primary" [disabled]="(!txnNew && !txnRenew && !txnMod) || !power" (click)="submit()">
          Submit
        </button>
      </div>
    </div>
  `,
  styles: [`
    .dlg{
      width: 100%;
      max-width: 92vw;
      overflow: hidden;
      padding: 14px 16px;
      box-sizing: border-box;
      font-family: Arial, sans-serif;
      background: #fff;
    }
    .title{ font-size: 22px; font-weight: 800; margin: 2px 0; }
    .sub{ font-size: 13px; margin: 0 0 10px; opacity:.9; }
    .context{ text-align:center; font-size:13px; font-weight:700; margin:-4px 0 10px; }

    .grid{ display:grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; align-items:start; }
    .col{ display:grid; gap: 6px; }
    .head{ font-weight: 800; font-size: 14px; margin-bottom: 6px; }
    .row{
      display:flex;
      align-items:center;
      gap: 6px;
      cursor:pointer;
      user-select:none;
      font-weight:700;
      font-size:14px;
      line-height:1.2;
    }
    .unitsRow{ display:flex; align-items:center; gap:8px; padding-left:22px; }
    .unitsLabel{ font-weight:700; font-size:13px; }
    .unitsInput{ width:80px; height:28px; border:1px solid #999; border-radius:4px; padding:0 8px; font-size:13px; }

    /* custom checkbox styling to match reference */
    .cb{
      position:relative;
      width:18px;
      height:18px;
      margin:0 6px 0 0;
      cursor:pointer;
      appearance:none;
      -webkit-appearance:none;
      border:2px solid #5f6368;
      border-radius:3px;
      background:#fff;
      vertical-align:middle;
      flex:0 0 auto;
    }
    .cb:checked{
      border-color:#1e88e5;
    }
    .cb:checked::after{
      content:"";
      position:absolute;
      left:4px;
      top:0px;
      width:6px;
      height:12px;
      border:2px solid #1e88e5;
      border-top:0;
      border-left:0;
      transform:rotate(45deg);
    }

    .foot{ margin-top: 16px; display:flex; justify-content:flex-end; gap: 10px; }
    .btn{ height:34px; padding:0 14px; border:1px solid #999; background:#fff; border-radius:6px; cursor:pointer; }
    .btn.primary{ border-color:#2f74ff; background:#2f74ff; color:#fff; }
    .btn:disabled{ opacity:.55; cursor:not-allowed; }
  `],
})
export class CoastalTelegraphyOptionsDialogComponent {
  txnNew = false;
  txnRenew = false;
  txnMod = false;
  purchasePossess = false;
  purchaseUnits = 1;
  sellTransfer = false;
  sellTransferUnits = 1;
  power: CoastalPower | null = null;
  service: CoastalService = 'RADIO_TELEGRAPHY';
  // contextTitle removed; using fixed heading

  constructor(
    private ref: MatDialogRef<CoastalTelegraphyOptionsDialogComponent, CoastalTelegraphyOptionsResult>
  ) {}

  onTxnChange(v: ShipTxn, ev: Event) {
    const checked = (ev.target as HTMLInputElement)?.checked;
    if (v === 'MOD') {
      this.txnMod = !!checked;
      return;
    }
    if (v === 'NEW') {
      this.txnNew = !!checked;
      if (this.txnNew) this.txnRenew = false;
      return;
    }
    if (v === 'RENEW') {
      this.txnRenew = !!checked;
      if (this.txnRenew) this.txnNew = false;
      return;
    }
  }

  isCheckedTxn(v: ShipTxn): boolean {
    if (v === 'MOD') return this.txnMod;
    if (v === 'NEW') return this.txnNew;
    if (v === 'RENEW') return this.txnRenew;
    return false;
  }
  togglePurchasePossess() {
    this.purchasePossess = !this.purchasePossess;
    if (!this.purchasePossess) this.purchaseUnits = 1;
  }
  toggleSellTransfer() {
    this.sellTransfer = !this.sellTransfer;
    if (!this.sellTransfer) this.sellTransferUnits = 1;
  }
  onPurchaseUnits(ev: Event) {
    const n = Math.max(1, Math.floor(Number((ev.target as HTMLInputElement).value) || 1));
    this.purchaseUnits = n;
  }
  onSellUnits(ev: Event) {
    const n = Math.max(1, Math.floor(Number((ev.target as HTMLInputElement).value) || 1));
    this.sellTransferUnits = n;
  }
  pickPower(v: CoastalPower) { this.power = v; }

  pickService(v: CoastalService) {
    this.service = v;
    // reset power when switching services
    this.power = null;
  }

  submit() {
    if ((!this.txnNew && !this.txnRenew && !this.txnMod) || !this.power || !this.service) return;
    const txnArray: ShipTxn[] = [];
    if (this.txnNew) txnArray.push('NEW');
    if (this.txnRenew) txnArray.push('RENEW');
    if (this.txnMod) txnArray.push('MOD');
    this.ref.close({
      txn: txnArray,
      txnMod: this.txnMod,
      purchasePossess: this.purchasePossess,
      purchaseUnits: this.purchasePossess ? this.purchaseUnits : undefined,
      sellTransfer: this.sellTransfer,
      sellTransferUnits: this.sellTransfer ? this.sellTransferUnits : undefined,
      power: this.power,
      service: this.service
    });
  }

  close() { this.ref.close(); }
}
