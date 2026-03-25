
import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

export type ParticularsDialogResult = {
  value:
    | 'ROC'
    | 'Amateur'
    | 'ShipStation'
    | 'Coastal'
    | 'VHFUHF'
    | 'MobilePhone'
    | 'TVROCATV'; // ✅ NEW
};

@Component({
    selector: 'app-particulars-dialog',
    imports: [],
    template: `
    <div class="dlg">
      <div class="dlgHead">Select Service</div>
    
      <div class="btnGrid">
        @for (option of options; track option) {
          <button
            type="button"
            class="pickBtn"
            (click)="pick(option.value)"
            >
            <span class="txt">{{ option.label }}</span>
          </button>
        }
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
  `]
})
export class ParticularsDialogComponent {
  readonly options: ReadonlyArray<{
    value:
      | 'ROC'
      | 'Amateur'
      | 'ShipStation'
      | 'Coastal'
      | 'VHFUHF'
      | 'MobilePhone'
      | 'TVROCATV';
    label: string;
    keywords: string[];
  }> = [
    { value: 'ROC', label: 'ROC', keywords: ['roc', 'radio operator'] },
    { value: 'Amateur', label: 'Amateur', keywords: ['amateur', 'ham'] },
    { value: 'ShipStation', label: 'Ship Station', keywords: ['ship', 'station', 'vessel'] },
    {
      value: 'Coastal',
      label: 'Coastal Station License',
      keywords: ['coastal', 'coast', 'station', 'license'],
    },
    {
      value: 'VHFUHF',
      label: 'VHF/UHF Radio Stations',
      keywords: ['vhf', 'uhf', 'radio', 'stations'],
    },
    {
      value: 'MobilePhone',
      label: 'Mobile Phone Permits',
      keywords: ['mobile', 'phone', 'permit', 'permits'],
    },
    {
      value: 'TVROCATV',
      label: 'TVRO / CATV',
      keywords: ['tvro', 'catv', 'cable', 'tv'],
    },
  ];

  constructor(
    private ref: MatDialogRef<ParticularsDialogComponent, ParticularsDialogResult>
  ) {}

  pick(
    value:
      | 'ROC'
      | 'Amateur'
      | 'ShipStation'
      | 'Coastal'
      | 'VHFUHF'
      | 'MobilePhone'
      | 'TVROCATV'
  ) {
    this.ref.close({ value });
  }

  close() {
    this.ref.close();
  }
}
