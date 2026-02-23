import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';

import { SoaService } from './soa.service';

import { SoaHeaderComponent } from './header/soa-header.component';
import { SoaFeesComponent } from './fees/soa-fees.component';
import { SoaLeftFormComponent } from './soa-left/soa-left-form.component';
import { SoaRightPanelComponent } from './soa-right/soa-right-panel.component';
import { AssessmentComponent } from './soa-assessment-form/assessment.component';

@Component({
  selector: 'app-soa-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SoaHeaderComponent,
    SoaLeftFormComponent,
    SoaRightPanelComponent,
    SoaFeesComponent,
    AssessmentComponent,
  ],
  templateUrl: './soa-page.component.html',
  styleUrls: ['./soa-page.component.css'],
})
export class SoaPageComponent {
  form: FormGroup;
  saving = false;

  // ✅ FIX: do NOT use @ViewChild('assess') unless your HTML has #assess
  // This will find the first <app-assessment> in your template automatically.
  @ViewChild(AssessmentComponent) assess!: AssessmentComponent;

  constructor(private fb: FormBuilder, private soaService: SoaService) {
    this.form = this.fb.group({
      // ===== Header/basic
      id: [0], // display only
      isMobileLicensing: [false],
      seriesNumber: [''],
      soaSeries: [''],

      // ===== Header UI
      date: [null],

      // ✅ payeeName holds SELECTED DB ID (dropdown value = p.id)
      payeeName: [''],

      // ✅ store string licensee for backend payload
      licensee: [''],

      address: [''],
      particulars: [''],
      periodFrom: [null],
      periodTo: [null],
      periodYears: [0],
      periodCovered: [''],

      // ===== Right panel
      txnNew: [false],
      txnRenew: [false],
      txnModification: [false],
      txnCO: [false],
      txnCV: [false],
      catROC: [false],
      catMS: [false],
      catMA: [false],
      catOTHERS: [false],
      remarks: [''],
      opAssessmentOnly: [false],
      opEndorsedForPayment: [false],
      opNotePayOnOrBefore: [''],
      preparedBy: ['Engr. Francis T. M. Alfanta'],
      approvedBy: ['Engr. William Ramon Luber'],
      opSeries: [''],
      orNumber: [''],
      datePaid: [null],
      accounting: [''],
      accountingPosition: [''],

      // ===== LEFT (LICENSES)
      licPermitToPurchase: [0],
      licFilingFee: [0],
      licPermitToPossess: [0],
      licConstructionPermitFee: [0],
      licRadioStationLicense: [0],
      licInspectionFee: [0],
      licSUF: [0],
      licFinesPenalties: [0],
      licSurcharges: [0],

      // ===== LEFT OTHER APPLICATION
      appRegistrationFee: [0],
      appSupervisionRegulationFee: [0],
      appVerificationAuthFee: [0],
      appExaminationFee: [0],
      appClearanceCertificationFee: [0],
      appModificationFee: [0],
      appMiscIncome: [0],
      appOthers: [0],

      // ===== MID PERMITS
      perPermitFees: [0],
      perInspectionFee: [0],
      perFilingFee: [0],
      perSurcharges: [0],

      // ===== MID AMATEUR & ROC BLOCK (UI fields)
      amRadioStationLicense: [0],
      amRadioOperatorsCert: [0],
      amApplicationFee: [0],
      amFilingFee: [0],
      amSeminarFee: [0],
      amSurcharges: [0],

      // DST + TOTAL
      dst: [0],
      totalAmount: [0],

      // ==================================================
      // ✅ REQUIRED HIDDEN CONTROLS (for SoaFees computation)
      // ==================================================
      // ROC selectors
      amType: [''], // ex: COMM-NEW, SROP-NEW, etc
      rocClass: [''], // ex: RTG 1st, PHN 2nd, etc
      rocYears: [1], // ✅ default 1 (NOT 0)

      // AMATEUR selectors
      amateurType: [''], // ✅ REQUIRED (missing in your code)
      amYears: [1], // ✅ default 1 (NOT 0)

      // Ship selectors (if you use)
      shipType: [''],
      shipYears: [1], // ✅ default 1
      shipUnits: [1], // ✅ default 1
    });
  }

  // -------------------------
  // Helpers
  // -------------------------
  private toIsoDate(x: any): string | null {
    if (x === null || x === undefined || x === '') return null;

    // already YYYY-MM-DD
    if (typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x)) {
      const d = new Date(x);
      return isNaN(d.getTime()) ? null : d.toISOString();
    }

    const d = new Date(x);
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
  }

  // -------------------------
  // SAVE = UPDATE ONLY
  // -------------------------
  save(): void {
    if (this.saving) return;

    const v: any = this.form.value ?? {};
    const selectedId = Number(v.payeeName || 0);

    if (!selectedId || selectedId <= 0) {
      alert('❌ Select a record first (Name of Payee).');
      return;
    }

    const payload: any = {
      dateIssued: this.toIsoDate(v.date),

      licensee: (v.licensee ?? '') === '' ? null : String(v.licensee).trim(),
      address: (v.address ?? '') === '' ? null : String(v.address),
      particulars: (v.particulars ?? '') === '' ? null : String(v.particulars),

      periodFrom: this.toIsoDate(v.periodFrom),
      periodTo: this.toIsoDate(v.periodTo),
      periodYears: Number(v.periodYears || 0),
      periodCovered: (v.periodCovered ?? '') === '' ? null : String(v.periodCovered),

      // rsl*
      rslPurchase: Number(v.licPermitToPurchase || 0),
      rslFillingFee: Number(v.licFilingFee || 0),
      rslPossess: Number(v.licPermitToPossess || 0),
      rslConstruction: Number(v.licConstructionPermitFee || 0),
      rslRadioStation: Number(v.licRadioStationLicense || 0),
      rslInspection: Number(v.licInspectionFee || 0),
      rslSUF: Number(v.licSUF || 0),
      rslSurcharge: Number(v.licSurcharges || 0),

      // permit*
      permitPermitFees: Number(v.perPermitFees || 0),
      permitInspection: Number(v.perInspectionFee || 0),
      permitFillingFee: Number(v.perFilingFee || 0),
      permitSurcharge: Number(v.perSurcharges || 0),

      // roc*
      rocRadioStation: Number(v.amRadioStationLicense || 0),
      rocOperatorFee: Number(v.amRadioOperatorsCert || 0),
      rocApplicationFee: Number(v.amApplicationFee || 0),
      rocFillingFee: Number(v.amFilingFee || 0),
      rocSeminarFee: Number(v.amSeminarFee || 0),
      rocSurcharge: Number(v.amSurcharges || 0),

      // other*
      otherRegistration: Number(v.appRegistrationFee || 0),
      otherSupervisionRegulation: Number(v.appSupervisionRegulationFee || 0),
      otherVerificationAuthentication: Number(v.appVerificationAuthFee || 0),
      otherExamination: Number(v.appExaminationFee || 0),
      otherClearanceCertification: Number(v.appClearanceCertificationFee || 0),
      otherModification: Number(v.appModificationFee || 0),
      otherMiscIncome: Number(v.appMiscIncome || 0),
      otherOthers: Number(v.appOthers || 0),

      dst: Number(v.dst || 0),
      totalAmount: Number(v.totalAmount || 0),
    };

    this.saving = true;

    this.soaService.update(selectedId, payload).subscribe({
      next: () => {
        this.saving = false;
        this.form.patchValue({ id: selectedId }, { emitEvent: false });
        alert(`✅ Updated record ID: ${selectedId}`);
      },
      error: (err: any) => {
        this.saving = false;
        console.error('❌ Update failed:', err);
        alert(`❌ Update failed\nStatus: ${err?.status}\n${err?.message}`);
      },
    });
  }

  // -------------------------
  // NEW RECORD = CLEAN FORM (NO CREATE)
  // -------------------------
  newRecord(): void {
    this.form.reset(
      {
        id: 0,
        isMobileLicensing: false,
        seriesNumber: '',
        soaSeries: '',

        date: null,
        payeeName: '',
        licensee: '',
        address: '',
        particulars: '',

        periodFrom: null,
        periodTo: null,
        periodYears: 0,
        periodCovered: '',

        txnNew: false,
        txnRenew: false,
        txnModification: false,
        txnCO: false,
        txnCV: false,
        catROC: false,
        catMS: false,
        catMA: false,
        catOTHERS: false,
        remarks: '',
        opAssessmentOnly: false,
        opEndorsedForPayment: false,
        opNotePayOnOrBefore: '',
        preparedBy: 'Engr. Francis T. M. Alfanta',
        approvedBy: 'Engr. William Ramon Luber',
        opSeries: '',
        orNumber: '',
        datePaid: null,
        accounting: '',
        accountingPosition: '',

        licPermitToPurchase: 0,
        licFilingFee: 0,
        licPermitToPossess: 0,
        licConstructionPermitFee: 0,
        licRadioStationLicense: 0,
        licInspectionFee: 0,
        licSUF: 0,
        licFinesPenalties: 0,
        licSurcharges: 0,

        appRegistrationFee: 0,
        appSupervisionRegulationFee: 0,
        appVerificationAuthFee: 0,
        appExaminationFee: 0,
        appClearanceCertificationFee: 0,
        appModificationFee: 0,
        appMiscIncome: 0,
        appOthers: 0,

        perPermitFees: 0,
        perInspectionFee: 0,
        perFilingFee: 0,
        perSurcharges: 0,

        amRadioStationLicense: 0,
        amRadioOperatorsCert: 0,
        amApplicationFee: 0,
        amFilingFee: 0,
        amSeminarFee: 0,
        amSurcharges: 0,

        dst: 0,
        totalAmount: 0,

        // ✅ reset hidden triggers (defaults)
        amType: '',
        rocClass: '',
        rocYears: 1,

        amateurType: '',
        amYears: 1,

        shipType: '',
        shipYears: 1,
        shipUnits: 1,
      },
      { emitEvent: true }
    );
  }

  printSoa(): void {
    console.log('printSoa');
  }

  printOp(): void {
    console.log('printOp');
  }

  // ✅ FIXED: will now find the component and call exportPDF()
  assessmentOnly(): void {
    if (!this.form) {
      alert('Parent form not ready.');
      return;
    }

    if (!this.assess) {
      alert(
        'Assessment component not found in DOM.\nMake sure <app-assessment [form]="form"> exists in soa-page.component.html.'
      );
      return;
    }

    // ensure current typed changes are committed
    this.form.updateValueAndValidity({ emitEvent: false });

    this.assess.exportPDF();
  }
}