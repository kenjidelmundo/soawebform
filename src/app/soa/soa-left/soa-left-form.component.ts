import {
  Component,
  Input,
  OnDestroy,
  OnInit,
  AfterViewInit,
  ElementRef,
  Renderer2,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { SoaService } from '../soa.service';
import { Subject, combineLatest } from 'rxjs';
import { startWith, takeUntil } from 'rxjs/operators';

// ✅ dialogs (NO HTML change)
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AddressDialogComponent, AddressProvince } from './address-dialog.component';
import { ParticularsDialogComponent } from './particulars-dialog.component';

type PayeeItem = { id: number; name: string };

@Component({
  selector: 'app-soa-left-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule],
  templateUrl: './soa-left-form.component.html',
  styleUrls: ['./soa-left-form.component.css'],
})
export class SoaLeftFormComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() form!: FormGroup;

  payees: PayeeItem[] = [];

  private destroy$ = new Subject<void>();

  private unlistenAddressClick?: () => void;
  private unlistenPartClick?: () => void;

  private addressDialogOpen = false;
  private particularsDialogOpen = false;

  private addressCoolDownUntil = 0;
  private particularsCoolDownUntil = 0;
  private readonly COOLDOWN_MS = 350;

  // ✅ recommended: next period starts day AFTER previous To (no overlap)
  private readonly START_NEXT_PERIOD_NEXT_DAY = true;

  // ✅ Sample Province/Town/Brgy (replace with your real list)
  private readonly addressData: AddressProvince[] = [
    {
      province: 'Camarines Sur',
      towns: [
        { townCity: 'Naga City', barangays: ['Abella', 'Bagumbayan Norte', 'Concepcion Pequeña'] },
        { townCity: 'Pili', barangays: ['Cadlan', 'Curry', 'San Jose'] },
      ],
    },
  ];

  constructor(
    private soaService: SoaService,
    private el: ElementRef<HTMLElement>,
    private renderer: Renderer2,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadPayees();
    this.setupPeriodCovered();
    this.setupPayeeSelectionAutoFill();
  }

  ngAfterViewInit(): void {
    const addressInput = this.el.nativeElement.querySelector(
      'input[formControlName="address"]'
    ) as HTMLInputElement | null;

    if (addressInput) {
      this.renderer.setAttribute(addressInput, 'readonly', 'true');
      this.renderer.setStyle(addressInput, 'cursor', 'pointer');

      this.unlistenAddressClick = this.renderer.listen(addressInput, 'click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (Date.now() < this.addressCoolDownUntil) return;
        this.openAddressDialog();
      });
    }

    const partInput = this.el.nativeElement.querySelector(
      'input[formControlName="particulars"]'
    ) as HTMLInputElement | null;

    if (partInput) {
      this.renderer.setAttribute(partInput, 'readonly', 'true');
      this.renderer.setStyle(partInput, 'cursor', 'pointer');

      this.unlistenPartClick = this.renderer.listen(partInput, 'click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (Date.now() < this.particularsCoolDownUntil) return;
        this.openParticularsDialog();
      });
    }
  }

  ngOnDestroy(): void {
    this.unlistenAddressClick?.();
    this.unlistenPartClick?.();
    this.destroy$.next();
    this.destroy$.complete();
  }

  // =========================
  // PAYEES (GET ALL)
  // =========================
  private loadPayees(): void {
    const selectedId = Number(this.form?.get('payeeName')?.value || 0);

    this.soaService.getAll().subscribe({
      next: (rows: any[]) => {
        const list: PayeeItem[] = (rows ?? [])
          .map((r) => {
            const id = Number(r?.id ?? r?.ID ?? r?.Id);
            const name = String(r?.licensee ?? r?.Licensee ?? r?.LICENSEE ?? '').trim();
            return { id, name };
          })
          .filter((x) => x.id > 0 && x.name.length > 0);

        const uniq = new Map<number, PayeeItem>();
        for (const item of list) {
          if (!uniq.has(item.id)) uniq.set(item.id, item);
        }

        this.payees = Array.from(uniq.values()).sort((a, b) => a.name.localeCompare(b.name));

        if (selectedId > 0 && this.payees.some((p) => p.id === selectedId)) {
          this.form.get('payeeName')?.setValue(selectedId, { emitEvent: false });
        }
      },
      error: (err) => {
        console.error('❌ Failed to load payees:', err);
        this.payees = [];
      },
    });
  }

  // =========================
  // AUTO-FILL WHEN PAYEE CHANGES
  // ✅ Particulars is BLANK (do not fetch)
  // ✅ periodFrom becomes latest old periodTo (+1 day if enabled)
  // =========================
  private setupPayeeSelectionAutoFill(): void {
    const payeeCtrl = this.form.get('payeeName');
    if (!payeeCtrl) return;

    payeeCtrl.valueChanges
      .pipe(startWith(payeeCtrl.value), takeUntil(this.destroy$))
      .subscribe((val: any) => {
        const id = Number(val || 0);
        if (!id || id <= 0) return;

        this.soaService.getById(id).subscribe({
          next: (dto: any) => {
            const realId = Number(dto?.id ?? dto?.ID ?? dto?.Id ?? id);

            // ✅ 1) Try direct periodTo from API (if exists)
            const directTo =
              this.toYmd(dto?.periodTo ?? dto?.PeriodTo) ||
              this.toYmd(dto?.to ?? dto?.To);

            // ✅ 2) Parse from periodCovered (supports many formats)
            const parsed = this.periodCoveredToDates(dto?.periodCovered ?? dto?.PeriodCovered);
            const parsedTo = parsed.periodTo ?? '';

            // ✅ choose best oldTo
            const oldTo = directTo || parsedTo || '';

            // ✅ compute new periodFrom
            let newFrom = oldTo;
            if (this.START_NEXT_PERIOD_NEXT_DAY && oldTo) {
              newFrom = this.addDays(oldTo, 1);
            }

            // ✅ patch form
            this.form.patchValue(
              {
                id: realId,
                licensee: String(dto?.licensee ?? dto?.Licensee ?? '').trim(),
                address: String(dto?.address ?? dto?.Address ?? ''),

                // ✅ BLANK particulars
                particulars: '',

                // ✅ reset categories (optional but recommended)
                catROC: false,
                catMA: false,
                catMS: false,
                catOTHERS: false,

                date: (dto?.dateIssued ?? dto?.DateIssued)
                  ? String(dto?.dateIssued ?? dto?.DateIssued).slice(0, 10)
                  : this.form.get('date')?.value,

                // ✅ new period starts at latest oldTo (or +1 day)
                periodFrom: newFrom || this.form.get('periodFrom')?.value,

                // ✅ clear To
                periodTo: '',
              },
              { emitEvent: true }
            );
          },
          error: (err) => console.warn('⚠️ No details found for id:', id, err),
        });
      });
  }

  // =========================
  // PARSE periodCovered (many formats)
  // returns YYYY-MM-DD for date inputs
  // =========================
  private periodCoveredToDates(periodCovered: any): { periodFrom?: string; periodTo?: string } {
    const s = (periodCovered ?? '').toString().trim();
    if (!s) return {};

    // A) d/M/yyyy - d/M/yyyy  (or dd/MM/yyyy - dd/MM/yyyy)
    let m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s*-\s*(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
    if (m) {
      const d1 = Number(m[1]), mo1 = Number(m[2]), y1 = Number(m[3]);
      const d2 = Number(m[4]), mo2 = Number(m[5]), y2 = Number(m[6]);
      return {
        periodFrom: this.toYmdFromParts(y1, mo1, d1),
        periodTo: this.toYmdFromParts(y2, mo2, d2),
      };
    }

    // B) YYYY-MM-DD - YYYY-MM-DD
    m = /^(\d{4})-(\d{2})-(\d{2})\s*-\s*(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (m) {
      return {
        periodFrom: `${m[1]}-${m[2]}-${m[3]}`,
        periodTo: `${m[4]}-${m[5]}-${m[6]}`,
      };
    }

    // C) OLD FORMAT: YYYY-YYYY  (example 2005-2006)
    // convert to From=YYYY-01-01, To=YYYY-12-31
    m = /^(\d{4})-(\d{4})$/.exec(s);
    if (m) {
      const y1 = Number(m[1]);
      const y2 = Number(m[2]);
      if (!y1 || !y2) return {};
      return {
        periodFrom: `${y1}-01-01`,
        periodTo: `${y2}-12-31`,
      };
    }

    return {};
  }

  private toYmd(value: any): string {
    if (!value) return '';
    // already YYYY-MM-DD?
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
      return value.trim();
    }
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  private toYmdFromParts(y: number, m: number, d: number): string {
    if (!y || !m || !d) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${y}-${pad(m)}-${pad(d)}`;
  }

  private addDays(yyyyMmDd: string, days: number): string {
    const d = new Date(yyyyMmDd);
    if (isNaN(d.getTime())) return yyyyMmDd;
    d.setDate(d.getDate() + days);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  // =========================
  // ADDRESS DIALOG
  // =========================
  private openAddressDialog(): void {
    if (this.addressDialogOpen) return;
    this.addressDialogOpen = true;

    const ref = this.dialog.open(AddressDialogComponent, {
      width: '560px',
      disableClose: true,
      autoFocus: false,
      restoreFocus: false,
      data: { provinces: this.addressData },
    });

    ref.afterClosed().subscribe((res) => {
      this.addressCoolDownUntil = Date.now() + this.COOLDOWN_MS;
      this.addressDialogOpen = false;

      const addressInput = this.el.nativeElement.querySelector(
        'input[formControlName="address"]'
      ) as HTMLInputElement | null;
      addressInput?.blur();

      if (!res) return;

      this.form.patchValue({ address: res.fullAddress }, { emitEvent: true });
    });
  }

  // =========================
  // PARTICULARS DIALOG
  // =========================
  private openParticularsDialog(): void {
    if (this.particularsDialogOpen) return;
    this.particularsDialogOpen = true;

    const ref = this.dialog.open(ParticularsDialogComponent, {
      width: '460px',
      disableClose: true,
      autoFocus: false,
      restoreFocus: false,
    });

    ref.afterClosed().subscribe((res) => {
      this.particularsCoolDownUntil = Date.now() + this.COOLDOWN_MS;
      this.particularsDialogOpen = false;

      const partInput = this.el.nativeElement.querySelector(
        'input[formControlName="particulars"]'
      ) as HTMLInputElement | null;
      partInput?.blur();

      if (!res) return;

      this.form.patchValue({ particulars: res.value }, { emitEvent: true });
    });
  }

  // =========================
  // PERIOD COVERED COMPUTATION
  // stores FULL DATE RANGE: d/M/yyyy-d/M/yyyy
  // =========================
  private setupPeriodCovered(): void {
    const fromCtrl = this.form.get('periodFrom');
    const toCtrl = this.form.get('periodTo');
    const yearsCtrl = this.form.get('periodYears');
    const coveredCtrl = this.form.get('periodCovered');

    if (!fromCtrl || !toCtrl || !yearsCtrl || !coveredCtrl) return;

    combineLatest([
      fromCtrl.valueChanges.pipe(startWith(fromCtrl.value)),
      toCtrl.valueChanges.pipe(startWith(toCtrl.value)),
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([from, to]) => {
        yearsCtrl.setValue(this.computeYears(from, to), { emitEvent: false });
        coveredCtrl.setValue(this.computeDateRange(from, to), { emitEvent: false });
      });
  }

  private computeDateRange(from: any, to: any): string {
    if (!from || !to) return '';

    const f = new Date(from);
    const t = new Date(to);

    if (isNaN(f.getTime()) || isNaN(t.getTime())) return '';
    if (t < f) return '';

    const fmt = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
    return `${fmt(f)}-${fmt(t)}`;
  }

  private computeYears(from: any, to: any): number {
    if (!from || !to) return 0;
    const f = new Date(from);
    const t = new Date(to);
    if (isNaN(f.getTime()) || isNaN(t.getTime())) return 0;
    if (t < f) return 0;

    const diffMs = t.getTime() - f.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    const years = diffDays / 365.25;
    return Number(years.toFixed(2));
  }
}