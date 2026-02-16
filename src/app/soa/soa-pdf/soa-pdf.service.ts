import { Injectable } from '@angular/core';
import { Soa } from '../models/soaform.model';

import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';

(pdfMake as any).vfs = (pdfFonts as any).vfs;

@Injectable({ providedIn: 'root' })
export class SoaPdfService {
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

    pdfMake.createPdf(docDefinition).open();
  }

  // =========================
  // small checkbox
  // =========================
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

  // =========================
  // table + total amount
  // =========================
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

    if (!sections.length) {
      body.push([
        { text: 'NO SECTIONS PASSED', colSpan: 3, italics: true, alignment: 'center', fontSize: 6.0 },
        {},
        {},
      ]);
    } else {
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
    }

    return {
      table: { widths: [22, '*', 46], body },
      layout: {
        hLineWidth: () => 0.8,
        vLineWidth: () => 0.8,
        hLineColor: () => '#000',
        vLineColor: () => '#000',
        paddingLeft: () => 2,
        paddingRight: () => 2,
        paddingTop: () => 1,
        paddingBottom: () => 1,
      },
      margin: [0, 2, 0, 0],
    };
  }

  // =========================
  // full column
  // =========================
  private soaColumn(copyLabel: string, soa: Soa): any {
    const t = (soa as any)?.type ?? '';

    const types = {
      New: t === 'New',
      Ren: t === 'Ren',
      ECO: t === 'ECO',
      CV: t === 'CV',
      MOD: t === 'MOD',
      ROC: t === 'ROC',
    };

    // form-aligned info row: label | : | value
    const infoLine = (label: string, value: any) => ({
      columns: [
        { text: label, bold: true, width: 36, fontSize: 6.0 },
        { text: ':', bold: true, width: 6, fontSize: 6.0, alignment: 'center' },
        { text: String(value ?? ''), width: '*', fontSize: 6.0 },
      ],
      columnGap: 0,
      margin: [0, 0, 0, 0.2],
    });

    const cbItem = (lbl: string, checked: boolean) => ({
      columns: [this.cb(checked), { text: lbl, fontSize: 5.8, margin: [1, -0.2, 0, 0] }],
      columnGap: 1.2,
      width: 'auto',
    });

    return {
      width: '25%',
      stack: [
        // ✅ HEADER ORDER: NTC -> SOA -> COPY LABEL (tight spacing)
        {
          stack: [
            {
              text: 'NATIONAL TELECOMMUNICATIONS COMMISSION',
              bold: true,
              fontSize: 6.8,
              alignment: 'center',
              margin: [0, 0, 0, 0],
            },
            {
              text: 'Statement of Account',
              fontSize: 6.0,
              alignment: 'center',
              margin: [0, 0, 0, 0],
            },
            {
              text: copyLabel,
              fontSize: 5.8,
              alignment: 'center',
              margin: [0, 0, 0, 0.8], // space before Date block
            },
          ],
          margin: [0, 0, 0, 0],
        },

        // ✅ INFO BLOCK (like screenshot)
        infoLine('Date', (soa as any)?.date),
        infoLine('SOA No.', (soa as any)?.soaNo),
        infoLine('Name', (soa as any)?.name),
        infoLine('Address', (soa as any)?.address),

        // ✅ checkbox row (tight)
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
          margin: [0, 0.4, 0, 0.4],
        },

        // ✅ Particulars line + box (aligned)
        {
          columns: [
            { text: 'Particulars:', bold: true, width: 52, fontSize: 6.0 },
            {
              canvas: [{ type: 'rect', x: 0, y: 0, w: 130, h: 8, lineWidth: 0.8 }],
              width: '*',
            },
          ],
          columnGap: 4,
          margin: [0, 0, 0, 2],
        },

        // ✅ table
        this.createSoaTable(soa),

        // ✅ bottom note
        {
          text: 'NOTE: To be paid on or before the due date otherwise subject to reassessment.',
          fontSize: 5.6,
          margin: [0, 2, 0, 1],
        },

        // ✅ bottom checkboxes
        {
          columns: [
            { columns: [this.cb(false), { text: 'For Assessment Only', fontSize: 5.6 }], columnGap: 2 },
            { columns: [this.cb(false), { text: 'Endorsed for Payment', fontSize: 5.6 }], columnGap: 2 },
          ],
          columnGap: 10,
          margin: [0, 0, 0, 0],
        },
      ],
    };
  }
}
   