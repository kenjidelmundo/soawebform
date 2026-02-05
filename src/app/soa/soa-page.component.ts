import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';

import { SoaHeaderComponent } from './header/soa-header.component';
import { SoaLeftFormComponent } from './soa-left/soa-left-form.component';
import { SoaFeesComponent } from './fees/soa-fees.component';
import { SoaRightPanelComponent } from './soa-right/soa-right-panel.component';

@Component({
  selector: 'app-soa-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SoaHeaderComponent,
    SoaLeftFormComponent,
    SoaFeesComponent,
    SoaRightPanelComponent
  ],
  templateUrl: './soa-page.component.html',
  styleUrls: ['./soa-page.component.css']
})
export class SoaPageComponent {
  form: FormGroup;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      id: ['6792'],
      isMobileLicensing: [true],
      soaSeries: ['2025-08-327M'],
      seriesNumber: ['327'],

      date: ['8/14/2025'],
      payorName: ['RAYMUNDO P. CALINDOG'],
      address: ['San Jose St., Goa, Cam. Sur'],
      particulars: ['REN - Amateur D (3yrs)'],
      periodCovered: ['2025 - 2028'],

      txnNew: [true],
      txnRenew: [true],
      txnModification: [true],
      txnCO: [false],
      txnCV: [true],

      catROC: [true],
      catMS: [false],
      catMA: [false],
      catOTHERS: [false],

      remarks: [''],

      // LICENSES
      licPermitToPurchase: [''],
      licFilingFee: [''],
      licPermitToPossess: [''],
      licConstructionPermitFee: [''],
      licRadioStationLicense: [''],
      licInspectionFee: [''],
      licSUF: [''],
      licFinesPenalties: [''],
      licSurcharges: [''],

      // OTHER APPLICATION
      appRegistrationFee: [''],
      appSupervisionRegulationFee: [''],
      appVerificationAuthFee: [''],
      appExaminationFee: [''],
      appClearanceCertificationFee: [''],
      appModificationFee: [''],
      appMiscIncome: [''],
      appOthers: [''],

      // PERMITS
      perPermitFees: [''],
      perInspectionFee: [''],
      perFilingFee: [''],
      perSurcharges: [''],

      // AMATEUR/ROC
      amRadioStationLicense: ['432.00'],
      amRadioOperatorsCert: ['180.00'],
      amApplicationFee: [''],
      amFilingFee: [''],
      amSeminarFee: [''],
      amSurcharges: ['102.00'],

      dst: ['30.00'],
      totalAmount: ['744.00'],

      accounting: ['KHATYLIN B. RAÑA'],
      accountingPosition: ['Head of Accounting Division/Unit/Authorized Official'],

      opAssessmentOnly: [false],
      opEndorsedForPayment: [false],
      opNotePayOnOrBefore: [''],

      preparedBy: ['Engr. Francis T. M. Alfanta'],
      approvedBy: ['Engr. William Ramon Luber'],

      opSeries: ['2025-08-00256M'],
      orNumber: [''],
      datePaid: ['']
    });
  }

  save() {}
  newRecord() {}
  printSoa() {}
  assessmentOnly() {}
  printOp() {}
}
