import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
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

  // ✅ pdfMake SOA preview button should call this
  printSOAPreview(): void {
    if (!this.form) {
      alert('Form not found.');
      return;
    }

    const v: any = this.form.getRawValue?.() ?? this.form.value ?? {};

    const soaData: any = {
      soaNo: this.pick(v, ['soaSeries', 'seriesNumber', 'opSeries'], ''),
      date: this.pick(v, ['date', 'dateIssued'], ''),
      name: this.pick(v, ['licensee'], ''), // ✅ NAME MUST BE licensee
      address: this.pick(v, ['address'], ''),
      particulars: this.pick(v, ['particulars'], ''),
      periodCovered: this.pick(v, ['periodCovered'], ''),

      // ✅ checkbox flags from real form controls
      flags: {
        txnNew: !!v.txnNew,
        txnRenew: !!v.txnRenew,
        txnCO: !!v.txnCO,
        txnCV: !!v.txnCV,
        txnModification: !!v.txnModification,
        catROC: !!v.catROC,
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

    console.log('[RightPanel] sending to pdfMake:', soaData);
    this.soaPdf.generatePDF(soaData);
  }
}