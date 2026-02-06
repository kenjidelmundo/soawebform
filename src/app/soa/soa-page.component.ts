import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';

import { SoaService, TechSOAHeaderCreateDto } from './soa.service';

import { SoaHeaderComponent } from './header/soa-header.component';
import { SoaFeesComponent } from './fees/soa-fees.component';
import { SoaLeftFormComponent } from './soa-left/soa-left-form.component';
import { SoaRightPanelComponent } from './soa-right/soa-right-panel.component';

@Component({
  selector: 'app-soa-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SoaHeaderComponent,
    SoaLeftFormComponent,
    SoaRightPanelComponent,
    SoaFeesComponent
  ],
  templateUrl: './soa-page.component.html',
  styleUrls: ['./soa-page.component.css']
})
export class SoaPageComponent {
  form: FormGroup;

  saving = false;
  savedHeaderId: number | null = null;

  constructor(private fb: FormBuilder, private soaService: SoaService) {
    this.form = this.fb.group({
      // ===========================
      // LEFT HEADER (SAVE NOW)
      // ===========================
      date: [null],
      payeeName: [''],
      address: [''],
      particulars: [''],
      periodFrom: [null],
      periodTo: [null],
      periodYears: [0],

      // ===========================
      // RIGHT PANEL (buttons)
      // ===========================
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

      // ===========================
      // Accounting fields
      // ===========================
      accounting: [''],
      accountingPosition: [''],

      // ===========================
      // FEES placeholders (para hindi mag crash)
      // If may kulang na controlName sa fees html mo, add dito.
      // ===========================
      isPurchase: [0],
      isFilingFee: [0],
      isPossess: [0],
      rslConstruction: [0],
      rslRadioStation: [0],
      rslInspection: [0],
      rslSUF: [0],
      amnestyFine: [0],
      rslSurcharge: [0],
      permitPermitFees: [0],
      permitInspection: [0],
      permitFillingFee: [0],
      permitSurcharge: [0],
      rocRadioStation: [0],
      rocOperatorFee: [0],
      rocFilingFee: [0],
      rocSeminarFee: [0],
      rocSurcharge: [0],
      otherRegistration: [0],
      otherSRF: [0],
      otherVerification: [0],
      otherExam: [0],
      otherClearanceandCertFee: [0],
      otherModification: [0],
      otherMiscIncome: [0],
      dst: [0],
      otherOthers: [0],
      totalAmount: [0]
    });
  }

  // ✅ SAVE button from right panel -> calls this
  save(): void {
    const v = this.form.value;

    const payload: TechSOAHeaderCreateDto = {
      dateIssued: v.date ?? null,
      licensee: v.payeeName ?? null,
      address: v.address ?? null,
      particulars: v.particulars ?? null,
      periodFrom: v.periodFrom ?? null,
      periodTo: v.periodTo ?? null,
      periodYears:
        v.periodYears === '' || v.periodYears === null || v.periodYears === undefined
          ? null
          : Number(v.periodYears),
    };

    this.saving = true;

    this.soaService.createHeader(payload).subscribe({
      next: (res) => {
        this.savedHeaderId = res?.id ?? res?.ID ?? null;
        this.saving = false;
        console.log('✅ Saved header:', res);
        alert(`✅ Saved! ID: ${this.savedHeaderId ?? 'N/A'}`);
      },
      error: (err) => {
        this.saving = false;
        console.error('❌ Save failed FULL:', err);

        const status = err?.status;
        const url = err?.url;
        const msg = err?.message;
        const serverMsg = err?.error;

        alert(
          `❌ Save failed\n\n` +
          `Status: ${status}\n` +
          `URL: ${url}\n` +
          `Message: ${msg}\n` +
          `Server: ${typeof serverMsg === 'string' ? serverMsg : JSON.stringify(serverMsg)}`
        );
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
      totalAmount: 0
    });
    this.savedHeaderId = null;
  }

  printSoa(): void { console.log('printSoa'); }
  assessmentOnly(): void { console.log('assessmentOnly'); }
  printOp(): void { console.log('printOp'); }
}
