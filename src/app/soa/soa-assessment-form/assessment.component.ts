import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

@Component({
  selector: 'app-assessment',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './assessment.component.html',
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
          win.document.write(
            `<p style="font-family:Arial;padding:12px;color:red">Export failed. Check console.</p>`
          );
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
