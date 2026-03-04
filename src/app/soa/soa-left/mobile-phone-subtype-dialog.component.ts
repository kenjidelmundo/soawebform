import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

export type MobilePhoneSubtype =
  | 'RCE_DEALER'
  | 'RCE_MANUFACTURER'
  | 'RCE_SERVICE_CENTER'
  | 'CPE_NON_MOBILE'
  | 'CPE_MOBILE'
  | 'MP_DEALER_MAIN'
  | 'MP_DEALER_BRANCH'
  | 'RETAILER_RESELLER'
  | 'SERVICE_CENTER';

export type MobilePhoneSubtypeDialogResult = {
  value: MobilePhoneSubtype;
};

@Component({
  selector: 'app-mobile-phone-subtype-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dlg">
      <div class="dlgHead">Mobile Phone Permits - Select Subtype</div>

      <div class="btnGrid">
        <button type="button" class="pickBtn" (click)="pick('RCE_DEALER')">
          <span class="txt">RCE Dealer</span>
        </button>

        <button type="button" class="pickBtn" (click)="pick('RCE_MANUFACTURER')">
          <span class="txt">RCE Manufacturer</span>
        </button>

        <button type="button" class="pickBtn" (click)="pick('RCE_SERVICE_CENTER')">
          <span class="txt">RCE Service Center</span>
        </button>

        <button type="button" class="pickBtn" (click)="pick('CPE_NON_MOBILE')">
          <span class="txt">CPE Non- Mobile Phones</span>
        </button>

        <button type="button" class="pickBtn" (click)="pick('CPE_MOBILE')">
          <span class="txt">CPE Mobile Phones</span>
        </button>

        <button type="button" class="pickBtn" (click)="pick('MP_DEALER_MAIN')">
          <span class="txt">MP Dealer(Main)</span>
        </button>

        <button type="button" class="pickBtn" (click)="pick('MP_DEALER_BRANCH')">
          <span class="txt">MP Dealer(Branch)</span>
        </button>

        <button type="button" class="pickBtn" (click)="pick('RETAILER_RESELLER')">
          <span class="txt">Retailer/Reseller</span>
        </button>

        <button type="button" class="pickBtn" (click)="pick('SERVICE_CENTER')">
          <span class="txt">Service Center</span>
        </button>
      </div>

      <div class="dlgFoot">
        <button type="button" class="btn" (click)="close()">Cancel</button>
      </div>
    </div>
  `,
  styles: [`
    .dlg{ width:100%; max-width:92vw; padding:14px; box-sizing:border-box; overflow-x:hidden;
          font-family:Arial,sans-serif; background:#fff; }
    .dlgHead{ font-size:18px; font-weight:700; margin-bottom:12px; }
    .btnGrid{ display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .pickBtn{ height:70px; border:1px solid #bbb; border-radius:10px; background:#fff;
              cursor:pointer; display:grid; place-items:center; }
    .pickBtn:hover{ border-color:#2f74ff; }
    .txt{ font-size:14px; font-weight:700; text-align:center; padding:0 8px; }
    .dlgFoot{ margin-top:14px; display:flex; justify-content:flex-end; }
    .btn{ height:34px; padding:0 12px; border:1px solid #999; background:#fff; border-radius:6px; cursor:pointer; }
  `],
})
export class MobilePhoneSubtypeDialogComponent {
  constructor(
    private ref: MatDialogRef<
      MobilePhoneSubtypeDialogComponent,
      MobilePhoneSubtypeDialogResult
    >
  ) {}

  pick(value: MobilePhoneSubtype) {
    this.ref.close({ value });
  }

  close() {
    this.ref.close();
  }
}