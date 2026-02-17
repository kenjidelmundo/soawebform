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
    AssessmentComponent
  ],
  templateUrl: './soa-page.component.html',
  styleUrls: ['./soa-page.component.css']
})
export class SoaPageComponent {
  form: FormGroup;
  saving = false;

  @ViewChild('assess') assess!: AssessmentComponent;

  constructor(private fb: FormBuilder, private soaService: SoaService) {
    this.form = this.fb.group({
      // ===== Header/basic
      id: [''],
      isMobileLicensing: [false],
      seriesNumber: [''],
      soaSeries: [''],

      // ===== Header UI
      date: [null],
      payeeName: [''],
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

      // ===== MID ROC
      amRadioStationLicense: [0],
      amRadioOperatorsCert: [0],
      amApplicationFee: [0],
      amFilingFee: [0],
      amSeminarFee: [0],
      amSurcharges: [0],

      // DST + TOTAL
      dst: [0],
      totalAmount: [0],
    });
  }

  // -------------------------
  // Helpers
  // -------------------------
  private toIsoDate(x: any): string | null {
    if (x === null || x === undefined || x === '') return null;
    if (typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x)) return x;
    const d = new Date(x);
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
  }

  private toYmd(iso: any): string | null {
    if (!iso) return null;
    if (typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}/.test(iso)) return iso.substring(0, 10);
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // -------------------------
  // LOAD header first (by ID)
  // -------------------------
  loadHeader(id: number): void {
    if (!id || id <= 0) {
      alert('Enter a valid ID.');
      return;
    }

    this.soaService.getById(id).subscribe({
      next: (data: any) => {
        // Patch header first (like you want)
        this.form.patchValue({
          id: data.id ?? id,
          date: this.toYmd(data.dateIssued),
          payeeName: data.licensee ?? '',
          address: data.address ?? '',
          particulars: data.particulars ?? '',
          periodFrom: this.toYmd(data.periodFrom),
          periodTo: this.toYmd(data.periodTo),
          periodYears: data.periodYears ?? 0,
          periodCovered: data.periodCovered ?? '',

          // optional: also load fees if you want them shown
          licPermitToPurchase: data.rslPurchase ?? 0,
          licFilingFee: data.rslFillingFee ?? 0,
          licPermitToPossess: data.rslPossess ?? 0,
          licConstructionPermitFee: data.rslConstruction ?? 0,
          licRadioStationLicense: data.rslRadioStation ?? 0,
          licInspectionFee: data.rslInspection ?? 0,
          licSUF: data.rslSUF ?? 0,
          licSurcharges: data.rslSurcharge ?? 0,

          perPermitFees: data.permitPermitFees ?? 0,
          perInspectionFee: data.permitInspection ?? 0,
          perFilingFee: data.permitFillingFee ?? 0,
          perSurcharges: data.permitSurcharge ?? 0,

          amRadioStationLicense: data.rocRadioStation ?? 0,
          amRadioOperatorsCert: data.rocOperatorFee ?? 0,
          amApplicationFee: data.rocApplicationFee ?? 0,
          amFilingFee: data.rocFillingFee ?? 0,
          amSeminarFee: data.rocSeminarFee ?? 0,
          amSurcharges: data.rocSurcharge ?? 0,

          appRegistrationFee: data.otherRegistration ?? 0,
          appSupervisionRegulationFee: data.otherSupervisionRegulation ?? 0,
          appVerificationAuthFee: data.otherVerificationAuthentication ?? 0,
          appExaminationFee: data.otherExamination ?? 0,
          appClearanceCertificationFee: data.otherClearanceCertification ?? 0,
          appModificationFee: data.otherModification ?? 0,
          appMiscIncome: data.otherMiscIncome ?? 0,
          appOthers: data.otherOthers ?? 0,

          dst: data.dst ?? 0,
          totalAmount: data.totalAmount ?? 0,
        }, { emitEvent: false });

        console.log('✅ Loaded:', data);
      },
      error: (err) => {
        console.error('❌ Load failed:', err);
        alert(`❌ Load failed: ${err?.status} ${err?.statusText}`);
      }
    });
  }

  // -------------------------
  // SAVE (UPDATE existing)
  // -------------------------
  save(): void {
    const v: any = this.form.value;
    const id = Number(v.id || 0);

    if (!id || id <= 0) {
      alert('❌ No ID found. Load an existing record first.');
      return;
    }

    // Backend field names MUST match Swagger
    const payload: any = {
      // header
      dateIssued: this.toIsoDate(v.date),
      licensee: (v.payeeName ?? '') === '' ? null : v.payeeName,
      address: (v.address ?? '') === '' ? null : v.address,
      particulars: (v.particulars ?? '') === '' ? null : v.particulars,
      periodFrom: this.toIsoDate(v.periodFrom),
      periodTo: this.toIsoDate(v.periodTo),
      periodYears: Number(v.periodYears || 0),
      periodCovered: (v.periodCovered ?? '') === '' ? null : v.periodCovered,

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

    this.soaService.update(id, payload).subscribe({
      next: (res: any) => {
        this.saving = false;
        console.log('✅ Updated:', res);
        alert(`✅ Updated record ID: ${id}`);
      },
      error: (err: any) => {
        this.saving = false;
        console.error('❌ Update failed:', err);
        alert(`❌ Update failed\nStatus: ${err?.status}\n${err?.message}`);
      }
    });
  }

  newRecord(): void {
    this.form.reset({
      periodYears: 0,
      txnNew: false,
      txnRenew: false,
      txnModification: false,
      txnCO: false,
      txnCV: false,
      catROC: false,
      catMS: false,
      catMA: false,
      catOTHERS: false,
      preparedBy: 'Engr. Francis T. M. Alfanta',
      approvedBy: 'Engr. William Ramon Luber',
      totalAmount: 0,
    });
  }

  printSoa(): void { console.log('printSoa'); }
  printOp(): void { console.log('printOp'); }

  assessmentOnly(): void {
    if (!this.assess) {
      alert('Assessment component not found.');
      return;
    }
    this.assess.exportPDF();
  }
}
