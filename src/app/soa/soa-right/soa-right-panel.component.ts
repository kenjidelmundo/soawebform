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

  save(): void {
    if (!this.form) {
      alert('Form not found.');
      return;
    }
    this.onSave.emit();
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

  // ✅ This is what your button should call
  printSOAPreview(): void {
    if (!this.form) {
      alert('Form not found.');
      return;
    }

    // ✅ IMPORTANT: getRawValue so checkboxes are included correctly
    const v: any = this.form.getRawValue?.() ?? this.form.value ?? {};

    // ✅ BASIC FIELDS
    const dateVal = this.pick(v, ['dateIssued', 'date', 'DateIssued'], '');
    const nameVal = this.pick(v, ['licensee', 'Licensee', 'name'], '');
    const addressVal = this.pick(v, ['address', 'Address'], '');
    const particularsVal = this.pick(v, ['particulars', 'Particulars'], '');
    const periodCoveredVal = this.pick(v, ['periodCovered', 'PeriodCovered'], '');

    // ✅ DST
    const dstVal = this.pickNum(v, ['dst', 'DST'], 0);

    // ✅ AM/ROC computed fields (your SoaFeesComponent must patch these exact names)
    const amRadioStationLicense = this.pickNum(v, ['amRadioStationLicense'], 0);
    const amRadioOperatorsCert  = this.pickNum(v, ['amRadioOperatorsCert'], 0);
    const amApplicationFee      = this.pickNum(v, ['amApplicationFee'], 0);
    const amFilingFee           = this.pickNum(v, ['amFilingFee'], 0);
    const amSeminarFee          = this.pickNum(v, ['amSeminarFee'], 0);
    const amSurcharges          = this.pickNum(v, ['amSurcharges', 'amSurchargesFee', 'amSurcharge'], 0);

    // ✅ fallback ROC raw fields
    const rocRadioStation    = this.pickNum(v, ['rocRadioStation'], 0);
    const rocOperatorFee     = this.pickNum(v, ['rocOperatorFee'], 0);
    const rocApplicationFee2 = this.pickNum(v, ['rocApplicationFee'], 0);
    const rocFilingFee       = this.pickNum(v, ['rocFillingFee'], 0);
    const rocSeminarFee      = this.pickNum(v, ['rocSeminarFee'], 0);
    const rocSurcharge       = this.pickNum(v, ['rocSurcharge'], 0);

    const showRadioStation = amRadioStationLicense !== 0 ? amRadioStationLicense : rocRadioStation;
    const showOperatorCert = amRadioOperatorsCert  !== 0 ? amRadioOperatorsCert  : rocOperatorFee;
    const showAppFee       = amApplicationFee      !== 0 ? amApplicationFee      : rocApplicationFee2;
    const showFilingFee    = amFilingFee           !== 0 ? amFilingFee           : rocFilingFee;
    const showSeminarFee   = amSeminarFee          !== 0 ? amSeminarFee          : rocSeminarFee;
    const showSurcharges   = amSurcharges          !== 0 ? amSurcharges          : rocSurcharge;

    // ✅ ✅ ✅ KEY FIX: send real checkbox booleans to PDF
    const checkboxFlags = {
      txnNew: !!v.txnNew,
      txnRenew: !!v.txnRenew,
      txnCO: !!v.txnCO,
      txnCV: !!v.txnCV,
      txnModification: !!v.txnModification,
      catROC: !!v.catROC,

      // optional right-panel categories if you want later:
      catMS: !!v.catMS,
      catMA: !!v.catMA,
      catOTHERS: !!v.catOTHERS,
    };

    // ✅ Keep type for backward compatibility (not required anymore)
    const type =
      checkboxFlags.txnNew ? 'New' :
      checkboxFlags.txnRenew ? 'Ren' :
      checkboxFlags.txnCO ? 'ECO' :
      checkboxFlags.txnCV ? 'CV' :
      checkboxFlags.txnModification ? 'MOD' :
      checkboxFlags.catROC ? 'ROC' : 'New';

    const soaData: any = {
      // ✅ header
      soaNo: this.pick(v, ['soaNo', 'SOASeries', 'soaSeries', 'seriesNumber'], ''),
      date: dateVal,
      name: nameVal,
      address: addressVal,
      particulars: particularsVal,
      periodCovered: periodCoveredVal,

      // ✅ pass BOTH (some templates use type, ours will use the flags)
      type,
      flags: checkboxFlags, // ✅ NEW: used by pdf service

      sections: [
        {
          title: 'FOR LICENSES',
          rows: [
            ['Permit to Purchase', this.pickNum(v, ['licPermitToPurchase', 'rslPurchase'], 0)],
            ['Filing Fee', this.pickNum(v, ['licFilingFee', 'rslFillingFee'], 0)],
            ['Permit to Possess / Storage', this.pickNum(v, ['licPermitToPossess', 'rslPossess'], 0)],
            ['Construction Permit Fee', this.pickNum(v, ['licConstructionPermitFee', 'rslConstruction'], 0)],
            ['Radio Station License', this.pickNum(v, ['licRadioStationLicense', 'rslRadioStation'], 0)],
            ['Inspection Fee', this.pickNum(v, ['licInspectionFee', 'rslInspection'], 0)],
            ['Spectrum User’s Fee (SUF)', this.pickNum(v, ['licSUF', 'rslSUF'], 0)],
            ['Surcharges', this.pickNum(v, ['licSurcharges', 'rslSurcharge'], 0)],
            ['Fines and Penalties', this.pickNum(v, ['licFinesPenalties'], 0)],
          ]
        },
        {
          title: 'FOR PERMITS',
          rows: [
            ['Permit (Dealer / Reseller / Service Center)', this.pickNum(v, ['perPermitFees', 'permitPermitFees'], 0)],
            ['Inspection Fee', this.pickNum(v, ['perInspectionFee', 'permitInspection'], 0)],
            ['Filing Fee', this.pickNum(v, ['perFilingFee', 'permitFillingFee'], 0)],
            ['Surcharges', this.pickNum(v, ['perSurcharges', 'permitSurcharge'], 0)],
          ]
        },
        {
          title: 'FOR AMATEUR AND ROC',
          rows: [
            ['Radio Station License', showRadioStation],
            ["Radio Operator’s Certificate", showOperatorCert],
            ['Application Fee', showAppFee],
            ['Filing Fee', showFilingFee],
            ['Seminar Fee', showSeminarFee],
            ['Surcharges', showSurcharges],
          ]
        },
        {
          title: 'OTHER APPLICATION',
          rows: [
            ['Registration Fee', this.pickNum(v, ['appRegistrationFee', 'otherRegistration'], 0)],
            ['Supervision / Regulation Fee', this.pickNum(v, ['appSupervisionRegulationFee', 'otherSupervisionRegulation'], 0)],
            ['Verification / Authentication Fee', this.pickNum(v, ['appVerificationAuthFee', 'otherVerificationAuthentication'], 0)],
            ['Examination Fee', this.pickNum(v, ['appExaminationFee', 'otherExamination'], 0)],
            ['Clearance / Certification Fee (Special)', this.pickNum(v, ['appClearanceCertificationFee', 'otherClearanceCertification'], 0)],
            ['Modification Fee', this.pickNum(v, ['appModificationFee', 'otherModification'], 0)],
            ['Miscellaneous Income', this.pickNum(v, ['appMiscIncome', 'otherMiscIncome'], 0)],
            ['Documentary Stamp Tax (DST)', dstVal],
            ['Others', this.pickNum(v, ['appOthers', 'otherOthers'], 0)],
          ]
        }
      ]
    };

    // ✅ DEBUG: verify checkbox values before sending to pdf
    console.log('[RightPanel] checkboxFlags', checkboxFlags);
    console.log('[RightPanel] particulars', particularsVal, 'periodCovered', periodCoveredVal);

    this.soaPdf.generatePDF(soaData);
  }
}