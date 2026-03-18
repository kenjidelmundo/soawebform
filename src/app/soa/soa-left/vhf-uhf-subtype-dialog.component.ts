import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export type VhfUhfBaseRadio =
  | 'Fixed'
  | 'FX/FB'
  | 'Mobile'
  | 'Porta Base'
  | 'Porta Mobile'
  | 'Portable'
  | 'Repeater';

export type VhfUhfPower =
  | 'High Powered (above 100W)'
  | 'Medium Powered (above 25W up to 100W)'
  | 'Low Powered (25W and below)';

export type VhfUhfSubtypeResult = {
  baseRadio: VhfUhfBaseRadio;
  power: VhfUhfPower;
};

type VhfUhfSubtypeDialogData = {
  baseRadio?: VhfUhfBaseRadio | null;
  power?: VhfUhfPower | null;
};

let rememberedVhfUhfSubtype: VhfUhfSubtypeDialogData | null = null;

export function rememberVhfUhfSubtypeSelection(data: VhfUhfSubtypeDialogData | null): void {
  rememberedVhfUhfSubtype = data
    ? {
        baseRadio: data.baseRadio ?? null,
        power: data.power ?? null,
      }
    : null;
}

function getRememberedVhfUhfSubtypeSelection(): VhfUhfSubtypeDialogData | null {
  return rememberedVhfUhfSubtype
    ? {
        baseRadio: rememberedVhfUhfSubtype.baseRadio ?? null,
        power: rememberedVhfUhfSubtype.power ?? null,
      }
    : null;
}

@Component({
  selector: 'app-vhf-uhf-subtype-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dlg">
      <div class="dlgHead">VHF / UHF Radio Stations</div>

      <div class="secTitle">Base Radio</div>
      <div class="grid">
        <button type="button" class="tile" [class.on]="baseRadio==='Fixed'" (click)="setBase('Fixed')">Fixed</button>
        <button type="button" class="tile" [class.on]="baseRadio==='FX/FB'" (click)="setBase('FX/FB')">FX/FB</button>
        <button type="button" class="tile" [class.on]="baseRadio==='Mobile'" (click)="setBase('Mobile')">Mobile</button>
        <button type="button" class="tile" [class.on]="baseRadio==='Porta Base'" (click)="setBase('Porta Base')">Porta Base</button>
        <button type="button" class="tile" [class.on]="baseRadio==='Porta Mobile'" (click)="setBase('Porta Mobile')">Porta Mobile</button>
        <button type="button" class="tile" [class.on]="baseRadio==='Portable'" (click)="setBase('Portable')">Portable</button>
        <button type="button" class="tile" [class.on]="baseRadio==='Repeater'" (click)="setBase('Repeater')">Repeater</button>
      </div>

      <div class="secTitle" style="margin-top:14px;">Power</div>
      <div class="grid">
        <button type="button" class="tile" [class.on]="power==='High Powered (above 100W)'" (click)="setPower('High Powered (above 100W)')">
          High Powered (above 100W)
        </button>

        <button type="button" class="tile" [class.on]="power==='Medium Powered (above 25W up to 100W)'" (click)="setPower('Medium Powered (above 25W up to 100W)')">
          Medium Powered (above 25W up to 100W)
        </button>

        <button type="button" class="tile" [class.on]="power==='Low Powered (25W and below)'" (click)="setPower('Low Powered (25W and below)')">
          Low Powered (25W and below)
        </button>
      </div>

      <div class="dlgFoot">
        <button type="button" class="btn" (click)="close()">Cancel</button>
        <button type="button" class="btn primary" [disabled]="!canOk" (click)="ok()">OK</button>
      </div>
    </div>
  `,
  styles: [`
    .dlg{
      width:100%;
      max-width:92vw;
      padding:14px;
      box-sizing:border-box;
      overflow-x:hidden;
      font-family:Arial,sans-serif;
      background:#fff;
    }
    .dlgHead{ font-size:18px; font-weight:700; margin-bottom:10px; }
    .secTitle{ font-size:13px; font-weight:700; margin:8px 0; opacity:.9; }

    .grid{
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:10px;
    }

    .tile{
      min-height:44px;
      border:1px solid #bbb;
      border-radius:10px;
      background:#fff;
      cursor:pointer;
      padding:10px 10px;
      text-align:left;
      font-weight:700;
      font-size:13px;
      line-height:1.15;
    }
    .tile:hover{ border-color:#2f74ff; }
    .tile.on{
      border-color:#2f74ff;
      box-shadow:0 0 0 2px rgba(47,116,255,.15) inset;
    }

    .dlgFoot{
      margin-top:14px;
      display:flex;
      justify-content:flex-end;
      gap:10px;
    }
    .btn{
      height:34px;
      padding:0 12px;
      border:1px solid #999;
      background:#fff;
      border-radius:6px;
      cursor:pointer;
      font-weight:700;
    }
    .btn.primary{ border-color:#2f74ff; }
    .btn[disabled]{ opacity:.5; cursor:not-allowed; }
  `],
})
export class VhfUhfSubtypeDialogComponent {
  baseRadio: VhfUhfBaseRadio | null = null;
  power: VhfUhfPower | null = null;

  constructor(
    private ref: MatDialogRef<VhfUhfSubtypeDialogComponent, VhfUhfSubtypeResult>,
    @Inject(MAT_DIALOG_DATA) data: VhfUhfSubtypeDialogData | null
  ) {
    const seed = data ?? getRememberedVhfUhfSubtypeSelection();
    this.baseRadio = seed?.baseRadio ?? null;
    this.power = seed?.power ?? null;
  }

  get canOk(): boolean {
    return !!this.baseRadio && !!this.power;
  }

  setBase(v: VhfUhfBaseRadio) {
    this.baseRadio = v;
    rememberVhfUhfSubtypeSelection({ baseRadio: this.baseRadio, power: this.power });
  }

  setPower(v: VhfUhfPower) {
    this.power = v;
    rememberVhfUhfSubtypeSelection({ baseRadio: this.baseRadio, power: this.power });
  }

  ok() {
    if (!this.baseRadio || !this.power) return;
    rememberVhfUhfSubtypeSelection({ baseRadio: this.baseRadio, power: this.power });
    this.ref.close({ baseRadio: this.baseRadio, power: this.power });
  }

  close() {
    this.ref.close();
  }
}
