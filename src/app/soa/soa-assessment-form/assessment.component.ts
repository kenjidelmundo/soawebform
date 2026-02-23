import {
  Component,
  ElementRef,
  ViewChild,
  Input,
  ChangeDetectorRef,
  NgZone,
  OnDestroy,
  OnChanges,
  SimpleChanges,
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
export class AssessmentComponent implements OnChanges, OnDestroy {
  // ✅ keep @Input but also store it safely
  private _form: FormGroup | null = null;

  @Input()
  set form(v: FormGroup) {
    this._form = v;
    console.log('[Assessment] ✅ form received');
    this.logDebug('setter');
  }
  get form(): FormGroup {
    return this._form as FormGroup;
  }

  @ViewChild('printArea', { static: true })
  printArea!: ElementRef<HTMLElement>;

  private lastHash = '';
  private lastPdfUrl: string | null = null;

  constructor(private cdr: ChangeDetectorRef, private zone: NgZone) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['form']) {
      console.log('[Assessment] ngOnChanges form changed');
      this.logDebug('ngOnChanges');
    }
  }

  ngOnDestroy(): void {
    if (this.lastPdfUrl) URL.revokeObjectURL(this.lastPdfUrl);
  }

  // -----------------------------
  // Helpers used by your HTML
  // -----------------------------

  /**
   * ✅ IMPORTANT TS-ONLY MAPPING (NO HTML CHANGE)
   * Your HTML prints v('payeeName'), but your form stores payeeName = selected DB id.
   * So for PDF we return licensee (string) instead.
   *
   * Also HTML uses v('years') but your form control is periodYears.
   */
  v(name: string): any {
    if (!this._form) return '';

    // map payeeName -> licensee text
    if (name === 'payeeName') {
      const lic = this._form.get('licensee')?.value;
      if (lic !== undefined && lic !== null && String(lic).trim() !== '') {
        return String(lic).trim();
      }
      // fallback to raw payeeName (id)
      return this._form.get('payeeName')?.value ?? '';
    }

    // map years -> periodYears
    if (name === 'years') {
      const py = this._form.get('periodYears')?.value;
      return py ?? this._form.get('years')?.value ?? 0;
    }

    return this._form.get(name)?.value ?? '';
  }

  chk(name: string): string {
    return this.v(name) ? '☑' : '☐';
  }

  money(val: any): string {
    const n = Number(val);
    const x = Number.isFinite(n) ? n : 0;
    return x.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
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

  // -----------------------------
  // MAIN: called by parent
  // -----------------------------
  async exportPDF(): Promise<void> {
    const el = this.printArea?.nativeElement;
    if (!el) {
      alert('printArea not found');
      return;
    }

    // ✅ if user clicks too fast, wait a bit for input to arrive
    if (!this._form) {
      console.warn('[Assessment] form not yet set, waiting...');
      await this.nextFrame();
      await this.nextFrame();
      if (!this._form) {
        alert('FormGroup not passed to AssessmentComponent');
        return;
      }
    }

    // ✅ open tab instantly (popup-safe)
    const win = window.open('about:blank', '_blank');
    if (!win) {
      alert('Popup blocked. Allow popups for localhost:4200');
      return;
    }
    this.renderLoadingScreen(win);

    // ✅ commit latest values and force render
    this._form.updateValueAndValidity({ emitEvent: false });
    this.cdr.detectChanges();

    // ✅ wait until zone stable + 2 frames so interpolation updates in DOM
    await this.waitForAngularStable();
    await this.nextFrame();
    await this.nextFrame();

    // ✅ debug
    console.log('[Assessment] raw form:', this._form.getRawValue?.() ?? this._form.value);
    this.logDebug('before-capture');

    // ✅ cache hash
    const raw = this._form.getRawValue?.() ?? this._form.value ?? {};
    const hash = this.safeHash(JSON.stringify(raw));
    if (hash === this.lastHash && this.lastPdfUrl) {
      console.log('[Assessment] ✅ using cached PDF');
      this.renderPdf(win, this.lastPdfUrl);
      return;
    }

    // ✅ save + temporarily adjust styles (TS-only)
    const old = {
      overflow: el.style.overflow,
      background: el.style.background,
    };
    const prevScrollX = window.scrollX;
    const prevScrollY = window.scrollY;

    try {
      el.style.overflow = 'visible';
      el.style.background = '#ffffff';
      window.scrollTo(0, 0);

      const fullW = Math.ceil(el.scrollWidth || el.getBoundingClientRect().width);
      const fullH = Math.ceil(el.scrollHeight || el.getBoundingClientRect().height);

      // ✅ run html2canvas outside angular for speed
      const canvas = await this.zone.runOutsideAngular(() =>
        html2canvas(el, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
          width: fullW,
          height: fullH,
          windowWidth: fullW,
          windowHeight: fullH,
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

      const imgW = pageW;
      const imgH = (canvas.height * imgW) / canvas.width;

      // ✅ multi-page if needed
      if (imgH <= pageH) {
        pdf.addImage(imgData, 'JPEG', 0, 0, imgW, imgH);
      } else {
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

      console.log('[Assessment] ✅ PDF generated:', url);
      this.logDebug('after-generate');

      this.renderPdf(win, url);
    } catch (e) {
      console.error(e);
      win.document.open();
      win.document.write(
        `<p style="font-family:Arial;padding:12px;color:red">Export failed. Check console.</p>`
      );
      win.document.close();
    } finally {
      el.style.overflow = old.overflow;
      el.style.background = old.background;
      window.scrollTo(prevScrollX, prevScrollY);
    }
  }

  // -----------------------------
  // Utilities
  // -----------------------------
  private nextFrame(): Promise<void> {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }

  private waitForAngularStable(): Promise<void> {
    return new Promise((resolve) => {
      const sub = this.zone.onStable.subscribe(() => {
        sub.unsubscribe();
        resolve();
      });
      // if already stable, resolve soon
      queueMicrotask(() => resolve());
    });
  }

  private logDebug(tag: string) {
    console.log(`[Assessment][${tag}]`, {
      date: this.v('date'),
      soaSeries: this.v('soaSeries'),
      payeeName_text: this.v('payeeName'), // ✅ will now show licensee
      payeeName_raw_id: this._form?.get('payeeName')?.value,
      licensee: this._form?.get('licensee')?.value,
      totalAmount: this.v('totalAmount'),
      totalAmount_money: this.money(this.v('totalAmount')),
      periodFrom: this.v('periodFrom'),
      periodTo: this.v('periodTo'),
      years: this.v('years'),
    });
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