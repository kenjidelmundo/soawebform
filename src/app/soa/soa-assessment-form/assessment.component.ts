import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

@Component({
  selector: 'app-assessment',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div #printArea class="a4-landscape">
      <div class="soa-half">
        <ng-container *ngTemplateOutlet="soaTemplate"></ng-container>
      </div>

      <div class="soa-half">
        <ng-container *ngTemplateOutlet="soaTemplate"></ng-container>
      </div>
    </div>

    <!-- ================= SOA TEMPLATE ================= -->
    <ng-template #soaTemplate>
      <div class="soa-page">

        <div class="header">
          <div class="subtitle">NATIONAL TELECOMMUNICATIONS COMMISSION</div>
          <div class="title">Statement of Account</div>
          <div>Servicing Unit Copy</div>
        </div>

        <div style="margin-top:6px; margin-bottom:6px;">
          <div><b>Date</b> : &nbsp; October 29, 2003</div>
          <div><b>SOA No.</b> : &nbsp; SOA-2026-001</div>
          <div><b>Name</b> : &nbsp; <span class="u">Christian Dacillo</span></div>
          <div><b>Address</b> : &nbsp; Salugan Camalig</div>

          <div style="margin-top:4px; display:flex; gap:14px; flex-wrap:wrap;">
            <span>☐ New</span>
            <span>☐ Ren</span>
            <span>☐ ECO</span>
            <span>☐ CV</span>
            <span>☐ MOD</span>
            <span>☐ ROC</span>
          </div>

          <div style="margin-top:4px; display:flex; align-items:center; gap:6px;">
            <b>Particulars:</b>
            <span class="box" style="display:inline-block; width:210px; height:18px;"></span>
          </div>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th class="code">CODE</th>
                <th>PARTICULARS</th>
                <th class="amt">TOTAL</th>
              </tr>
            </thead>

            <tbody>
              <tr class="section"><td colspan="3">FOR LICENSES</td></tr>
              <tr><td></td><td>Permit to Purchase</td><td class="amt">384.00</td></tr>
              <tr><td></td><td>Filing Fee</td><td class="amt">720.00</td></tr>
              <tr><td></td><td>Permit to Possess / Storage</td><td class="amt">240.00</td></tr>
              <tr><td></td><td>Construction Permit Fee</td><td class="amt">0.00</td></tr>
              <tr><td></td><td>Radio Station License</td><td class="amt">0.00</td></tr>
              <tr><td></td><td>Inspection Fee</td><td class="amt">2,640.00</td></tr>
              <tr><td></td><td>Spectrum User’s Fee (SUF)</td><td class="amt">88.00</td></tr>
              <tr><td></td><td>Surcharges</td><td class="amt">0.00</td></tr>
              <tr><td></td><td>Fines and Penalties</td><td class="amt">0.00</td></tr>

              <tr class="section"><td colspan="3">FOR PERMITS</td></tr>
              <tr><td></td><td>Permit (Dealer / Reseller / Service Center)</td><td class="amt">0.00</td></tr>
              <tr><td></td><td>Inspection Fee</td><td class="amt">0.00</td></tr>
              <tr><td></td><td>Filing Fee</td><td class="amt">0.00</td></tr>
              <tr><td></td><td>Surcharges</td><td class="amt">0.00</td></tr>

              <tr class="section"><td colspan="3">FOR AMATEUR AND ROC</td></tr>
              <tr><td></td><td>Radio Station License</td><td class="amt">0.00</td></tr>
              <tr><td></td><td>Radio Operator’s Certificate</td><td class="amt">0.00</td></tr>
              <tr><td></td><td>Application Fee</td><td class="amt">0.00</td></tr>
              <tr><td></td><td>Filing Fee</td><td class="amt">0.00</td></tr>
              <tr><td></td><td>Seminar Fee</td><td class="amt">0.00</td></tr>
              <tr><td></td><td>Surcharges</td><td class="amt">0.00</td></tr>

              <tr class="section"><td colspan="3">OTHER APPLICATION</td></tr>
              <tr><td></td><td>Registration Fee</td><td class="amt">0.00</td></tr>
              <tr><td></td><td>Supervision / Regulation Fee</td><td class="amt">0.00</td></tr>
              <tr><td></td><td>Verification / Authentication Fee</td><td class="amt">0.00</td></tr>
              <tr><td></td><td>Examination Fee</td><td class="amt">0.00</td></tr>
              <tr><td></td><td>Clearance / Certification Fee (Special)</td><td class="amt">0.00</td></tr>
              <tr><td></td><td>Modification Fee</td><td class="amt">0.00</td></tr>
              <tr><td></td><td>Miscellaneous Income</td><td class="amt">0.00</td></tr>
              <tr><td></td><td>Documentary Stamp Tax (DST)</td><td class="amt">120.00</td></tr>
              <tr><td></td><td>Others</td><td class="amt">0.00</td></tr>

              <tr class="total">
                <td colspan="2">TOTAL AMOUNT</td>
                <td class="amt">4,192.00</td>
              </tr>
            </tbody>
          </table>

          <div class="remarks">
            <div style="margin-bottom:6px;"><b>Date:</b> 1.8.2025</div>

            <div style="font-size:8pt; line-height:1.2; margin-bottom:10px;">
              <b>NOTE:</b><br>
              To be paid on or before <b>07-Feb-25</b><br>
              otherwise subject to reassessment.<br><br>
              Application Forms can be downloaded at<br>
              <span class="link">https://ntc5.ntc.gov.ph/reports/</span>
            </div>

            <div class="remarks-title">Remarks</div>
            <div class="remarks-box" style="height:150px;"></div>
          </div>
        </div>

        <div style="margin-top:6px; font-size:8pt;">
          <b>NOTE:</b> To be paid on or before the due date otherwise subject to reassessment.
        </div>

        <div style="margin-top:6px; font-size:8pt; display:flex; gap:30px;">
          <span>☐ For Assessment Only</span>
          <span>☐ Endorsed for Payment</span>
        </div>

      </div>
    </ng-template>
  `,
  styleUrls: ['./assessment.component.css'],
})
export class AssessmentComponent {
  @ViewChild('printArea', { static: true }) printArea!: ElementRef<HTMLElement>;

  exportPDF(): void {
    const el = this.printArea?.nativeElement;
    if (!el) {
      alert('printArea not found');
      return;
    }

    // ✅ open tab instantly (popup-safe)
    const win = window.open('about:blank', '_blank');
    if (!win) {
      alert('Popup blocked. Allow popups for localhost:4200');
      return;
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(async () => {
        const old = {
          width: el.style.width,
          height: el.style.height,
          overflow: el.style.overflow,
          background: el.style.background,
        };

        try {
          el.style.width = '1123px';
          el.style.height = '794px';
          el.style.overflow = 'hidden';
          el.style.background = '#fff';

          const canvas = await html2canvas(el, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false,
            width: 1123,
            height: 794,
            windowWidth: 1123,
            windowHeight: 794,
            scrollX: 0,
            scrollY: 0,
          } as any);

          const imgData = canvas.toDataURL('image/jpeg', 1.0);

          const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'pt',
            format: 'a4',
          });

          const pageW = pdf.internal.pageSize.getWidth();
          const pageH = pdf.internal.pageSize.getHeight();

          // ✅ MAXIMIZE: fill the page completely (no white border)
          pdf.addImage(imgData, 'JPEG', 0, 0, pageW, pageH);

          const blob = pdf.output('blob');
          const url = URL.createObjectURL(blob);

          // ✅ show pdf
          win.document.open();
          win.document.write(`
            <html>
              <head>
                <title>Assessment Preview</title>
                <style>html, body { margin:0; height:100%; }</style>
              </head>
              <body>
                <iframe src="${url}" style="border:0;width:100%;height:100%"></iframe>
              </body>
            </html>
          `);
          win.document.close();

          setTimeout(() => URL.revokeObjectURL(url), 60_000);
        } catch (e) {
          console.error(e);
          win.document.open();
          win.document.write(`<p style="font-family:Arial;padding:12px;color:red">Export failed. Check console.</p>`);
          win.document.close();
        } finally {
          el.style.width = old.width;
          el.style.height = old.height;
          el.style.overflow = old.overflow;
          el.style.background = old.background;
        }
      });
    });
  }
}
