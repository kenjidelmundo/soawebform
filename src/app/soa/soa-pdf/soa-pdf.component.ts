import { Injectable } from '@angular/core';
import { FormGroup } from '@angular/forms';

import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';

(pdfMake as any).vfs = (pdfFonts as any).vfs;

@Injectable({ providedIn: 'root' })
export class SoaPdfService {
  private form: FormGroup | null = null;

  /** ✅ Call this once from SoaPage so service can fetch live checkbox + values */
  setForm(form: FormGroup) {
    this.form = form;
  }

  /** RightPanel calls this.soaPdf.generatePDF(soaData) — keep that unchanged */
  generatePDF(soaData: any): void {
    const live = this.form?.getRawValue?.() ?? this.form?.value ?? {};

    // ✅ Merge: use live form as source-of-truth (so checkboxes always correct)
    // But keep soaData as fallback if you pass computed rows there.
    const v = { ...(soaData ?? {}), ...(live ?? {}) };

    const dateStr = this.formatDate(this.pick(v, ['date', 'dateIssued', 'DateIssued'], ''));
    const soaNo = this.pick(v, ['soaSeries', 'SOASeries', 'soaNo', 'seriesNumber'], '');
    const name = this.pick(v, ['licensee', 'Licensee', 'name'], '');
    const address = this.pick(v, ['address', 'Address'], '');
    const particulars = this.pick(v, ['particulars', 'Particulars'], '');
    const periodCovered = this.pick(v, ['periodCovered', 'PeriodCovered'], '');
    const years = this.pick(v, ['periodYears', 'years', 'Years'], 0);

    // ✅ checkboxes from your REAL form controls
    const flags = {
      New: !!v.txnNew,
      Ren: !!v.txnRenew,
      ECO: !!v.txnCO,
      CV:  !!v.txnCV,
      MOD: !!v.txnModification,
      ROC: !!v.catROC,
    };

    // ✅ Build sections/rows (use what RightPanel already built, but fill missing from live form)
    const sections = (soaData?.sections?.length ? soaData.sections : this.buildSectionsFromForm(v));

    const docDefinition: any = {
      pageSize: 'A4',
      pageOrientation: 'landscape',
      pageMargins: [2.5, 2.5, 2.5, 2.5],
      content: [
        {
          columns: [
            this.soaColumn('Servicing Unit Copy', { dateStr, soaNo, name, address, particulars, periodCovered, years, flags, sections }),
            this.soaColumn('Accounting Unit Copy', { dateStr, soaNo, name, address, particulars, periodCovered, years, flags, sections }),
            this.soaColumn('COA Copy',           { dateStr, soaNo, name, address, particulars, periodCovered, years, flags, sections }),
            this.soaColumn('Cash Unit Copy',     { dateStr, soaNo, name, address, particulars, periodCovered, years, flags, sections }),
          ],
          columnGap: 1,
        },
      ],
      pageBreakBefore: () => false,
    };

    pdfMake.createPdf(docDefinition).open();
  }

  // -----------------------
  // Build sections from FORM (if RightPanel did not send sections)
  // -----------------------
  private buildSectionsFromForm(v: any) {
    const num = (x: any) => {
      const n = Number(x);
      return Number.isFinite(n) ? n : 0;
    };

    const dstVal = num(v.dst ?? v.DST);

    return [
      {
        title: 'FOR LICENSES',
        rows: [
          ['Permit to Purchase', num(v.licPermitToPurchase ?? v.rslPurchase)],
          ['Filing Fee', num(v.licFilingFee ?? v.rslFillingFee)],
          ['Permit to Possess / Storage', num(v.licPermitToPossess ?? v.rslPossess)],
          ['Construction Permit Fee', num(v.licConstructionPermitFee ?? v.rslConstruction)],
          ['Radio Station License', num(v.licRadioStationLicense ?? v.rslRadioStation)],
          ['Inspection Fee', num(v.licInspectionFee ?? v.rslInspection)],
          ['Spectrum User’s Fee (SUF)', num(v.licSUF ?? v.rslSUF)],
          ['Surcharges', num(v.licSurcharges ?? v.rslSurcharge)],
          ['Fines and Penalties', num(v.licFinesPenalties)],
        ],
      },
      {
        title: 'FOR PERMITS',
        rows: [
          ['Permit (Dealer / Reseller / Service Center)', num(v.perPermitFees ?? v.permitPermitFees)],
          ['Inspection Fee', num(v.perInspectionFee ?? v.permitInspection)],
          ['Filing Fee', num(v.perFilingFee ?? v.permitFillingFee)],
          ['Surcharges', num(v.perSurcharges ?? v.permitSurcharge)],
        ],
      },
      {
        title: 'FOR AMATEUR AND ROC',
        rows: [
          ['Radio Station License', num(v.amRadioStationLicense ?? v.rocRadioStation)],
          ["Radio Operator’s Certificate", num(v.amRadioOperatorsCert ?? v.rocOperatorFee)],
          ['Application Fee', num(v.amApplicationFee ?? v.rocApplicationFee)],
          ['Filing Fee', num(v.amFilingFee ?? v.rocFillingFee)],
          ['Seminar Fee', num(v.amSeminarFee ?? v.rocSeminarFee)],
          ['Surcharges', num(v.amSurcharges ?? v.rocSurcharge)],
        ],
      },
      {
        title: 'OTHER APPLICATION',
        rows: [
          ['Registration Fee', num(v.appRegistrationFee ?? v.otherRegistration)],
          ['Supervision / Regulation Fee', num(v.appSupervisionRegulationFee ?? v.otherSupervisionRegulation)],
          ['Verification / Authentication Fee', num(v.appVerificationAuthFee ?? v.otherVerificationAuthentication)],
          ['Examination Fee', num(v.appExaminationFee ?? v.otherExamination)],
          ['Clearance / Certification Fee (Special)', num(v.appClearanceCertificationFee ?? v.otherClearanceCertification)],
          ['Modification Fee', num(v.appModificationFee ?? v.otherModification)],
          ['Miscellaneous Income', num(v.appMiscIncome ?? v.otherMiscIncome)],
          ['Documentary Stamp Tax (DST)', dstVal],
          ['Others', num(v.appOthers ?? v.otherOthers)],
        ],
      },
    ];
  }

  // -----------------------
  // PDF layout parts
  // -----------------------
  private soaColumn(label: string, soa: any): any {
    return {
      width: '24.8%',
      stack: [
        { text: 'NATIONAL TELECOMMUNICATIONS COMMISSION', bold: true, fontSize: 7.1, alignment: 'center', margin: [0, 0, 0, 0.3] },
        { text: 'Statement of Account', fontSize: 6.5, alignment: 'center', margin: [0, 0, 0, 0.3] },
        { text: label, italics: true, fontSize: 6.2, alignment: 'center', margin: [0, 0, 0, 0.6] },

        { text: `Date:         ${soa.dateStr ?? ''}`, fontSize: 6.2, margin: [0, 0, 0, 0.2] },
        { text: `No.:           ${soa.soaNo ?? ''}`, fontSize: 6.2, margin: [0, 0, 0, 0.2] },
        { text: `Name:      ${soa.name ?? ''}`, fontSize: 6.2, margin: [0, 0, 0, 0.2] },
        { text: `Address:  ${soa.address ?? ''}`, fontSize: 6.2, margin: [0, 0, 0, 0.2] },

        // ✅ checkboxes row (fetch from form flags)
        {
          columns: [
            { columns: [this.checkBox(!!soa.flags?.New), { text: 'New', fontSize: 5.6 }], columnGap: 1.5 },
            { columns: [this.checkBox(!!soa.flags?.Ren), { text: 'Ren', fontSize: 5.6 }], columnGap: 1.5 },
            { columns: [this.checkBox(!!soa.flags?.ECO), { text: 'ECO', fontSize: 5.6 }], columnGap: 1.5 },
            { columns: [this.checkBox(!!soa.flags?.CV),  { text: 'CV',  fontSize: 5.6 }], columnGap: 1.5 },
            { columns: [this.checkBox(!!soa.flags?.MOD), { text: 'MOD', fontSize: 5.6 }], columnGap: 1.5 },
            { columns: [this.checkBox(!!soa.flags?.ROC), { text: 'ROC', fontSize: 5.6 }], columnGap: 1.5 },
          ],
          columnGap: 4,
          margin: [0, 0.6, 0, 0.6],
        },

        // ✅ Particulars line (from your ParticularsDialog result)
        { text: `Particulars: ${soa.particulars ?? ''}`, fontSize: 6.2, margin: [0, 0, 0, 0.6] },

        // ✅ Period Covered + Years (from form periodCovered + periodYears)
        {
          columns: [
            { text: `Period Covered: ${soa.periodCovered ?? ''}`, fontSize: 6.0 },
            { text: `Years: ${soa.years ?? ''}`, fontSize: 6.0, alignment: 'right' },
          ],
          margin: [0, 0, 0, 0.6],
        },

        this.createSoaTable(soa),

        { text: 'NOTE: To be paid on or before the due date otherwise subject to reassessment.', fontSize: 5.6, margin: [0, 1, 0, 0] },

        { text: '', margin: [0, 2, 0, 0] },
      ],
    };
  }

  private createSoaTable(soa: any): any {
    const body: any[] = [
      [
        { text: 'CODE', bold: true },
        { text: 'PARTICULARS', bold: true },
        { text: 'TOTAL', bold: true, alignment: 'right' },
      ],
    ];

    (soa.sections ?? []).forEach((section: any) => {
      body.push([{ text: section.title, colSpan: 3, bold: true, fontSize: 6 }, {}, {}]);

      (section.rows ?? []).forEach((row: any[]) => {
        const amt = Number(row[1] ?? 0);
        body.push([
          '',
          { text: String(row[0] ?? ''), fontSize: 6 },
          { text: (Number.isFinite(amt) ? amt : 0).toLocaleString('en-US', { minimumFractionDigits: 2 }), alignment: 'right', fontSize: 6 },
        ]);
      });
    });

    return {
      table: { widths: [22, '*', 58], body },
      fontSize: 5.9,
      margin: [0, 0.5, 0, 0.5],
    };
  }

  private checkBox(checked: boolean = false): any {
    return {
      canvas: [
        { type: 'rect', x: 0, y: 0, w: 5.5, h: 5.5, lineWidth: 0.5 },
        ...(checked
          ? [
              { type: 'line', x1: 1, y1: 3, x2: 2.5, y2: 5, lineWidth: 1 },
              { type: 'line', x1: 2.5, y1: 5, x2: 4.5, y2: 1, lineWidth: 1 },
            ]
          : []),
      ],
    };
  }

  // -----------------------
  // helpers
  // -----------------------
  private pick(v: any, keys: string[], fallback: any = ''): any {
    for (const k of keys) {
      const val = v?.[k];
      if (val !== undefined && val !== null && String(val).trim() !== '') return val;
    }
    return fallback;
  }

  private formatDate(x: any): string {
    if (!x) return '';
    const d = x instanceof Date ? x : new Date(x);
    if (isNaN(d.getTime())) return String(x);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }
}