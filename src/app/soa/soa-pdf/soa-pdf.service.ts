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
      pageMargins: [4, 4, 4, 4],

      defaultStyle: {
        fontSize: 6,
        lineHeight: 1.05
      },

      content: [
        {
          columns: [
            this.soaColumn('Servicing Unit Copy', soa),
            this.soaColumn('Accounting Unit Copy', soa),
            this.soaColumn('COA Copy', soa),
            this.soaColumn('Cash Unit Copy', soa),
          ],
          columnGap: 6
        }
      ]
    };

    pdfMake.createPdf(docDefinition).open();
  }

  // =========================
  // TABLE (compact like screenshot)
  // =========================
  private createSoaTable(soa: Soa): any {
    const body: any[] = [
      [
        { text: 'CODE', bold: true, fontSize: 6 },
        { text: 'PARTICULARS', bold: true, fontSize: 6 },
        { text: 'TOTAL', bold: true, fontSize: 6, alignment: 'right' }
      ]
    ];

    soa.sections.forEach(section => {
      body.push([
        { text: section.title, colSpan: 3, bold: true, fontSize: 6 },
        {},
        {}
      ]);

      section.rows.forEach(row => {
        body.push([
          { text: '', fontSize: 5.8 },
          { text: row[0], fontSize: 5.8 },
          {
            text: Number(row[1]).toLocaleString('en-US', { minimumFractionDigits: 2 }),
            alignment: 'right',
            fontSize: 5.8
          }
        ]);
      });

      // small spacer like lines between blocks
      body.push([{ text: ' ', colSpan: 3 }, {}, {}]);
    });

    return {
      table: {
        widths: [18, '*', 38],
        body
      },

      layout: {
        hLineWidth: () => 0.35,
        vLineWidth: () => 0.35,
        hLineColor: () => '#777',
        vLineColor: () => '#777',
        paddingLeft: () => 2,
        paddingRight: () => 2,
        paddingTop: () => 1,
        paddingBottom: () => 1
      },

      margin: [0, 2, 0, 0]
    };
  }

  // =========================
  // COLUMN (compact header)
  // =========================
  private soaColumn(label: string, soa: Soa): any {
    return {
      width: '25%',
      stack: [
        { text: label, fontSize: 6, alignment: 'center', margin: [0, 0, 0, 1] },
        { text: 'NATIONAL TELECOMMUNICATIONS COMMISSION', bold: true, fontSize: 6.2, alignment: 'center', margin: [0, 0, 0, 1] },
        { text: 'Statement of Account', fontSize: 6, alignment: 'center', margin: [0, 0, 0, 2] },

        // Optional compact details (uncomment if needed)
        // {
        //   text: `Date: ${soa.date ?? ''}   No.: ${soa.soaNo ?? ''}\nName: ${soa.name ?? ''}\nAddress: ${soa.address ?? ''}`,
        //   fontSize: 5.8,
        //   margin: [0, 0, 0, 2]
        // },

        this.createSoaTable(soa)
      ]
    };
  }
}
