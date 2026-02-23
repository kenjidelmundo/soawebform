import {
  Component,
  ElementRef,
  ViewChild,
  Input,
  ChangeDetectorRef,
  NgZone,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

@Component({
  selector: 'app-assessment',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './assessment.component.html',
  styleUrls: ['./assessment.component.css'],
})
export class AssessmentComponent implements OnDestroy {
  @Input() form!: FormGroup;

  @ViewChild('printArea', { static: true })
  printArea!: ElementRef<HTMLElement>;

  private lastHash = '';
  private lastPdfUrl: string | null = null;

  constructor(private cdr: ChangeDetectorRef, private zone: NgZone) {}

  ngOnDestroy(): void {
    if (this.lastPdfUrl) URL.revokeObjectURL(this.lastPdfUrl);
  }

  // ==========================================
  // ✅ ALIAS MAP (NO HTML CHANGE)
  // ==========================================
  private resolveControlName(name: string): string {
    const map: Record<string, string> = {
      // HTML uses: co/cv but your form uses txnCO/txnCV
      co: 'txnCO',
      cv: 'txnCV',

      // HTML uses these exact names but form uses op*
      forAssessmentOnly: 'opAssessmentOnly',
      endorsedForPayment: 'opEndorsedForPayment',

      // HTML uses years but your form uses periodYears
      years: 'periodYears',

      // HTML uses dueDate but your form uses opNotePayOnOrBefore
      dueDate: 'opNotePayOnOrBefore',
    };
    return map[name] ?? name;
  }

  // ==========================================
  // ✅ HTML helpers
  // ==========================================
  v(name: string): any {
    if (!this.form) return '';

    // ✅ BIG FIX: template prints v('payeeName') but your control is an ID.
    // Return LICENSEE string instead.
    if (name === 'payeeName') {
      const lic = this.form.get('licensee')?.value;
      return (lic ?? '').toString();
    }

    const real = this.resolveControlName(name);
    return this.form.get(real)?.value ?? '';
  }

  chk(name: string): string {
    const real = this.resolveControlName(name);
    const val = this.form?.get(real)?.value;
    return !!val ? '☑' : '☐';
  }

  money(val: any): string {
    const n = Number(val);
    const x = Number.isFinite(n) ? n : 0;
    return x.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  d(val: any): string {
    if (!val) return '';
    const dt = val instanceof Date ? val : new Date(val);
    if (isNaN(dt.getTime())) return String(val);
    const dd = String(dt.getDate()).padStart(2, '0');
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const yyyy = dt.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  // ==========================================
  // ✅ PDF EXPORT (html2canvas)
  // ==========================================
  async exportPDF(): Promise<void> {
    const el = this.printArea?.nativeElement;

    if (!el) {
      alert('printArea not found');
      return;
    }
    if (!this.form) {
      alert('FormGroup not passed to AssessmentComponent');
      return;
    }

    // ✅ DEBUG values that must appear
    console.log('[Assessment] RAW:', this.form.getRawValue?.() ?? this.form.value);
    console.log('[Assessment] DEBUG:', {
      date: this.v('date'),
      soaSeries: this.v('soaSeries'),
      payeeName_display: this.v('payeeName'), // ✅ licensee string now
      licensee: this.v('licensee'),
      totalAmount: this.v('totalAmount'),
      co: this.chk('co'),
      cv: this.chk('cv'),
      years: this.v('years'),
      periodYears: this.v('periodYears'),
    });

    // popup-safe
    const win = window.open('about:blank', '_blank');
    if (!win) {
      alert('Popup blocked. Allow popups for localhost:4200');
      return;
    }
    this.renderLoadingScreen(win);

    // cache hash
    const raw = this.form.getRawValue?.() ?? this.form.value ?? {};
    const hash = this.safeHash(JSON.stringify(raw));
    if (hash === this.lastHash && this.lastPdfUrl) {
      this.renderPdf(win, this.lastPdfUrl);
      return;
    }

    // ✅ force render before capture
    this.form.updateValueAndValidity({ emitEvent: false });
    this.cdr.detectChanges();
    await this.nextFrame();
    await this.nextFrame();

    const old = {
      overflow: el.style.overflow,
      background: el.style.background,
    };

    try {
      el.style.overflow = 'visible';
      el.style.background = '#fff';

      const canvas = await this.zone.runOutsideAngular(() =>
        html2canvas(el, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
          scrollX: 0,
          scrollY: 0,
        } as any)
      );

      const imgData = canvas.toDataURL('image/jpeg', 1.0);

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'pt',
        format: 'a4',
      });

      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      // fit image to page
      const imgW = pageW;
      const imgH = (canvas.height * imgW) / canvas.width;

      if (imgH <= pageH) {
        pdf.addImage(imgData, 'JPEG', 0, 0, imgW, imgH);
      } else {
        // multi-page
        let y = 0;
        let remaining = imgH;
        while (remaining > 0) {
          pdf.addImage(imgData, 'JPEG', 0, y, imgW, imgH);
          remaining -= pageH;
          y -= pageH;
          if (remaining > 0) pdf.addPage();
        }
      }

      const blob = pdf.output('blob');
      const url = URL.createObjectURL(blob);

      this.lastHash = hash;
      if (this.lastPdfUrl) URL.revokeObjectURL(this.lastPdfUrl);
      this.lastPdfUrl = url;

      this.renderPdf(win, url);
    } catch (e) {
      console.error(e);
      win.document.open();
      win.document.write(`<p style="font-family:Arial;padding:12px;color:red">Export failed. Check console.</p>`);
      win.document.close();
    } finally {
      el.style.overflow = old.overflow;
      el.style.background = old.background;
    }
  }

  private nextFrame(): Promise<void> {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }

  private renderLoadingScreen(win: Window) {
    win.document.open();
    win.document.write(`
      <html>
        <head>
          <title>Assessment Preview</title>
          <style>
            html, body { margin:0; height:100%; font-family: Arial, sans-serif; }
            .wrap { height:100%; display:flex; align-items:center; justify-content:center; background:#f3f6fb; }
            .card { background:#fff; border:1px solid #d9e2ef; border-radius:12px; padding:18px 22px; box-shadow:0 8px 24px rgba(0,0,0,.08); }
            .spinner { width:28px; height:28px; border:3px solid #d9e2ef; border-top:3px solid #2563eb; border-radius:50%; animation:spin .9s linear infinite; margin:0 auto 10px; }
            @keyframes spin { 0% {transform:rotate(0)} 100% {transform:rotate(360deg)} }
            .txt { text-align:center; color:#111827; font-size:14px; }
          </style>
        </head>
        <body>
          <div class="wrap">
            <div class="card">
              <div class="spinner"></div>
              <div class="txt">Generating PDF…</div>
            </div>
          </div>
        </body>
      </html>
    `);
    win.document.close();
  }

  private renderPdf(win: Window, url: string) {
    win.document.open();
    win.document.write(`
      <html>
        <head><title>Assessment Preview</title><style>html, body { margin:0; height:100%; }</style></head>
        <body><iframe src="${url}" style="border:0;width:100%;height:100%"></iframe></body>
      </html>
    `);
    win.document.close();
  }

  private safeHash(s: string): string {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(16);
  }
}