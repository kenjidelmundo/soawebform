import { Injectable } from '@angular/core';
import { Soa } from '../models/soaform.model';

import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';

(pdfMake as any).vfs = (pdfFonts as any).vfs;

@Injectable({ providedIn: 'root' })
export class SoaPdfService {
  private formatParticulars(value: any): string {
    return String(value ?? '')
      .split('||')
      .map((part) => part.trim())
      .filter(Boolean)
      .join('\n');
  }

  generatePDF(soa: Soa): void {
    const docDefinition: any = {
      pageSize: 'A4',
      pageOrientation: 'landscape',
      pageMargins: [6, 6, 6, 6],
      defaultStyle: { fontSize: 6.0, lineHeight: 1.02 },
      content: [
        {
          columns: [
            this.soaColumn('Servicing Unit Copy', soa),
            this.soaColumn('Accounting Unit Copy', soa),
            this.soaColumn('COA Copy', soa),
            this.soaColumn('Cash Unit Copy', soa),
          ],
          columnGap: 8,
        },
      ],
    };

    console.log('[SoaPdfService] soa.flags:', (soa as any)?.flags);
    pdfMake.createPdf(docDefinition).open();
  }

  private cb(checked: boolean): any {
    return {
      canvas: [
        { type: 'rect', x: 0, y: 0, w: 6, h: 6, lineWidth: 0.6 },
        ...(checked
          ? [
              { type: 'line', x1: 1, y1: 3.5, x2: 2.8, y2: 5.2, lineWidth: 1 },
              { type: 'line', x1: 2.6, y1: 5.2, x2: 5.4, y2: 1.1, lineWidth: 1 },
            ]
          : []),
      ],
    };
  }

  private money(n: any): string {
    return Number(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
  }

  private createSoaTable(soa: Soa): any {
    const body: any[] = [
      [
        { text: 'CODE', bold: true, fontSize: 6.0 },
        { text: 'PARTICULARS', bold: true, fontSize: 6.0 },
        { text: 'TOTAL', bold: true, fontSize: 6.0, alignment: 'right' },
      ],
    ];

    const sections: any[] = Array.isArray((soa as any)?.sections) ? (soa as any).sections : [];
    let grandTotal = 0;

    sections.forEach((section) => {
      body.push([{ text: section.title ?? '', colSpan: 3, bold: true, fontSize: 6.0 }, {}, {}]);
      const rows = Array.isArray(section.rows) ? section.rows : [];
      rows.forEach((row: any) => {
        const amt = Number(row?.[1] ?? 0);
        grandTotal += amt;
        body.push([
          { text: '', fontSize: 5.8 },
          { text: row?.[0] ?? '', fontSize: 5.8 },
          { text: this.money(amt), alignment: 'right', fontSize: 5.8 },
        ]);
      });
    });

    body.push([
      { text: 'TOTAL AMOUNT', colSpan: 2, bold: true, fontSize: 6.0, alignment: 'right' },
      {},
      { text: this.money(grandTotal), bold: true, fontSize: 6.0, alignment: 'right' },
    ]);

    const headerRowIndex = 0;
    const totalRowIndex = body.length - 1;
    const sectionRowIndexes = new Set<number>();
    const targetTableHeight = 392;
    const dataRowWeight = 1;
    const sectionRowWeight = 1.1;
    const headerRowWeight = 1.18;

    let nextSectionIndex = 1;
    sections.forEach((section) => {
      sectionRowIndexes.add(nextSectionIndex);
      nextSectionIndex += 1 + (Array.isArray(section.rows) ? section.rows.length : 0);
    });

    const dataRowCount = body.length - sectionRowIndexes.size - 2;
    const totalWeight =
      (dataRowCount * dataRowWeight) +
      (sectionRowIndexes.size * sectionRowWeight) +
      (2 * headerRowWeight);
    const baseRowHeight = targetTableHeight / Math.max(totalWeight, 1);

    return {
      table: {
        widths: [22, '*', 46],
        body,
        heights: (rowIndex: number) => {
          if (rowIndex === headerRowIndex || rowIndex === totalRowIndex) {
            return Number((baseRowHeight * headerRowWeight).toFixed(2));
          }
          if (sectionRowIndexes.has(rowIndex)) {
            return Number((baseRowHeight * sectionRowWeight).toFixed(2));
          }
          return Number(baseRowHeight.toFixed(2));
        },
      },
      layout: {
        hLineWidth: () => 0.8,
        vLineWidth: () => 0.8,
        hLineColor: () => '#000',
        vLineColor: () => '#000',
        paddingLeft: () => 2,
        paddingRight: () => 2,
        paddingTop: () => 0.5,
        paddingBottom: () => 0.5,
      },
      margin: [0, 0.5, 0, 0],
    };
  }

  private resolveTypes(soa: Soa) {
    const flags = (soa as any)?.flags ?? null;
    if (flags) {
      return {
        New: !!flags.txnNew,
        Ren: !!flags.txnRenew,
        ECO: !!flags.txnCO,
        CV: !!flags.txnCV,
        MOD: !!flags.txnModification,
        ROC: !!flags.catROC,
      };
    }
    const t = (soa as any)?.type ?? '';
    return {
      New: t === 'New',
      Ren: t === 'Ren',
      ECO: t === 'ECO',
      CV: t === 'CV',
      MOD: t === 'MOD',
      ROC: t === 'ROC',
    };
  }

  private soaColumn(copyLabel: string, soa: Soa): any {
    const types = this.resolveTypes(soa);

    // ✅ THE TWO CHECKBOXES (MUST BE TRUE/FALSE HERE)
    const forAssessmentOnly = !!(soa as any)?.flags?.forAssessmentOnly;
    const endorsedForPayment = !!(soa as any)?.flags?.endorsedForPayment;

    const preparedBy = String((soa as any)?.preparedBy ?? '');
    const approvedBy = String((soa as any)?.approvedBy ?? '');

    const infoLine = (label: string, value: any) => ({
      columns: [
        { text: label, bold: true, width: 36, fontSize: 6.0 },
        { text: ':', bold: true, width: 6, fontSize: 6.0, alignment: 'center' },
        { text: String(value ?? ''), width: '*', fontSize: 6.0 },
      ],
      margin: [0, 0, 0, 0.2],
    });

    const cbItem = (lbl: string, checked: boolean) => ({
      columns: [this.cb(checked), { text: lbl, fontSize: 5.8, margin: [1, -0.2, 0, 0] }],
      columnGap: 1.2,
      width: 'auto',
    });

    const signBlock = (label: string, value: string) => ({
      width: '48%',
      stack: [
        { text: label, bold: true, fontSize: 5.8, margin: [0, 0, 0, 1] },
        {
          table: {
            widths: ['*'],
            body: [[
              {
                text: value || ' ',
                fontSize: 5.8,
                margin: [0, 0, 0, 1],
                border: [false, false, false, true],
              },
            ]],
          },
          layout: {
            hLineWidth: (i: number) => (i === 1 ? 0.8 : 0),
            vLineWidth: () => 0,
            hLineColor: () => '#000',
            paddingLeft: () => 0,
            paddingRight: () => 0,
            paddingTop: () => 0,
            paddingBottom: () => 0,
          },
        },
      ],
    });

    const particularsText = this.formatParticulars((soa as any)?.particulars ?? '');

    return {
      width: '25%',
      stack: [
        { text: 'NATIONAL TELECOMMUNICATIONS COMMISSION', bold: true, fontSize: 6.8, alignment: 'center' },
        { text: 'Statement of Account', fontSize: 6.0, alignment: 'center' },
        { text: copyLabel, fontSize: 5.8, alignment: 'center', margin: [0, 0, 0, 0.4] },

        infoLine('Date', (soa as any)?.date),
        infoLine('SOA No.', (soa as any)?.soaNo),
        infoLine('Name', (soa as any)?.name),
        infoLine('Address', (soa as any)?.address),

        {
          columns: [
            cbItem('New', types.New),
            cbItem('Ren', types.Ren),
            cbItem('ECO', types.ECO),
            cbItem('CV', types.CV),
            cbItem('MOD', types.MOD),
            cbItem('ROC', types.ROC),
          ],
          columnGap: 6,
          margin: [0, 0.25, 0, 0.25],
        },

        {
          columns: [
            { text: 'Particulars:', bold: true, width: 52, fontSize: 6.0 },
            {
              stack: [
                { canvas: [{ type: 'rect', x: 0, y: 0, w: 130, h: 8, lineWidth: 0.8 }] },
                { text: particularsText, fontSize: 6.0, margin: [2, -7.1, 0, 0] },
              ],
              width: '*',
            },
          ],
          columnGap: 4,
          margin: [0, 0, 0, 0.8],
        },

        this.createSoaTable(soa),

        {
          stack: [
            { text: 'NOTE: To be paid on or before the due date otherwise subject to reassessment.', fontSize: 5.6, margin: [0, 0.4, 0, 0.2] },
            {
              columns: [
                { columns: [this.cb(forAssessmentOnly), { text: 'For Assessment Only', fontSize: 5.6 }], columnGap: 2 },
                { columns: [this.cb(endorsedForPayment), { text: 'Endorsed for Payment', fontSize: 5.6 }], columnGap: 2 },
              ],
              columnGap: 12,
            },
            {
              columns: [
                signBlock('Prepared By:', preparedBy),
                signBlock('Approved By:', approvedBy),
              ],
              columnGap: 10,
              margin: [0, 1, 0, 0],
            },
          ],
          margin: [0, 0.4, 0, 0],
        }
      ],
    };
  }
}
