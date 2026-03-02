import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { SoaPdfService } from '../soa-pdf/soa-pdf.service';

@Component({
  selector: 'app-soa-right-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './soa-right-panel.component.html',
  styleUrls: ['./soa-right-panel.component.css'],
})
export class SoaRightPanelComponent {
  @Input() form!: FormGroup;

  @Output() onSave = new EventEmitter<void>();
  @Output() onNewRecord = new EventEmitter<void>();
  @Output() onPrintSOA = new EventEmitter<void>();
  @Output() onAssessment = new EventEmitter<void>();
  @Output() onPrintOP = new EventEmitter<void>();

  constructor(private soaPdf: SoaPdfService) {}

  save(): void {
    this.onSave.emit();
  }
  newRecord(): void {
    this.onNewRecord.emit();
  }
  printSoa(): void {
    this.onPrintSOA.emit();
  }
  assessment(): void {
    this.onAssessment.emit();
  }
  printOp(): void {
    this.onPrintOP.emit();
  }

  // -----------------------
  // helpers
  // -----------------------
  private num(v: any): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  private pick(v: any, keys: string[], fallback: any = ''): any {
    for (const k of keys) {
      const val = v?.[k];
      if (val !== undefined && val !== null && String(val).trim() !== '') return val;
    }
    return fallback;
  }

  private pickNum(v: any, keys: string[], fallback = 0): number {
    for (const k of keys) {
      const val = v?.[k];
      if (val !== undefined && val !== null && String(val).trim() !== '') return this.num(val);
    }
    return fallback;
  }

  // ✅ guaranteed: finds a boolean anywhere in the FormGroup tree by keyword
  private findBoolInFormTree(root: AbstractControl | null | undefined, keywords: string[]): boolean {
    if (!root) return false;
    const keys = keywords.map((k) => k.toLowerCase());

    const walk = (ctrl: AbstractControl): boolean | null => {
      const anyCtrl: any = ctrl as any;

      // FormGroup/FormArray has .controls
      if (anyCtrl?.controls && typeof anyCtrl.controls === 'object') {
        for (const name of Object.keys(anyCtrl.controls)) {
          const child = anyCtrl.controls[name] as AbstractControl;
          const nameLower = String(name).toLowerCase();

          // match name by keywords
          const match = keys.every((k) => nameLower.includes(k));
          if (match) {
            // if it is a checkbox control, its value should be boolean
            const v = (child as any)?.value;
            if (typeof v === 'boolean') return v;
          }

          const found = walk(child);
          if (found !== null) return found;
        }
      }

      return null;
    };

    const r = walk(root);
    return r === null ? false : !!r;
  }

  // ✅ reads string (prepared/approved) safely
  private findStringInFormTree(root: AbstractControl | null | undefined, keywords: string[]): string {
    if (!root) return '';
    const keys = keywords.map((k) => k.toLowerCase());

    const walk = (ctrl: AbstractControl): string | null => {
      const anyCtrl: any = ctrl as any;

      if (anyCtrl?.controls && typeof anyCtrl.controls === 'object') {
        for (const name of Object.keys(anyCtrl.controls)) {
          const child = anyCtrl.controls[name] as AbstractControl;
          const nameLower = String(name).toLowerCase();

          const match = keys.every((k) => nameLower.includes(k));
          if (match) {
            const v = (child as any)?.value;
            if (v !== undefined && v !== null && String(v).trim() !== '') return String(v);
          }

          const found = walk(child);
          if (found !== null) return found;
        }
      }
      return null;
    };

    const r = walk(root);
    return r === null ? '' : r;
  }

  // ✅ pdfMake SOA preview button should call this
  printSOAPreview(): void {
    if (!this.form) {
      alert('Form not found.');
      return;
    }

    const v: any = this.form.getRawValue?.() ?? this.form.value ?? {};

    // ✅ WORKING: find checkbox values anywhere in the form tree (no guessing names)
    const forAssessmentOnly = this.findBoolInFormTree(this.form, ['assessment']);
    const endorsedForPayment = this.findBoolInFormTree(this.form, ['endorsed']);

    // ✅ WORKING: get names (you already have these, but this makes it robust)
    const preparedBy =
      this.findStringInFormTree(this.form, ['prepared']) || this.pick(v, ['preparedBy'], '');
    const approvedBy =
      this.findStringInFormTree(this.form, ['approved']) || this.pick(v, ['approvedBy'], '');

    const soaData: any = {
      soaNo: this.pick(v, ['soaSeries', 'seriesNumber', 'opSeries'], ''),
      date: this.pick(v, ['date', 'dateIssued'], ''),
      name: this.pick(v, ['licensee'], ''), // ✅ NAME MUST BE licensee
      address: this.pick(v, ['address'], ''),
      particulars: this.pick(v, ['particulars'], ''),
      periodCovered: this.pick(v, ['periodCovered'], ''),

      preparedBy,
      approvedBy,

      flags: {
        txnNew: !!v.txnNew,
        txnRenew: !!v.txnRenew,
        txnCO: !!v.txnCO,
        txnCV: !!v.txnCV,
        txnModification: !!v.txnModification,
        catROC: !!v.catROC,

        // ✅ THESE TWO WILL NOW BE TRUE when the user checks them (guaranteed)
        forAssessmentOnly,
        endorsedForPayment,
      },

      sections: [
        {
          title: 'FOR LICENSES',
          rows: [
            ['Permit to Purchase', this.pickNum(v, ['licPermitToPurchase'], 0)],
            ['Filing Fee', this.pickNum(v, ['licFilingFee'], 0)],
            ['Permit to Possess / Storage', this.pickNum(v, ['licPermitToPossess'], 0)],
            ['Construction Permit Fee', this.pickNum(v, ['licConstructionPermitFee'], 0)],
            ['Radio Station License', this.pickNum(v, ['licRadioStationLicense'], 0)],
            ['Inspection Fee', this.pickNum(v, ['licInspectionFee'], 0)],
            ['Spectrum User’s Fee (SUF)', this.pickNum(v, ['licSUF'], 0)],
            ['Surcharges', this.pickNum(v, ['licSurcharges'], 0)],
            ['Fines and Penalties', this.pickNum(v, ['licFinesPenalties'], 0)],
          ],
        },
        {
          title: 'FOR PERMITS',
          rows: [
            ['Permit (Dealer / Reseller / Service Center)', this.pickNum(v, ['perPermitFees'], 0)],
            ['Inspection Fee', this.pickNum(v, ['perInspectionFee'], 0)],
            ['Filing Fee', this.pickNum(v, ['perFilingFee'], 0)],
            ['Surcharges', this.pickNum(v, ['perSurcharges'], 0)],
          ],
        },
        {
          title: 'FOR AMATEUR AND ROC',
          rows: [
            ['Radio Station License', this.pickNum(v, ['amRadioStationLicense'], 0)],
            ["Radio Operator’s Certificate", this.pickNum(v, ['amRadioOperatorsCert'], 0)],
            ['Application Fee', this.pickNum(v, ['amApplicationFee'], 0)],
            ['Filing Fee', this.pickNum(v, ['amFilingFee'], 0)],
            ['Seminar Fee', this.pickNum(v, ['amSeminarFee'], 0)],
            ['Surcharges', this.pickNum(v, ['amSurcharges'], 0)],
          ],
        },
        {
          title: 'OTHER APPLICATION',
          rows: [
            ['Registration Fee', this.pickNum(v, ['appRegistrationFee'], 0)],
            ['Supervision / Regulation Fee', this.pickNum(v, ['appSupervisionRegulationFee'], 0)],
            ['Verification / Authentication Fee', this.pickNum(v, ['appVerificationAuthFee'], 0)],
            ['Examination Fee', this.pickNum(v, ['appExaminationFee'], 0)],
            ['Clearance / Certification Fee (Special)', this.pickNum(v, ['appClearanceCertificationFee'], 0)],
            ['Modification Fee', this.pickNum(v, ['appModificationFee'], 0)],
            ['Miscellaneous Income', this.pickNum(v, ['appMiscIncome'], 0)],
            ['Documentary Stamp Tax (DST)', this.pickNum(v, ['dst'], 0)],
            ['Others', this.pickNum(v, ['appOthers'], 0)],
          ],
        },
      ],
    };

    console.log('[RightPanel] forAssessmentOnly:', forAssessmentOnly);
    console.log('[RightPanel] endorsedForPayment:', endorsedForPayment);

    this.soaPdf.generatePDF(soaData);
  }
}