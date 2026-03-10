import { Injectable } from '@angular/core';
import { FormGroup } from '@angular/forms';

import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';

(pdfMake as any).vfs = (pdfFonts as any).vfs;

@Injectable({ providedIn: 'root' })
export class AssessmentPdfService {
  private form: FormGroup | null = null;

  setForm(form: FormGroup) {
    this.form = form;
  }

  generatePDF(extra: any = {}): void {
    const live = this.form?.getRawValue?.() ?? this.form?.value ?? {};
    const v = { ...(extra ?? {}), ...(live ?? {}) };

    // ✅ same alias as your AssessmentComponent
    const resolve = (name: string) => {
      const map: Record<string, string> = {
        co: 'txnCO',
        cv: 'txnCV',
        forAssessmentOnly: 'opAssessmentOnly',
        endorsedForPayment: 'opEndorsedForPayment',
        years: 'periodYears',
        dueDate: 'opNotePayOnOrBefore',
        payeeName: 'licensee',
      };
      return map[name] ?? name;
    };

    const pick = (keys: string[], fallback: any = ''): any => {
      for (const k of keys) {
        const kk = resolve(k);
        const val = (v as any)?.[kk];
        if (val !== undefined && val !== null && String(val).trim() !== '') return val;
      }
      return fallback;
    };

    const fmtDate = (x: any): string => {
      if (!x) return '';
      const d = x instanceof Date ? x : new Date(x);
      if (isNaN(d.getTime())) return String(x);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    };

    const money = (n: any) =>
      Number(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 });

    const cb = (checked: boolean) => ({
      canvas: [
        { type: 'rect', x: 0, y: 0, w: 6, h: 6, lineWidth: 0.6 },
        ...(checked
          ? [
              { type: 'line', x1: 1, y1: 3.5, x2: 2.8, y2: 5.2, lineWidth: 1 },
              { type: 'line', x1: 2.6, y1: 5.2, x2: 5.4, y2: 1.1, lineWidth: 1 },
            ]
          : []),
      ],
    });

    // ✅ values (same “fetch from form” pattern)
    const dateStr = fmtDate(pick(['date', 'dateIssued'], ''));
    const soaNo = pick(['soaSeries', 'soaNo'], '');
    const licensee = pick(['licensee', 'payeeName', 'name'], '');
    const address = pick(['address'], '');
    const particulars = pick(['particulars'], '');
    const years = pick(['periodYears', 'years'], 0);

    const totalAmount = money(pick(['totalAmount'], 0));
    const dueDate = fmtDate(pick(['opNotePayOnOrBefore', 'dueDate'], ''));

    const forAssessmentOnly = !!pick(['opAssessmentOnly', 'forAssessmentOnly'], false);
    const endorsedForPayment = !!pick(['opEndorsedForPayment', 'endorsedForPayment'], false);

    const preparedBy = String(pick(['preparedBy'], ''));
    const approvedBy = String(pick(['approvedBy'], ''));

    // ✅ This matches your screenshot layout (simple + footer area)
    const blockLine = (label: string, value: any) => ({
      columns: [
        { text: label, bold: true, width: 60, fontSize: 6.5 },
        { text: String(value ?? ''), width: '*', fontSize: 6.5 },
      ],
      margin: [0, 0, 0, 2],
    });

    const footerArea = {
      margin: [0, 6, 0, 0],
      stack: [
        {
          text: 'NOTE: To be paid on or before the due date otherwise subject to reassessment.',
          fontSize: 6,
          margin: [0, 0, 2, 0],
        },
        {
          columns: [
            {
              columns: [cb(forAssessmentOnly), { text: 'For Assessment Only', fontSize: 6, margin: [3, 0, 0, 0] }],
              columnGap: 2,
              width: 'auto',
            },
            {
              columns: [cb(endorsedForPayment), { text: 'Endorsed for Payment', fontSize: 6, margin: [3, 0, 0, 0] }],
              columnGap: 2,
              width: 'auto',
            },
          ],
          columnGap: 24,
        },
      ],
    };

    const oneCopy = {
      width: '50%',
      stack: [
        { text: 'ASSESSMENT', bold: true, alignment: 'center', fontSize: 8, margin: [0, 0, 0, 6] },

        {
          columns: [
            { width: '*', stack: [blockLine('Date', dateStr), blockLine('SOA No.', soaNo), blockLine('Years', years)] },
            { width: '*', stack: [blockLine('Licensee', licensee), blockLine('Address', address)] },
          ],
          columnGap: 30,
          margin: [0, 0, 0, 4],
        },

        { text: `Particulars: ${particulars}`, fontSize: 6.5, margin: [0, 2, 0, 2] },

        {
          columns: [
            { columns: [cb(!!pick(['txnCO', 'co'], false)), { text: 'CO', fontSize: 6.5, margin: [3, 0, 0, 0] }], width: 'auto' },
            { columns: [cb(!!pick(['txnCV', 'cv'], false)), { text: 'CV', fontSize: 6.5, margin: [3, 0, 0, 0] }], width: 'auto' },
            { text: `Total Amount: ${totalAmount}`, fontSize: 6.5, alignment: 'right', width: '*' },
          ],
          columnGap: 12,
          margin: [0, 2, 0, 2],
        },

        { text: `Due Date: ${dueDate}`, fontSize: 6.5, margin: [0, 2, 0, 0] },

        footerArea,
      ],
    };

    const docDefinition: any = {
      pageSize: 'A4',
      pageOrientation: 'landscape',
      pageMargins: [12, 12, 12, 12],
      defaultStyle: { fontSize: 6.5, lineHeight: 1.05 },
      content: [
        {
          columns: [oneCopy, oneCopy],
          columnGap: 10,
        },
      ],
    };

    pdfMake.createPdf(docDefinition).open();
  }
}
