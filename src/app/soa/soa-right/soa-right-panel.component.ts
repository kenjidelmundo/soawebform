import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { SoaPdfService } from '../soa-pdf/soa-pdf.service';

@Component({
  selector: 'app-soa-right-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './soa-right-panel.component.html',
  styleUrls: ['./soa-right-panel.component.css']
})
export class SoaRightPanelComponent {
  @Input() form!: FormGroup;

  @Output() onSave = new EventEmitter<void>();
  @Output() onNewRecord = new EventEmitter<void>();
  @Output() onPrintSOA = new EventEmitter<void>();
  @Output() onAssessment = new EventEmitter<void>();
  @Output() onPrintOP = new EventEmitter<void>();

  constructor(private soaPdf: SoaPdfService) {}

  printSOAPreview(): void {
    const v: any = this.form?.value ?? {};

    // ✅ Debug (optional)
    console.log('FORM VALUE:', v);

    const soaData: any = {
      soaNo: v.soaNo ?? '',
      date: v.dateIssued ?? v.date ?? '',
      name: v.payeeName ?? v.name ?? '',
      address: v.address ?? '',
      type: v.type ?? 'New',
      particulars: v.particulars ?? '',
      periodCovered: v.periodCovered ?? '',

      sections: [
        {
          title: 'FOR LICENSES',
          rows: [
            ['Permit to Purchase', Number(v.licPermitToPurchase || 0)],
            ['Filing Fee', Number(v.licFilingFee || 0)],
            ['Permit to Possess / Storage', Number(v.licPermitToPossess || 0)],
            ['Construction Permit Fee', Number(v.licConstructionPermitFee || 0)],
            ['Radio Station License', Number(v.licRadioStationLicense || 0)],
            ['Inspection Fee', Number(v.licInspectionFee || 0)],
            ['Spectrum User’s Fee (SUF)', Number(v.licSpectrumUsersFee || 0)],
            ['Surcharges', Number(v.licSurcharges || 0)],
            ['Fines and Penalties', Number(v.licFinesPenalties || 0)],
          ]
        },
        {
          title: 'FOR PERMITS',
          rows: [
            ['Permit (Dealer / Reseller / Service Center)', Number(v.permitDealerReseller || 0)],
            ['Inspection Fee', Number(v.permitInspectionFee || 0)],
            ['Filing Fee', Number(v.permitFilingFee || 0)],
            ['Surcharges', Number(v.permitSurcharges || 0)],
          ]
        },
        {
          title: 'FOR AMATEUR AND ROC',
          rows: [
            ['Radio Station License', Number(v.amRadioStationLicense || 0)],
            ["Radio Operator’s Certificate", Number(v.amRoc || 0)],
            ['Application Fee', Number(v.amApplicationFee || 0)],
            ['Filing Fee', Number(v.amFilingFee || 0)],
            ['Seminar Fee', Number(v.amSeminarFee || 0)],
            ['Surcharges', Number(v.amSurcharges || 0)],
          ]
        },
        {
          title: 'OTHER APPLICATION',
          rows: [
            ['Registration Fee', Number(v.otherRegistrationFee || 0)],
            ['Supervision / Regulation Fee', Number(v.otherSupervisionFee || 0)],
            ['Verification / Authentication Fee', Number(v.otherVerificationFee || 0)],
            ['Examination Fee', Number(v.otherExaminationFee || 0)],
            ['Clearance / Certification Fee (Special)', Number(v.otherClearanceFee || 0)],
            ['Modification Fee', Number(v.otherModificationFee || 0)],
            ['Miscellaneous Income', Number(v.otherMiscIncome || 0)],
            ['Documentary Stamp Tax (DST)', Number(v.otherDst || 0)],
            ['Others', Number(v.otherOthers || 0)],
          ]
        }
      ]
    };

    console.log('SOA TO PRINT:', soaData);

    this.soaPdf.generatePDF(soaData);
  }
}
