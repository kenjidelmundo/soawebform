import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

@Component({
  selector: 'app-assessment',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div #printArea>
    <ng-container *ngTemplateOutlet="soaTemplate"></ng-container>
    </div>
<!-- ================= SOA TEMPLATE ================= -->
<ng-template #soaTemplate>

  <div class="soa-page">

    <!-- HEADER (screenshot style) -->
    <div class="header">
      <div class="subtitle">NATIONAL TELECOMMUNICATIONS COMMISSION</div>
      <div>Statement of Account</div>
      <div>Servicing Unit Copy</div>
    </div>

    <!-- TOP FIELDS + CHECKS (left aligned like screenshot) -->
    <div style="margin-top:6px; margin-bottom:6px;">
      <div><b>Date</b> : &nbsp; October 29, 2003</div>
      <div><b>SOA No.</b> : &nbsp; SOA-2026-001</div>
      <div><b>Name</b> : &nbsp; <span class="u">Christian Dacillo</span></div>
      <div><b>Address</b> : &nbsp; Salugan Camalig</div>

      <!-- checkbox line (same row style) -->
      <div style="margin-top:4px; display:flex; gap:14px; flex-wrap:wrap;">
        <span>☐ New</span>
        <span>☐ Ren</span>
        <span>☐ ECO</span>
        <span>☐ CV</span>
        <span>☐ MOD</span>
        <span>☐ ROC</span>
      </div>

      <!-- Particulars inline like screenshot -->
      <div style="margin-top:4px; display:flex; align-items:center; gap:6px;">
        <b>Particulars:</b>
        <span class="box" style="display:inline-block; width:210px; height:18px;"></span>
      </div>
    </div>

    <!-- TABLE + RIGHT NOTE/REMARKS (aligned with table top like screenshot) -->
    <div class="table-wrap">

      <!-- LEFT TABLE -->
      <table>
        <thead>
          <tr>
            <th class="code">CODE</th>
            <th>PARTICULARS</th>
            <th class="amt">TOTAL</th>
          </tr>
        </thead>

        <tbody>
          <!-- FOR LICENSES -->
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

          <!-- FOR PERMITS -->
          <tr class="section"><td colspan="3">FOR PERMITS</td></tr>
          <tr><td></td><td>Permit (Dealer / Reseller / Service Center)</td><td class="amt">0.00</td></tr>
          <tr><td></td><td>Inspection Fee</td><td class="amt">0.00</td></tr>
          <tr><td></td><td>Filing Fee</td><td class="amt">0.00</td></tr>
          <tr><td></td><td>Surcharges</td><td class="amt">0.00</td></tr>

          <!-- FOR AMATEUR AND ROC -->
          <tr class="section"><td colspan="3">FOR AMATEUR AND ROC</td></tr>
          <tr><td></td><td>Radio Station License</td><td class="amt">0.00</td></tr>
          <tr><td></td><td>Radio Operator’s Certificate</td><td class="amt">0.00</td></tr>
          <tr><td></td><td>Application Fee</td><td class="amt">0.00</td></tr>
          <tr><td></td><td>Filing Fee</td><td class="amt">0.00</td></tr>
          <tr><td></td><td>Seminar Fee</td><td class="amt">0.00</td></tr>
          <tr><td></td><td>Surcharges</td><td class="amt">0.00</td></tr>

          <!-- OTHER APPLICATION -->
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

          <!-- TOTAL -->
          <tr class="total">
            <td colspan="2">TOTAL AMOUNT</td>
            <td class="amt">4,192.00</td>
          </tr>
        </tbody>
      </table>

      <!-- RIGHT SIDE: Date + NOTE + Remarks (aligned with table top) -->
      <div class="remarks">

        <div style="margin-bottom:6px;">
          <b>Date:</b> 1.8.2025
        </div>

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

    <!-- BOTTOM NOTE + CHECKBOXES (screenshot style) -->
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
    const el = this.printArea?.nativeElement as HTMLElement | undefined;
    if (!el) {
      alert('printArea not found');
      return;
    }

    const win = window.open('about:blank', '_blank');
    if (!win) {
    alert('Popup blocked. Allow popups for localhost:4200');
    return;
    }
    win.document.write('<p style="font-family:Arial;padding:12px">Generating PDF…</p>');


    requestAnimationFrame(() => {
      requestAnimationFrame(async () => {
        const oldOverflow = el.style.overflow;
        const oldWidth = el.style.width;
        const oldHeight = el.style.height;
        const oldBg = el.style.backgroundColor;

        try {
          el.style.width = '1123px';
          el.style.height = 'auto';
          el.style.overflow = 'visible';
          el.style.backgroundColor = '#ffffff';

          const capW = 1123;
          const capH = el.scrollHeight;

          const canvas = await html2canvas(el, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false,
            width: capW,
            height: capH,
            windowWidth: capW,
            windowHeight: capH,
            scrollX: 0,
            scrollY: 0,
          } as any);

          const imgData = canvas.toDataURL('image/png');

          const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'pt',
            format: 'a4',
          });

          const pageW = pdf.internal.pageSize.getWidth();
          const pageH = pdf.internal.pageSize.getHeight();

          const scale = Math.min(pageW / canvas.width, pageH / canvas.height);
          const drawW = canvas.width * scale;
          const drawH = canvas.height * scale;

          const x = (pageW - drawW) / 2;
          const y = (pageH - drawH) / 2;

          pdf.addImage(imgData, 'PNG', x, y, drawW, drawH);

          const blob = pdf.output('blob');
          const url = URL.createObjectURL(blob);

          win.location.href = url;
          setTimeout(() => URL.revokeObjectURL(url), 60_000);
        } catch (e) {
          console.error(e);
          win.document.body.innerHTML =
            '<p style="font-family:Arial;padding:12px;color:red">Export failed. Check console.</p>';
        } finally {
          el.style.overflow = oldOverflow;
          el.style.width = oldWidth;
          el.style.height = oldHeight;
          el.style.backgroundColor = oldBg;
        }
      });
    });
  }
}