import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { SoaService } from '../soa.service';
import { Subject, combineLatest } from 'rxjs';
import { startWith, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-soa-left-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './soa-left-form.component.html',
  styleUrls: ['./soa-left-form.component.css'],
})
export class SoaLeftFormComponent implements OnInit, OnDestroy {
  @Input() form!: FormGroup;

  payees: string[] = [];
  private destroy$ = new Subject<void>();

  constructor(private soaService: SoaService) {}

  ngOnInit(): void {
    this.loadPayees();
    this.setupPeriodCovered();
    this.setupPayeeSelectionAutoFill();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // =========================
  // DROPDOWN PAYEES
  // =========================
  private loadPayees(): void {
    this.soaService.getPayeeNames().subscribe({
      next: (rows) => {
        const cleaned = (rows ?? [])
          .map(x => (x ?? '').trim())
          .filter(x => x.length > 0);

        this.payees = Array.from(new Set(cleaned)).sort((a, b) => a.localeCompare(b));
      },
      error: (err) => {
        console.error('❌ Failed to load licensees:', err);
        this.payees = [];
      },
    });
  }

  // =========================
  // AUTO-FILL WHEN PAYEE CHANGES
  // =========================
  private setupPayeeSelectionAutoFill(): void {
    const payeeCtrl = this.form.get('payeeName');
    if (!payeeCtrl) return;

    payeeCtrl.valueChanges
      .pipe(startWith(payeeCtrl.value), takeUntil(this.destroy$))
      .subscribe((name: string) => {
        const n = (name ?? '').trim();
        if (!n) return;

        this.soaService.getByLicensee(n).subscribe({
          next: (dto: any) => {
            // patch safe fields only
            this.form.patchValue(
              {
                address: dto?.address ?? '',
                particulars: dto?.particulars ?? '',
                date: dto?.dateIssued ? dto.dateIssued.slice(0, 10) : this.form.get('date')?.value,

                // derive PeriodFrom/To from PeriodCovered "YYYY-YYYY"
                ...(this.periodCoveredToDates(dto?.periodCovered)),
              },
              { emitEvent: false }
            );

            // recompute years + covered after setting dates
            this.form.get('periodFrom')?.updateValueAndValidity({ emitEvent: true });
            this.form.get('periodTo')?.updateValueAndValidity({ emitEvent: true });
          },
          error: (err) => console.warn('⚠️ No details found for licensee:', n, err),
        });
      });
  }

  private periodCoveredToDates(periodCovered: any): { periodFrom?: string; periodTo?: string } {
    const s = (periodCovered ?? '').toString().trim();
    // expect "2024-2025"
    const m = /^(\d{4})-(\d{4})$/.exec(s);
    if (!m) return {};

    const y1 = Number(m[1]);
    const y2 = Number(m[2]);
    if (!y1 || !y2) return {};

    // default Jan 1 and Dec 31
    const from = `${y1}-01-01`;
    const to = `${y2}-12-31`;
    return { periodFrom: from, periodTo: to };
  }

  // =========================
  // PERIOD COVERED COMPUTATION
  // periodYears = display
  // periodCovered = store "YYYY-YYYY"
  // =========================
  private setupPeriodCovered(): void {
    const fromCtrl = this.form.get('periodFrom');
    const toCtrl = this.form.get('periodTo');
    const yearsCtrl = this.form.get('periodYears');

    // NOTE: even if you don't have formControlName="periodCovered" in HTML,
    // we can still keep the control in the FormGroup for saving.
    const coveredCtrl = this.form.get('periodCovered');

    if (!fromCtrl || !toCtrl || !yearsCtrl || !coveredCtrl) return;

    combineLatest([
      fromCtrl.valueChanges.pipe(startWith(fromCtrl.value)),
      toCtrl.valueChanges.pipe(startWith(toCtrl.value)),
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([from, to]) => {
        yearsCtrl.setValue(this.computeYears(from, to), { emitEvent: false });
        coveredCtrl.setValue(this.computeYearRange(from, to), { emitEvent: false });
      });
  }

  private computeYearRange(from: any, to: any): string {
    if (!from || !to) return '';
    const f = new Date(from);
    const t = new Date(to);
    if (isNaN(f.getTime()) || isNaN(t.getTime())) return '';
    if (t < f) return '';
    return `${f.getFullYear()}-${t.getFullYear()}`;
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
