import { Component, EventEmitter, Input, Output, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

// ✅ Make sure you have these installed/importable in your project:
// npm i html2canvas jspdf
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

@Component({
  selector: 'app-soa-right-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './soa-right-panel.component.html',
  styleUrls: ['./soa-right-panel.component.css']
})
export class SoaRightPanelComponent {
  @Input() form!: FormGroup;

  // ✅ This is needed because your exportPDF() uses this.printArea?.nativeElement
  // Pass the ElementRef from your parent component (the div you want to capture).
  @Input() printArea?: HTMLElement;

  @Output() onSave = new EventEmitter<void>();
  @Output() onNewRecord = new EventEmitter<void>();
  @Output() onPrintSOA = new EventEmitter<void>();
  @Output() onAssessment = new EventEmitter<void>();
  @Output() onPrintOP = new EventEmitter<void>();

  printAssessmentOnly(): void {
  // ✅ Optional: if you have a checkbox/control that means "assessment only"
  // change the keys here to match your real form controls
  if (this.form) {
    this.form.patchValue(
      {
        opAssessmentOnly: true,
        opEndorsedForPayment: false,
      },
      { emitEvent: false }
    );
  }

  // ✅ Then export
  this.exportPDF();
}


  exportPDF(): void {
  const el = this.printArea as HTMLElement | undefined;

  if (!el) {
    alert('printArea is undefined. Make sure parent passes [printArea]="printArea".');
    return;
  }

  // ✅ If your element is not rendered / collapsed, scrollHeight can be 0
  const h = el.scrollHeight;
  if (!h || h < 10) {
    alert('printArea height is 0. The area may be hidden/not rendered.');
    return;
  }

  // ✅ open tab immediately (popup-safe)
  const win = window.open('about:blank', '_blank');
  if (!win) {
    alert('Popup blocked. Allow popups for http://localhost:4200 then try again.');
    return;
  }

  win.document.open();
  win.document.write(`
    <html>
      <head>
        <title>SOA Preview</title>
        <style>
          html, body { margin:0; padding:0; height:100%; background:#eee; }
          .loading { font-family: Arial; padding: 12px; }
        </style>
      </head>
      <body>
        <div class="loading">Generating PDF…</div>
      </body>
    </html>
  `);
  win.document.close();

  requestAnimationFrame(() => {
    requestAnimationFrame(async () => {
      const oldOverflow = el.style.overflow;
      const oldWidth = el.style.width;
      const oldHeight = el.style.height;
      const oldBg = el.style.backgroundColor;

      try {
        // ✅ force correct WIDTH (2 forms side-by-side)
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

        // ✅ Most reliable: show PDF via iframe
        win.document.open();
        win.document.write(`
          <html>
            <head>
              <title>SOA Preview</title>
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
        win.document.body.innerHTML =
          `<p style="font-family:Arial;padding:12px;color:red">Export failed. Open DevTools Console.</p>`;
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
