import { Component } from '@angular/core';
import { AccessSOAPayload, Soa } from '../models/soaform.model';

import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';

(pdfMake as any).vfs = (pdfFonts as any).vfs;

@Component({
  selector: 'app-soa-pdf',
  standalone: true,
  templateUrl: './soa-pdf.component.html',
  styleUrls: ['./soa-pdf.component.css'],
})
export class SoaPdfComponent {

  mockSoa: Soa = {
    soaNo: 'MOCK-001',
    date: 'Mock Date',
    name: 'Mock User',
    address: 'Mock Address',
    type: 'New',
    particulars: 'Mock Particulars',
    periodCovered: '2026',
    sections: [
      {
        title: 'FOR LICENSES', rows: [
          ['Permit to Purchase', 384],
          ['Filing Fee', 720],
          ['Permit to Possess / Storage', 240],
          ['Construction Permit Fee', 0],
          ['Radio Station License', 0],
          ['Inspection Fee', 2640],
          ['Spectrum User’s Fee (SUF)', 88],
          ['Surcharges', 0],
          ['Fines and Penalties', 0]
        ]
      },
      {
        title: 'FOR PERMITS', rows: [
          ['Permit (Dealer / Reseller / Service Center)', 0],
          ['Inspection Fee', 0],
          ['Filing Fee', 0],
          ['Surcharges', 0]
        ]
      },
      {
        title: 'FOR AMATEUR AND ROC', rows: [
          ['Radio Station License', 0],
          ['Radio Operator’s Certificate', 0],
          ['Application Fee', 0],
          ['Filing Fee', 0],
          ['Seminar Fee', 0],
          ['Surcharges', 0]
        ]
      },
      {
        title: 'OTHER APPLICATION', rows: [
          ['Registration Fee', 0],
          ['Supervision Regulation Fee', 0],
          ['Verification / Authentication Fee', 0],
          ['Examination Fee', 0],
          ['Clearance / Certification Fee (Special)', 0],
          ['Modification Fee', 0],
          ['Miscellaneous Income', 0],
          ['Documentary Stamp Tax (DST)', 120],
          ['Others', 0]
        ]
      }
    ]
  };

  generatePDF(soa: Soa): void {
    const docDefinition: any = {
      pageSize: 'A4',
      pageOrientation: 'landscape',
      pageMargins: [2.5, 2.5, 2.5, 2.5], // max page space
      content: [
        {
          columns: [
            this.soaColumn('Servicing Unit Copy', soa),
            this.soaColumn('Accounting Unit Copy', soa),
            this.soaColumn('COA Copy', soa),
            this.soaColumn('Cash Unit Copy', soa)
          ],
          columnGap: 1
        }
      ],
      pageBreakBefore: () => false
    };

    pdfMake.createPdf(docDefinition).open();
  }

  checkBox(checked: boolean = false): any {
    return {
      canvas: [
        { type: 'rect', x: 0, y: 0, w: 5.5, h: 5.5, lineWidth: 0.5 },
        ...(checked ? [
          { type: 'line', x1: 1, y1: 3, x2: 2.5, y2: 5, lineWidth: 1 },
          { type: 'line', x1: 2.5, y1: 5, x2: 4.5, y2: 1, lineWidth: 1 }
        ] : [])
      ]
    };
  }

  createSoaTable(soa: Soa): any {
    const body: any[] = [
      [
        { text: 'CODE', bold: true },
        { text: 'PARTICULARS', bold: true },
        { text: 'TOTAL', bold: true, alignment: 'right' }
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
          '',
          { text: row[0], fontSize: 6 },
          { text: row[1].toLocaleString('en-US', { minimumFractionDigits: 2 }), alignment: 'right', fontSize: 6 }
        ]);
      });
    });

    return {
      table: { widths: [22, '*', 58], body },
      fontSize: 5.9,
      margin: [0, 0.5, 0, 0.5]
    };
  }

  soaColumn(label: string, soa: Soa): any {
    const soaTypes: Record<string, boolean> = {
      New: soa.type === 'New',
      Ren: soa.type === 'Ren',
      ECO: soa.type === 'ECO',
      CV: soa.type === 'CV',
      MOD: soa.type === 'MOD',
      ROC: soa.type === 'ROC'
    };

    return {
      width: '24.8%',
      stack: [
        { text: 'NATIONAL TELECOMMUNICATIONS COMMISSION', bold: true, fontSize: 7.1, alignment: 'center', margin: [0, 0, 0, 0.3] },
        { text: 'Statement of Account', fontSize: 6.5, alignment: 'center', margin: [0, 0, 0, 0.3] },
        { text: label, italics: true, fontSize: 6.2, alignment: 'center', margin: [0, 0, 0, 0.6] },

        { text: `Date:         ${soa.date ?? ''}`, fontSize: 6.2, margin: [0, 0, 0, 0.2] },
        { text: `No.:           ${soa.soaNo ?? ''}`, fontSize: 6.2, margin: [0, 0, 0, 0.2] },
        { text: `Name:      ${soa.name ?? ''}`, fontSize: 6.2, margin: [0, 0, 0, 0.2] },
        { text: `Address:  ${soa.address ?? ''}`, fontSize: 6.2, margin: [0, 0, 0, 0.2] },

        {
          columns: [
            { columns: [this.checkBox(soaTypes['New']), { text: 'New', fontSize: 5.6 }], columnGap: 1.5 },
            { columns: [this.checkBox(soaTypes['Ren']), { text: 'Ren', fontSize: 5.6 }], columnGap: 1.5 },
            { columns: [this.checkBox(soaTypes['ECO']), { text: 'ECO', fontSize: 5.6 }], columnGap: 1.5 },
            { columns: [this.checkBox(soaTypes['CV']), { text: 'CV', fontSize: 5.6 }], columnGap: 1.5 },
            { columns: [this.checkBox(soaTypes['MOD']), { text: 'MOD', fontSize: 5.6 }], columnGap: 1.5 },
            { columns: [this.checkBox(soaTypes['ROC']), { text: 'ROC', fontSize: 5.6 }], columnGap: 1.5 }
          ],
          columnGap: 4,
          margin: [0, 0.6, 0, 0.6]
        },

        { text: `Particulars: ${soa.particulars}`, fontSize: 6.6, margin: [0, 0, 0, 1] },

        {
          columns: [
            { text: 'Particulars:', fontSize: 6.3, width: 28 },
            { canvas: [{ type: 'rect', x: 0, y: 0, w: 130, h: 7, lineWidth: 0.6 }] }
          ],
          columnGap: 3,
          margin: [0, 0, 0, 1]
        },

        this.createSoaTable(soa),

        { text: 'NOTE: To be paid on or before the due date otherwise subject to reassessment.', fontSize: 5.6, margin: [0, 1, 0, 0] },

        {
          columns: [
            { columns: [this.checkBox(), { text: 'For Assessment Only', fontSize: 5.6, margin: [0, -0.2, 0, 0] }], columnGap: 0.6 },
            { columns: [this.checkBox(), { text: 'Endorsed for Payment', fontSize: 5.6, margin: [0, -0.2, 0, 0] }], columnGap: 0.6 }
          ],
          margin: [0, 0.4, 0, 0]
        },

        {
          columns: [
            {
              width: '50%',
              stack: [
                { text: 'PREPARED BY:', bold: true, fontSize: 6.1, margin: [0, 1, 0, 0] },
                { text: 'Engr. Ryan J. dela Cruz', bold: true, fontSize: 6.0, margin: [0, 3, 0, 0] },
                { text: 'Administrative Division', fontSize: 5.7 },
                { text: 'Over Printed Name & Signature', italics: true, fontSize: 5.3 }
              ]
            },
            {
              width: '50%',
              stack: [
                { text: 'APPROVED BY:', bold: true, fontSize: 6.1, margin: [0, 1, 0, 0] },
                { text: 'Engr. Gerald Villoso', bold: true, fontSize: 6.0, margin: [0, 3, 0, 0] },
                { text: 'Administrative Division', fontSize: 5.7 },
                { text: 'Over Printed Name & Signature', italics: true, fontSize: 5.3 }
              ]
            }
          ],
          columnGap: 10,
          margin: [0, 0.6, 0, 0]
        },

        // filler to eliminate bottom space
        { text: '', margin: [0, 2, 0, 0] }
      ]
    };
  }
}
