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
      co: 'txnCO',
      cv: 'txnCV',
      forAssessmentOnly: 'opAssessmentOnly',
      endorsedForPayment: 'opEndorsedForPayment',
      years: 'periodYears',
      dueDate: 'opNotePayOnOrBefore',
    };
    return map[name] ?? name;
  }

  // ==========================================
  // ✅ TEMPLATE HELPERS (USED BY YOUR HTML)
  // ==========================================
  v(name: string): any {
    if (!this.form) return '';
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
    return x.toLocaleString('en-US', {
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

  formatParticulars(val: any): string {
    return String(val ?? '')
      .split('||')
      .map((part) => part.trim())
      .filter(Boolean)
      .join('\n');
  }

  // ==========================================
  // ✅ EXPORT-ONLY FOOTER (exact flow)
  // checkbox row
  // prepared by
  // approved by
  // ==========================================
  private buildFooterElement(): HTMLElement {
    const footer = document.createElement('div');
    footer.setAttribute('data-pdf-footer', '1');

    const prepared = this.v('preparedBy') || '';
    const approved = this.v('approvedBy') || '';

    footer.innerHTML = `
      <div style="margin-top:8px; font-size:9pt; display:flex; align-items:flex-start; gap:16px;">
        <div style="flex:1 1 auto;">
          <div><b>NOTE:</b> To be paid on or before the due date otherwise subject to reassessment.</div>
          <div style="margin-top:4px; display:flex; gap:18px; align-items:center;">
            <span>${this.cbSvg(this.chk('forAssessmentOnly') === '☑')}</span>
            <span style="margin-right:12px;">For Assessment Only</span>
            <span>${this.cbSvg(this.chk('endorsedForPayment') === '☑')}</span>
            <span>Endorsed for Payment</span>
          </div>
          <div style="margin-top:10px; display:flex; gap:30px; align-items:flex-end; font-size:9pt;">
            <div style="flex:1 1 0; max-width:220px;">
              <div style="font-weight:bold; margin-bottom:2px;">Prepared By:</div>
              <div style="display:inline-block; border-bottom:1px solid #000; padding:0 0 2px 0;">${prepared}</div>
            </div>
            <div style="flex:1 1 0; max-width:220px;">
              <div style="font-weight:bold; margin-bottom:2px;">Approved By:</div>
              <div style="display:inline-block; border-bottom:1px solid #000; padding:0 0 2px 0;">${approved}</div>
            </div>
          </div>
        </div>
      </div>
    `;
    return footer;
  }

  // simple SVG checkbox so html2canvas captures consistently
  private cbSvg(checked: boolean): string {
    return `
      <svg width="10" height="10" style="margin-top:1px;">
        <rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="black" stroke-width="1"/>
        ${checked ? '<polyline points="2,5 4,7.5 8,2" fill="none" stroke="black" stroke-width="1.2"/>' : ''}
      </svg>
    `;
  }

  // ✅ remove existing duplicate checkbox row & prepared/approved in HTML (export only)
  // we mark removed nodes so we can restore them after capture
  private hideExistingFooterBits(page: HTMLElement): void {
    // hide the checkbox row that contains both texts
    const candidates = Array.from(page.querySelectorAll<HTMLElement>('div, span, p'));
    for (const el of candidates) {
      const t = (el.textContent ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
      const hasFAO = t.includes('for assessment only');
      const hasEFP = t.includes('endorsed for payment');
      const hasNote = t.startsWith('note: to be paid on or before the due date');

      // hide container that likely represents that checkbox row
      if ((hasFAO && hasEFP) || hasNote) {
        if (!el.hasAttribute('data-hide-pdf')) {
          el.setAttribute('data-hide-pdf', '1');
          (el as any).__oldDisplay = el.style.display;
          el.style.display = 'none';
        }
      }
    }

  }

  private restoreHiddenFooterBits(page: HTMLElement): void {
    page.querySelectorAll<HTMLElement>('[data-hide-pdf="1"]').forEach((el: any) => {
      el.style.display = el.__oldDisplay ?? '';
      el.removeAttribute('data-hide-pdf');
      delete el.__oldDisplay;
    });
  }

  private injectFooterIntoPages(root: HTMLElement): void {
    const pages = Array.from(root.querySelectorAll<HTMLElement>('.soa-page'));
    pages.forEach((p) => {
      // remove previously injected footer
      p.querySelectorAll('[data-pdf-footer="1"]').forEach((n) => n.remove());

      // hide existing note/checkbox rows to avoid duplicates
      this.hideExistingFooterBits(p);

      // inject single footer
      p.appendChild(this.buildFooterElement());
    });
  }

  private cleanupAfterExport(root: HTMLElement): void {
    const pages = Array.from(root.querySelectorAll<HTMLElement>('.soa-page'));
    pages.forEach((p) => {
      p.querySelectorAll('[data-pdf-footer="1"]').forEach((n) => n.remove());
      this.restoreHiddenFooterBits(p);
    });
  }

  // ==========================================
  // ✅ PDF EXPORT (html2canvas keeps your CSS/HTML)
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

    const win = window.open('about:blank', '_blank');
    if (!win) {
      alert('Popup blocked. Allow popups for localhost:4200');
      return;
    }

    const raw = this.form.getRawValue?.() ?? this.form.value ?? {};
    const hash = this.safeHash(JSON.stringify(raw));
    if (hash === this.lastHash && this.lastPdfUrl) {
      win.location.href = this.lastPdfUrl;
      return;
    }

    this.form.updateValueAndValidity({ emitEvent: false });
    this.cdr.detectChanges();
    await this.nextFrame();
    await this.nextFrame();

    const old = {
      overflow: el.style.overflow,
      background: el.style.background,
    };

    try {
      // ✅ export-only: hide duplicates + inject clean footer
      this.injectFooterIntoPages(el);
      this.cdr.detectChanges();
      await this.nextFrame();
      await this.nextFrame();

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

      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'pt',
        format: 'a4',
      });

      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      const imgW = pageW;
      const imgH = (canvas.height * imgW) / canvas.width;

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

      win.location.href = url;
    } catch (e) {
      console.error(e);
      win.document.open();
      win.document.write(
        `<p style="font-family:Arial;padding:12px;color:red">Export failed. Check console.</p>`
      );
      win.document.close();
    } finally {
      // ✅ restore DOM
      try {
        this.cleanupAfterExport(el);
      } catch {}

      el.style.overflow = old.overflow;
      el.style.background = old.background;
    }
  }

  private nextFrame(): Promise<void> {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
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
