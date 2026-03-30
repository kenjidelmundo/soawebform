
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
  intlCode?: 'SESCL' | 'LRIT' | 'SSAS' | 'SESFB';
  purchasePossessUnits?: number;
  sellTransferUnits?: number;
  possessStorageUnits?: number;
};

export type ShipStationLicenseOptionsDialogResult = ShipStationLicenseOptionsResult;

@Component({
    selector: 'app-ship-station-license-options-dialog',
    imports: [],
    template: `
    <div class="shipTxnDlg">
      <div class="shipTxnTitle">Ship Station License</div>
      <div class="shipTxnSub">Choose transaction + power / option + scope</div>

      <div class="shipTxnGrid">
        <div class="shipTxnCol">
          <div class="shipTxnHead">Transaction</div>

          <label class="shipTxnRow" (click)="onTxnClick($event, 'NEW')">
            <input class="shipTxnCb" type="checkbox" [checked]="isTxnChecked('NEW')" tabindex="-1" aria-hidden="true" />
            <span class="shipTxnBox" [class.on]="isTxnChecked('NEW')"></span>
            <span class="shipTxnText">New</span>
          </label>

          <label class="shipTxnRow" (click)="onTxnClick($event, 'RENEW')">
            <input class="shipTxnCb" type="checkbox" [checked]="isTxnChecked('RENEW')" tabindex="-1" aria-hidden="true" />
            <span class="shipTxnBox" [class.on]="isTxnChecked('RENEW')"></span>
            <span class="shipTxnText">Renew</span>
          </label>

          <label class="shipTxnRow" (click)="onTxnClick($event, 'MOD')">
            <input class="shipTxnCb" type="checkbox" [checked]="isTxnChecked('MOD')" tabindex="-1" aria-hidden="true" />
            <span class="shipTxnBox" [class.on]="isTxnChecked('MOD')"></span>
            <span class="shipTxnText">Mod</span>
          </label>

          <label class="shipTxnRow" (click)="onTxnClick($event, 'DUPLICATE')">
            <input class="shipTxnCb" type="checkbox" [checked]="isTxnChecked('DUPLICATE')" tabindex="-1" aria-hidden="true" />
            <span class="shipTxnBox" [class.on]="isTxnChecked('DUPLICATE')"></span>
            <span class="shipTxnText">Duplicate</span>
          </label>

          <label class="shipTxnRow" (click)="onTxnClick($event, 'PURCHASE_POSSESS')">
            <input class="shipTxnCb" type="checkbox" [checked]="isTxnChecked('PURCHASE_POSSESS')" tabindex="-1" aria-hidden="true" />
            <span class="shipTxnBox" [class.on]="isTxnChecked('PURCHASE_POSSESS')"></span>
            <span class="shipTxnText">Permit to Purchase / Possess</span>
          </label>
          @if (isTxnChecked('PURCHASE_POSSESS')) {
            <div class="shipTxnUnitRow">
              <span class="shipTxnUnitLabel">Unit:</span>
              <input
                class="shipTxnUnitInput"
                type="number"
                min="1"
                step="1"
                [value]="purchasePossessUnits"
                (click)="$event.stopPropagation()"
                (input)="onUnitsInput($event, 'PURCHASE_POSSESS')"
              />
            </div>
          }

          <label class="shipTxnRow" (click)="onTxnClick($event, 'SELL_TRANSFER')">
            <input class="shipTxnCb" type="checkbox" [checked]="isTxnChecked('SELL_TRANSFER')" tabindex="-1" aria-hidden="true" />
            <span class="shipTxnBox" [class.on]="isTxnChecked('SELL_TRANSFER')"></span>
            <span class="shipTxnText">Permit to Sell / Transfer</span>
          </label>
          @if (isTxnChecked('SELL_TRANSFER')) {
            <div class="shipTxnUnitRow">
              <span class="shipTxnUnitLabel">Unit:</span>
              <input
                class="shipTxnUnitInput"
                type="number"
                min="1"
                step="1"
                [value]="sellTransferUnits"
                (click)="$event.stopPropagation()"
                (input)="onUnitsInput($event, 'SELL_TRANSFER')"
              />
            </div>
          }

          <label class="shipTxnRow" (click)="onTxnClick($event, 'POSSESS_STORAGE')">
            <input class="shipTxnCb" type="checkbox" [checked]="isTxnChecked('POSSESS_STORAGE')" tabindex="-1" aria-hidden="true" />
            <span class="shipTxnBox" [class.on]="isTxnChecked('POSSESS_STORAGE')"></span>
            <span class="shipTxnText">Possess (Storage)</span>
          </label>
          @if (isTxnChecked('POSSESS_STORAGE')) {
            <div class="shipTxnUnitRow">
              <span class="shipTxnUnitLabel">Unit:</span>
              <input
                class="shipTxnUnitInput"
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

        <div class="shipTxnCol">
          <div class="shipTxnHead">Powered / Option</div>

          <label class="shipTxnRow" (click)="pickPower('HIGH_POWERED')">
            <input class="shipTxnCb" type="checkbox" [checked]="power==='HIGH_POWERED'" tabindex="-1" aria-hidden="true" />
            <span class="shipTxnBox" [class.on]="power==='HIGH_POWERED'"></span>
            <span class="shipTxnText">High Powered</span>
          </label>

          <label class="shipTxnRow" (click)="pickPower('MEDIUM_POWERED')">
            <input class="shipTxnCb" type="checkbox" [checked]="power==='MEDIUM_POWERED'" tabindex="-1" aria-hidden="true" />
            <span class="shipTxnBox" [class.on]="power==='MEDIUM_POWERED'"></span>
            <span class="shipTxnText">Medium Powered</span>
          </label>

          <label class="shipTxnRow" (click)="pickPower('LOW_POWERED')">
            <input class="shipTxnCb" type="checkbox" [checked]="power==='LOW_POWERED'" tabindex="-1" aria-hidden="true" />
            <span class="shipTxnBox" [class.on]="power==='LOW_POWERED'"></span>
            <span class="shipTxnText">Low Powered</span>
          </label>

          <div class="shipTxnDivider"></div>

          <label class="shipTxnRow" [class.disabled]="scope==='DOMESTIC'" (click)="pickPower('SESCL_LRIT_SSAS_SESFB')">
            <input
              class="shipTxnCb"
              type="checkbox"
              [checked]="power==='SESCL_LRIT_SSAS_SESFB'"
              tabindex="-1"
              aria-hidden="true"
              [disabled]="scope==='DOMESTIC'"
            />
            <span class="shipTxnBox" [class.on]="power==='SESCL_LRIT_SSAS_SESFB'"></span>
            <span class="shipTxnText">SESCL / LRIT / SSAS / SESFB</span>
          </label>
        </div>

        <div class="shipTxnCol">
          <div class="shipTxnHead">Scope</div>

          <label class="shipTxnRow" (click)="pickScope('DOMESTIC')">
            <input class="shipTxnCb" type="checkbox" [checked]="scope==='DOMESTIC'" tabindex="-1" aria-hidden="true" />
            <span class="shipTxnBox" [class.on]="scope==='DOMESTIC'"></span>
            <span class="shipTxnText">Domestic</span>
          </label>

          <label class="shipTxnRow" (click)="pickScope('INTERNATIONAL')">
            <input class="shipTxnCb" type="checkbox" [checked]="scope==='INTERNATIONAL'" tabindex="-1" aria-hidden="true" />
            <span class="shipTxnBox" [class.on]="scope==='INTERNATIONAL'"></span>
            <span class="shipTxnText">International</span>
          </label>
        </div>
      </div>

      <div class="shipTxnFoot">
        <button type="button" class="shipTxnBtn" (click)="close()">Cancel</button>
        <button type="button" class="shipTxnBtn shipTxnBtnPrimary" [disabled]="!hasPrimaryTxn() || !power || !scope || !unitsOk()" (click)="submit()">Submit</button>
      </div>
    </div>
    `,
    styles: [`
    .shipTxnDlg{
      width: 100%;
      max-width: 900px;
      padding: 18px 20px 16px;
      box-sizing: border-box;
      font-family: Arial, sans-serif;
      background:#fff;
      overflow: hidden;
    }

    .shipTxnTitle{
      font-size: 24px;
      font-weight: 800;
      color: #101010;
      margin: 0 0 2px;
    }

    .shipTxnSub{
      font-size: 13px;
      color:#585858;
      margin: 0 0 16px;
    }

    .shipTxnGrid{
      display:grid;
      grid-template-columns: minmax(300px, 1.2fr) minmax(250px, 1fr) minmax(180px, .85fr);
      column-gap: 42px;
      row-gap: 14px;
      align-items:start;
      margin-top: 4px;
    }

    .shipTxnHead{
      font-weight: 800;
      font-size: 15px;
      color: #171717;
      margin: 0 0 10px;
    }

    .shipTxnCol{
      display:grid;
      gap: 9px;
      min-width: 0;
      align-content: start;
    }

    .shipTxnRow{
      display:flex;
      align-items:center;
      gap: 8px;
      cursor:pointer;
      user-select:none;
      font-weight: 800;
      font-size: 14px;
      line-height: 1.1;
      margin: 0;
      padding: 0;
      min-width: 0;
    }

    .shipTxnRow.disabled{
      opacity: 0.48;
      cursor: not-allowed;
      pointer-events: none;
    }

    .shipTxnText{
      white-space: nowrap;
      color: #222;
    }

    .shipTxnCb{
      position:absolute;
      opacity:0;
      width:0;
      height:0;
      pointer-events:none;
    }

    .shipTxnBox{
      width: 14px;
      height: 14px;
      border: 1px solid #727272;
      border-radius: 2px;
      background:#fff;
      display:inline-block;
      position:relative;
      flex: 0 0 14px;
    }

    .shipTxnBox.on::after{
      content:"";
      position:absolute;
      left: 3px;
      top: 1px;
      width: 4px;
      height: 8px;
      border-right: 2px solid #2f74ff;
      border-bottom: 2px solid #2f74ff;
      transform: rotate(45deg);
    }

    .shipTxnUnitRow{
      display:flex;
      align-items:center;
      gap: 8px;
      padding-left: 24px;
      margin-top: -2px;
      margin-bottom: 4px;
    }

    .shipTxnUnitLabel{
      font-size: 13px;
      font-weight: 700;
      color: #333;
      min-width: 34px;
    }

    .shipTxnUnitInput{
      width: 74px;
      height: 32px;
      padding: 2px 6px;
      border: 1px solid #c3c3c3;
      border-radius: 6px;
      font-size: 13px;
      box-sizing: border-box;
    }

    .shipTxnDivider{
      height: 1px;
      background: #d9d9d9;
      margin: 6px 0 4px;
    }

    .shipTxnFoot{
      display:flex;
      justify-content:flex-end;
      gap: 10px;
      margin-top: 22px;
    }

    .shipTxnBtn{
      height: 36px;
      padding: 0 16px;
      border: 1px solid #b5bcc6;
      background:#fff;
      border-radius: 8px;
      cursor:pointer;
      font-size: 14px;
    }

    .shipTxnBtnPrimary{
      border-color:#8db2ff;
      background:#8db2ff;
      color:#fff;
    }

    .shipTxnBtn:disabled{
      opacity:.55;
      cursor:not-allowed;
    }

    @media (max-width: 900px){
      .shipTxnGrid{
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 600px){
      .shipTxnGrid{
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
