
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
  duplicate?: boolean;
  purchasePossess?: boolean;
  purchaseUnits?: number;
  sellTransfer?: boolean;
  sellTransferUnits?: number;
  power: CoastalPower;
  service: CoastalService;
};

@Component({
    selector: 'app-coastal-telegraphy-options-dialog',
    imports: [],
    template: `
    <div class="coastalTxnDlg">
      <div class="coastalTxnTitle">Coastal Station License</div>
      <div class="coastalTxnSub">Choose service + transaction + powered/band</div>
      <div class="coastalTxnContext">Coastal Station License</div>

      <div class="coastalTxnGrid">
        <div class="coastalTxnCol">
          <div class="coastalTxnHead">Transaction</div>

          <label class="coastalTxnRow" (click)="$event.preventDefault(); toggleTxn('NEW')">
            <input class="coastalTxnCb" type="checkbox" [checked]="isCheckedTxn('NEW')" tabindex="-1" aria-hidden="true" />
            <span class="coastalTxnBox" [class.on]="isCheckedTxn('NEW')"></span>
            <span class="coastalTxnText">New</span>
          </label>

          <label class="coastalTxnRow" (click)="$event.preventDefault(); toggleTxn('RENEW')">
            <input class="coastalTxnCb" type="checkbox" [checked]="isCheckedTxn('RENEW')" tabindex="-1" aria-hidden="true" />
            <span class="coastalTxnBox" [class.on]="isCheckedTxn('RENEW')"></span>
            <span class="coastalTxnText">Renew</span>
          </label>

          <label class="coastalTxnRow" (click)="$event.preventDefault(); toggleTxn('MOD')">
            <input class="coastalTxnCb" type="checkbox" [checked]="isCheckedTxn('MOD')" tabindex="-1" aria-hidden="true" />
            <span class="coastalTxnBox" [class.on]="isCheckedTxn('MOD')"></span>
            <span class="coastalTxnText">Mod</span>
          </label>

          <label class="coastalTxnRow" (click)="$event.preventDefault(); toggleDuplicate()">
            <input class="coastalTxnCb" type="checkbox" [checked]="duplicate" tabindex="-1" aria-hidden="true" />
            <span class="coastalTxnBox" [class.on]="duplicate"></span>
            <span class="coastalTxnText">Duplicate</span>
          </label>

          <label class="coastalTxnRow" (click)="$event.preventDefault(); togglePurchasePossess()">
            <input class="coastalTxnCb" type="checkbox" [checked]="purchasePossess" tabindex="-1" aria-hidden="true" />
            <span class="coastalTxnBox" [class.on]="purchasePossess"></span>
            <span class="coastalTxnText">Permit to Purchase/Possess</span>
          </label>
          @if (purchasePossess) {
            <div class="coastalTxnUnitsRow">
              <span class="coastalTxnUnitsLabel">Units:</span>
              <input
                class="coastalTxnUnitsInput"
                type="number"
                min="1"
                step="1"
                [value]="purchaseUnits"
                (click)="$event.stopPropagation()"
                (input)="onPurchaseUnits($event)"
              />
            </div>
          }

          <label class="coastalTxnRow" (click)="$event.preventDefault(); toggleSellTransfer()">
            <input class="coastalTxnCb" type="checkbox" [checked]="sellTransfer" tabindex="-1" aria-hidden="true" />
            <span class="coastalTxnBox" [class.on]="sellTransfer"></span>
            <span class="coastalTxnText">Permit to Sell/Transfer</span>
          </label>
          @if (sellTransfer) {
            <div class="coastalTxnUnitsRow">
              <span class="coastalTxnUnitsLabel">Units:</span>
              <input
                class="coastalTxnUnitsInput"
                type="number"
                min="1"
                step="1"
                [value]="sellTransferUnits"
                (click)="$event.stopPropagation()"
                (input)="onSellUnits($event)"
              />
            </div>
          }
        </div>

        <div class="coastalTxnCol">
          <div class="coastalTxnHead">{{ service === 'RADIO_TELEGRAPHY' ? 'Powered' : 'Band' }}</div>

          @if (service === 'RADIO_TELEGRAPHY') {
            <label class="coastalTxnRow" (click)="pickPower('HIGH_POWERED')">
              <input class="coastalTxnCb" type="checkbox" [checked]="power==='HIGH_POWERED'" tabindex="-1" aria-hidden="true" />
              <span class="coastalTxnBox" [class.on]="power==='HIGH_POWERED'"></span>
              <span class="coastalTxnText">High Powered</span>
            </label>
            <label class="coastalTxnRow" (click)="pickPower('MEDIUM_POWERED')">
              <input class="coastalTxnCb" type="checkbox" [checked]="power==='MEDIUM_POWERED'" tabindex="-1" aria-hidden="true" />
              <span class="coastalTxnBox" [class.on]="power==='MEDIUM_POWERED'"></span>
              <span class="coastalTxnText">Medium Powered</span>
            </label>
            <label class="coastalTxnRow" (click)="pickPower('LOW_POWERED')">
              <input class="coastalTxnCb" type="checkbox" [checked]="power==='LOW_POWERED'" tabindex="-1" aria-hidden="true" />
              <span class="coastalTxnBox" [class.on]="power==='LOW_POWERED'"></span>
              <span class="coastalTxnText">Low Powered</span>
            </label>
          } @else {
            <label class="coastalTxnRow" (click)="pickPower('HF')">
              <input class="coastalTxnCb" type="checkbox" [checked]="power==='HF'" tabindex="-1" aria-hidden="true" />
              <span class="coastalTxnBox" [class.on]="power==='HF'"></span>
              <span class="coastalTxnText">HF</span>
            </label>
            <label class="coastalTxnRow" (click)="pickPower('VHF')">
              <input class="coastalTxnCb" type="checkbox" [checked]="power==='VHF'" tabindex="-1" aria-hidden="true" />
              <span class="coastalTxnBox" [class.on]="power==='VHF'"></span>
              <span class="coastalTxnText">VHF</span>
            </label>
          }
        </div>

        <div class="coastalTxnCol">
          <div class="coastalTxnHead">Service</div>

          <label class="coastalTxnRow" (click)="pickService('RADIO_TELEGRAPHY')">
            <input class="coastalTxnCb" type="checkbox" [checked]="service==='RADIO_TELEGRAPHY'" tabindex="-1" aria-hidden="true" />
            <span class="coastalTxnBox" [class.on]="service==='RADIO_TELEGRAPHY'"></span>
            <span class="coastalTxnText">Radio Telegraphy</span>
          </label>

          <label class="coastalTxnRow" (click)="pickService('RADIO_TELEPHONY')">
            <input class="coastalTxnCb" type="checkbox" [checked]="service==='RADIO_TELEPHONY'" tabindex="-1" aria-hidden="true" />
            <span class="coastalTxnBox" [class.on]="service==='RADIO_TELEPHONY'"></span>
            <span class="coastalTxnText">Radio Telephony</span>
          </label>
        </div>
      </div>

      <div class="coastalTxnFoot">
        <button type="button" class="coastalTxnBtn" (click)="close()">Cancel</button>
        <button type="button" class="coastalTxnBtn coastalTxnBtnPrimary" [disabled]="(!txnNew && !txnRenew && !txnMod) || !power" (click)="submit()">
          Submit
        </button>
      </div>
    </div>
    `,
    styles: [`
    .coastalTxnDlg{
      width: 100%;
      max-width: 900px;
      overflow: hidden;
      padding: 18px 20px 16px;
      box-sizing: border-box;
      font-family: Arial, sans-serif;
      background: #fff;
    }

    .coastalTxnTitle{
      font-size: 22px;
      font-weight: 800;
      margin: 0 0 2px;
      color:#101010;
    }

    .coastalTxnSub{
      font-size: 13px;
      margin: 0 0 8px;
      color:#4c4c4c;
    }

    .coastalTxnContext{
      text-align:center;
      font-size:14px;
      font-weight:700;
      color:#243852;
      margin: 0 0 14px;
    }

    .coastalTxnGrid{
      display:grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 34px;
      align-items:start;
    }

    .coastalTxnCol{
      display:grid;
      gap: 10px;
    }

    .coastalTxnHead{
      font-weight: 800;
      font-size: 15px;
      color:#1e2f4b;
      margin-bottom: 2px;
    }

    .coastalTxnRow{
      display:flex;
      align-items:center;
      gap: 10px;
      cursor:pointer;
      user-select:none;
      font-weight:800;
      font-size:15px;
      line-height:1.2;
      min-width: 0;
    }

    .coastalTxnText{
      white-space: nowrap;
      color: #223754;
    }

    .coastalTxnUnitsRow{
      display:flex;
      align-items:center;
      gap:8px;
      padding-left:28px;
    }

    .coastalTxnUnitsLabel{
      font-weight:700;
      font-size:13px;
    }

    .coastalTxnUnitsInput{
      width:84px;
      height:32px;
      border:1px solid #b8c0cc;
      border-radius:8px;
      padding:0 8px;
      font-size:13px;
    }

    .coastalTxnCb{
      position:absolute;
      opacity:0;
      width:0;
      height:0;
      pointer-events:none;
    }

    .coastalTxnBox{
      width:14px;
      height:14px;
      border:1px solid #727272;
      border-radius:2px;
      background:#fff;
      display:inline-block;
      position:relative;
      flex:0 0 14px;
    }

    .coastalTxnBox.on::after{
      content:"";
      position:absolute;
      left:3px;
      top:1px;
      width:4px;
      height:8px;
      border-right:2px solid #2f74ff;
      border-bottom:2px solid #2f74ff;
      transform: rotate(45deg);
    }

    .coastalTxnFoot{
      margin-top: 20px;
      display:flex;
      justify-content:flex-end;
      gap: 10px;
    }

    .coastalTxnBtn{
      height:36px;
      padding:0 16px;
      border:1px solid #b5bcc6;
      background:#fff;
      border-radius:8px;
      cursor:pointer;
      font-size:14px;
    }

    .coastalTxnBtnPrimary{
      border-color:#2f74ff;
      background:#8db2ff;
      color:#fff;
    }

    .coastalTxnBtn:disabled{
      opacity:.55;
      cursor:not-allowed;
    }
  `]
})
export class CoastalTelegraphyOptionsDialogComponent {
  txnNew = false;
  txnRenew = false;
  txnMod = false;
  duplicate = false;
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

  toggleTxn(v: ShipTxn) {
    if (v === 'MOD') {
      this.txnMod = !this.txnMod;
      return;
    }
    if (v === 'NEW') {
      this.txnNew = !this.txnNew;
      if (this.txnNew) this.txnRenew = false;
      return;
    }
    if (v === 'RENEW') {
      this.txnRenew = !this.txnRenew;
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
  toggleDuplicate() {
    this.duplicate = !this.duplicate;
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
      duplicate: this.duplicate,
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
