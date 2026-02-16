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
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // =========================
  // PAYEES
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
        console.error('❌ Failed to load payees from DB:', err);
        this.payees = [];
      },
    });
  }

  // =========================
  // PERIOD COVERED
  // periodYears = display only
  // periodCovered = save "YYYY-YYYY"
  // =========================
  private setupPeriodCovered(): void {
    const fromCtrl = this.form.get('periodFrom');
    const toCtrl = this.form.get('periodTo');
    const yearsCtrl = this.form.get('periodYears');
    const coveredCtrl = this.form.get('periodCovered');

    if (!fromCtrl || !toCtrl || !yearsCtrl || !coveredCtrl) {
      console.warn('⚠️ Missing period controls in form: periodFrom/periodTo/periodYears/periodCovered');
      return;
    }

    combineLatest([
      fromCtrl.valueChanges.pipe(startWith(fromCtrl.value)),
      toCtrl.valueChanges.pipe(startWith(toCtrl.value)),
    ])
    .pipe(takeUntil(this.destroy$))
    .subscribe(([from, to]) => {
      yearsCtrl.setValue(this.computeYears(from, to), { emitEvent: false });
      coveredCtrl.setValue(this.computeYearRange(from, to), { emitEvent: false }); // ✅ "2004-2005"
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
