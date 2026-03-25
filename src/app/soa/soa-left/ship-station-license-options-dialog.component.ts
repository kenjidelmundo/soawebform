
import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { ShipLicenseScope } from './ship-station-license-scope-dialog.component';

export type ShipTxn =
  | 'NEW'
  | 'RENEW'
  | 'MOD'
  | 'DUPLICATE'
  | 'PURCHASE_POSSESS'
  | 'SELL_TRANSFER'
  | 'POSSESS_STORAGE';

export type ShipPower =
  | 'HIGH_POWERED'
  | 'MEDIUM_POWERED'
  | 'LOW_POWERED'
  | 'SESCL_LRIT_SSAS_SESFB';

export type ShipStationLicenseOptionsResult = {
  txns: ShipTxn[];
  power: ShipPower;
  scope: ShipLicenseScope;
  purchasePossessUnits?: number;
  sellTransferUnits?: number;
  possessStorageUnits?: number;
};

export type ShipStationLicenseOptionsDialogResult = ShipStationLicenseOptionsResult;

@Component({
    selector: 'app-ship-station-license-options-dialog',
    imports: [],
    template: `
    <div class="dlg">
      <div class="title">Ship Station License</div>
      <div class="sub">Choose transaction + power / option + scope</div>
    
      <div class="grid">
        <!-- TRANSACTION -->
        <div class="col">
          <div class="head">Transaction</div>
    
          <label class="row" (click)="onTxnClick($event, 'NEW')">
            <input class="cb" type="checkbox" [checked]="isTxnChecked('NEW')" tabindex="-1" aria-hidden="true" />
            <span class="box" [class.on]="isTxnChecked('NEW')"></span>
            <span class="txt">New</span>
          </label>
    
          <label class="row" (click)="onTxnClick($event, 'RENEW')">
            <input class="cb" type="checkbox" [checked]="isTxnChecked('RENEW')" tabindex="-1" aria-hidden="true" />
            <span class="box" [class.on]="isTxnChecked('RENEW')"></span>
            <span class="txt">Renew</span>
          </label>
    
          <label class="row" (click)="onTxnClick($event, 'MOD')">
            <input class="cb" type="checkbox" [checked]="isTxnChecked('MOD')" tabindex="-1" aria-hidden="true" />
            <span class="box" [class.on]="isTxnChecked('MOD')"></span>
            <span class="txt">Mod</span>
          </label>
    
          <label class="row" (click)="onTxnClick($event, 'DUPLICATE')">
            <input class="cb" type="checkbox" [checked]="isTxnChecked('DUPLICATE')" tabindex="-1" aria-hidden="true" />
            <span class="box" [class.on]="isTxnChecked('DUPLICATE')"></span>
            <span class="txt">Duplicate</span>
          </label>
    
          <label class="row" (click)="onTxnClick($event, 'PURCHASE_POSSESS')">
            <input class="cb" type="checkbox" [checked]="isTxnChecked('PURCHASE_POSSESS')" tabindex="-1" aria-hidden="true" />
            <span class="box" [class.on]="isTxnChecked('PURCHASE_POSSESS')"></span>
            <span class="txt">Permit to Purchase / Possess</span>
          </label>
          @if (isTxnChecked('PURCHASE_POSSESS')) {
            <div class="unitRow">
              <span class="unitLabel">Unit:</span>
              <input
                class="unitInput"
                type="number"
                min="1"
                step="1"
                [value]="purchasePossessUnits"
                (click)="$event.stopPropagation()"
                (input)="onUnitsInput($event, 'PURCHASE_POSSESS')"
                />
            </div>
          }
    
          <label class="row" (click)="onTxnClick($event, 'SELL_TRANSFER')">
            <input class="cb" type="checkbox" [checked]="isTxnChecked('SELL_TRANSFER')" tabindex="-1" aria-hidden="true" />
            <span class="box" [class.on]="isTxnChecked('SELL_TRANSFER')"></span>
            <span class="txt">Permit to Sell / Transfer</span>
          </label>
          @if (isTxnChecked('SELL_TRANSFER')) {
            <div class="unitRow">
              <span class="unitLabel">Unit:</span>
              <input
                class="unitInput"
                type="number"
                min="1"
                step="1"
                [value]="sellTransferUnits"
                (click)="$event.stopPropagation()"
                (input)="onUnitsInput($event, 'SELL_TRANSFER')"
                />
            </div>
          }
    
          <label class="row" (click)="onTxnClick($event, 'POSSESS_STORAGE')">
            <input class="cb" type="checkbox" [checked]="isTxnChecked('POSSESS_STORAGE')" tabindex="-1" aria-hidden="true" />
            <span class="box" [class.on]="isTxnChecked('POSSESS_STORAGE')"></span>
            <span class="txt">Possess (Storage)</span>
          </label>
          @if (isTxnChecked('POSSESS_STORAGE')) {
            <div class="unitRow">
              <span class="unitLabel">Unit:</span>
              <input
                class="unitInput"
                type="number"
                min="1"
                step="1"
                [value]="possessStorageUnits"
                (click)="$event.stopPropagation()"
                (input)="onUnitsInput($event, 'POSSESS_STORAGE')"
                />
            </div>
          }
    
        </div>
    
        <!-- POWER / OPTION -->
        <div class="col">
          <div class="head">Powered / Option</div>
    
          <label class="row" (click)="pickPower('HIGH_POWERED')">
            <input class="cb" type="checkbox" [checked]="power==='HIGH_POWERED'" tabindex="-1" aria-hidden="true" />
            <span class="box" [class.on]="power==='HIGH_POWERED'"></span>
            <span class="txt">High Powered</span>
          </label>
    
          <label class="row" (click)="pickPower('MEDIUM_POWERED')">
            <input class="cb" type="checkbox" [checked]="power==='MEDIUM_POWERED'" tabindex="-1" aria-hidden="true" />
            <span class="box" [class.on]="power==='MEDIUM_POWERED'"></span>
            <span class="txt">Medium Powered</span>
          </label>
    
          <label class="row" (click)="pickPower('LOW_POWERED')">
            <input class="cb" type="checkbox" [checked]="power==='LOW_POWERED'" tabindex="-1" aria-hidden="true" />
            <span class="box" [class.on]="power==='LOW_POWERED'"></span>
            <span class="txt">Low Powered</span>
          </label>
    
          <div class="divider"></div>
    
          <label
            class="row"
            [class.disabled]="scope==='DOMESTIC'"
            (click)="pickPower('SESCL_LRIT_SSAS_SESFB')"
            >
            <input
              class="cb"
              type="checkbox"
              [checked]="power==='SESCL_LRIT_SSAS_SESFB'"
              tabindex="-1"
              aria-hidden="true"
              [disabled]="scope==='DOMESTIC'"
              />
            <span class="box" [class.on]="power==='SESCL_LRIT_SSAS_SESFB'"></span>
            <span class="txt">SESCL / LRIT / SSAS / SESFB</span>
          </label>
        </div>
    
        <!-- SCOPE -->
        <div class="col">
          <div class="head">Scope</div>
    
          <label class="row" (click)="pickScope('DOMESTIC')">
            <input class="cb" type="checkbox" [checked]="scope==='DOMESTIC'" tabindex="-1" aria-hidden="true" />
            <span class="box" [class.on]="scope==='DOMESTIC'"></span>
            <span class="txt">Domestic</span>
          </label>
    
          <label class="row" (click)="pickScope('INTERNATIONAL')">
            <input class="cb" type="checkbox" [checked]="scope==='INTERNATIONAL'" tabindex="-1" aria-hidden="true" />
            <span class="box" [class.on]="scope==='INTERNATIONAL'"></span>
            <span class="txt">International</span>
          </label>
        </div>
      </div>
    
      <div class="foot">
        <button type="button" class="btn" (click)="close()">Cancel</button>
        <button type="button" class="btn primary" [disabled]="!hasPrimaryTxn() || !power || !scope || !unitsOk()" (click)="submit()">Submit</button>
      </div>
    </div>
    `,
    styles: [`
    .dlg{
      width: 100%;
      max-width: 860px;
      padding: 16px 18px;
      box-sizing: border-box;
      font-family: Arial, sans-serif;
      background:#fff;
      overflow: hidden;
    }

    .title{
      font-size: 26px;
      font-weight: 800;
      margin: 0;
    }

    .sub{
      font-size: 13px;
      color:#333;
      margin: 2px 0 10px;
    }

    .grid{
      display:grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      column-gap: 24px;
      row-gap: 10px;
      align-items:start;
      margin-top: 4px;
    }

    .head{
      font-weight: 800;
      font-size: 15px;
      margin: 0 0 6px;
    }

    .col{
      display:grid;
      gap: 8px;
      min-width: 0;
    }

    .row{
      display:flex;
      align-items:center;
      gap: 10px;
      cursor:pointer;
      user-select:none;
      font-weight: 700;
      font-size: 14px;
      line-height: 1.1;
      margin: 0;
      padding: 0;
      min-width: 0;
    }

    .row.disabled{
      opacity: 0.48;
      cursor: not-allowed;
      pointer-events: none;
    }

    .txt{
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .cb{
      position:absolute;
      opacity:0;
      width:0;
      height:0;
      pointer-events:none;
    }

    .box{
      width: 14px;
      height: 14px;
      border: 1px solid #333;
      border-radius: 2px;
      background:#fff;
      display:inline-block;
      position:relative;
      flex: 0 0 14px;
    }

    .box.on::after{
      content:"";
      position:absolute;
      left: 3px;
      top: 3px;
      width: 7px;
      height: 4px;
      border-left: 2px solid #2f74ff;
      border-bottom: 2px solid #2f74ff;
      transform: rotate(-45deg);
    }

    .unitRow{
      display:flex;
      align-items:center;
      gap: 6px;
      padding-left: 24px;
      margin-top: -4px;
      margin-bottom: 4px;
    }

    .unitLabel{
      font-size: 13px;
      font-weight: 700;
      color: #333;
      min-width: 34px;
    }

    .unitInput{
      width: 80px;
      height: 28px;
      padding: 2px 6px;
      border: 1px solid #c3c3c3;
      border-radius: 4px;
      font-size: 13px;
      box-sizing: border-box;
    }

    .divider{
      height: 1px;
      background: #d9d9d9;
      margin: 6px 0 4px;
    }

    .foot{
      display:flex;
      justify-content:flex-end;
      gap: 10px;
      margin-top: 10px;
    }

    .btn{
      height: 34px;
      padding: 0 16px;
      border: 1px solid #999;
      background:#fff;
      border-radius: 6px;
      cursor:pointer;
    }

    .btn.primary{
      border-color:#2f74ff;
      background:#2f74ff;
      color:#fff;
    }

    .btn:disabled{
      opacity:.55;
      cursor:not-allowed;
    }

    @media (max-width: 900px){
      .grid{
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 600px){
      .grid{
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ShipStationLicenseOptionsDialogComponent {
  txns: ShipTxn[] = [];
  power: ShipPower | null = 'MEDIUM_POWERED';
  scope: ShipLicenseScope | null = 'DOMESTIC';
  purchasePossessUnits: number | null = null;
  sellTransferUnits: number | null = null;
  possessStorageUnits: number | null = null;

  constructor(
    private ref: MatDialogRef<
      ShipStationLicenseOptionsDialogComponent,
      ShipStationLicenseOptionsResult
    >
  ) {}

  toggleTxn(v: ShipTxn): void {
    const has = this.isTxnChecked(v);

    // handle mutual exclusivity between NEW and RENEW
    if (!has && v === 'NEW') {
      this.txns = this.txns.filter((t) => t !== 'RENEW');
    }
    if (!has && v === 'RENEW') {
      this.txns = this.txns.filter((t) => t !== 'NEW');
    }

    if (has) {
      this.txns = this.txns.filter((t) => t !== v);
      if (v === 'PURCHASE_POSSESS') this.purchasePossessUnits = null;
      if (v === 'SELL_TRANSFER') this.sellTransferUnits = null;
      if (v === 'POSSESS_STORAGE') this.possessStorageUnits = null;
      return;
    }

    this.txns = [...this.txns, v];

    if (v === 'PURCHASE_POSSESS' && !this.purchasePossessUnits) {
      this.purchasePossessUnits = 1;
    }
    if (v === 'SELL_TRANSFER' && !this.sellTransferUnits) {
      this.sellTransferUnits = 1;
    }
    if (v === 'POSSESS_STORAGE' && !this.possessStorageUnits) {
      this.possessStorageUnits = 1;
    }
  }

  pickPower(v: ShipPower): void {
    if (this.scope === 'DOMESTIC' && v === 'SESCL_LRIT_SSAS_SESFB') return;
    this.power = v;
  }

  pickScope(v: ShipLicenseScope): void {
    this.scope = v;
    if (this.scope === 'DOMESTIC' && this.power === 'SESCL_LRIT_SSAS_SESFB') {
      this.power = 'MEDIUM_POWERED';
    }
  }

  onUnitsInput(event: Event, kind: 'PURCHASE_POSSESS' | 'SELL_TRANSFER' | 'POSSESS_STORAGE'): void {
    const val = Number((event.target as HTMLInputElement).value);
    const sanitized = Number.isFinite(val) && val > 0 ? Math.floor(val) : null;
    if (kind === 'PURCHASE_POSSESS') this.purchasePossessUnits = sanitized;
    if (kind === 'SELL_TRANSFER') this.sellTransferUnits = sanitized;
    if (kind === 'POSSESS_STORAGE') this.possessStorageUnits = sanitized;
  }

  unitsOk(): boolean {
    if (this.isTxnChecked('PURCHASE_POSSESS') && !this.purchasePossessUnits) return false;
    if (this.isTxnChecked('SELL_TRANSFER') && !this.sellTransferUnits) return false;
    if (this.isTxnChecked('POSSESS_STORAGE') && !this.possessStorageUnits) return false;
    return true;
  }

  isTxnChecked(v: ShipTxn): boolean {
    return this.txns.includes(v);
  }

  hasPrimaryTxn(): boolean {
    return this.txns.some((t) => t !== 'DUPLICATE');
  }

  onTxnClick(event: Event, v: ShipTxn): void {
    event.preventDefault();
    event.stopPropagation();
    this.toggleTxn(v);
  }

  submit(): void {
    if (!this.hasPrimaryTxn() || !this.power || !this.scope || !this.unitsOk()) return;
    this.ref.close({
      txns: this.txns,
      power: this.power,
      scope: this.scope,
      purchasePossessUnits: this.purchasePossessUnits || undefined,
      sellTransferUnits: this.sellTransferUnits || undefined,
      possessStorageUnits: this.possessStorageUnits || undefined,
    });
  }

  close(): void {
    this.ref.close();
  }
}
