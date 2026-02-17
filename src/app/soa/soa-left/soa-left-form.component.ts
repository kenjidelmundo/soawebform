import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { SoaService, TechSOAUpsertDto } from '../soa.service';
import { Subject, combineLatest, of } from 'rxjs';
import { startWith, takeUntil, debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';

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
    this.setupYearsAndPeriodCovered();
    this.setupAutoFillByLicensee();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // =========================
  // DROPDOWN: load Licensee names
  // =========================
  private loadPayees(): void {
    this.soaService.getPayeeNames()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (rows: string[]) => {
          const cleaned = (rows ?? [])
            .map(x => (x ?? '').toString().trim())
            .filter(x => x.length > 0);

          this.payees = Array.from(new Set(cleaned)).sort((a, b) => a.localeCompare(b));
        },
        error: (err: any) => {
          console.error('❌ Failed to load licensees:', err);
          this.payees = [];
        },
      });
  }

  // =========================
  // COMPUTE: periodYears + periodCovered(year number)
  // =========================
  private setupYearsAndPeriodCovered(): void {
    const fromCtrl = this.form.get('periodFrom');
    const toCtrl = this.form.get('periodTo');
    const yearsCtrl = this.form.get('periodYears');
    const coveredCtrl = this.form.get('periodCovered'); // number

    if (!fromCtrl || !toCtrl || !yearsCtrl || !coveredCtrl) return;

    combineLatest([
      fromCtrl.valueChanges.pipe(startWith(fromCtrl.value)),
      toCtrl.valueChanges.pipe(startWith(toCtrl.value)),
    ])
    .pipe(takeUntil(this.destroy$))
    .subscribe(([from, to]) => {
      yearsCtrl.setValue(this.computeYears(from, to), { emitEvent: false });

      // ✅ store start year as number (or null)
      coveredCtrl.setValue(this.extractYear(from), { emitEvent: false });
    });
  }

  private extractYear(v: any): number | null {
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d.getFullYear();
  }

  private computeYears(from: any, to: any): number {
    if (!from || !to) return 0;
    const f = new Date(from);
    const t = new Date(to);
    if (isNaN(f.getTime()) || isNaN(t.getTime())) return 0;
    if (t < f) return 0;

    const diffMs = t.getTime() - f.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return Number((diffDays / 365.25).toFixed(2));
  }

  // =========================
  // AUTOFILL: select licensee -> fill date/address/particulars/period
  // =========================
  private setupAutoFillByLicensee(): void {
    const licenseeCtrl = this.form.get('payeeName');
    if (!licenseeCtrl) return;

    licenseeCtrl.valueChanges
      .pipe(
        startWith(licenseeCtrl.value),
        debounceTime(200),
        distinctUntilChanged(),
        switchMap((name) => {
          const n = (name ?? '').toString().trim();
          if (!n) return of(null);

          return this.soaService.getByLicensee(n).pipe(
            catchError((err: any) => {
              console.error('❌ Failed to fetch licensee details:', err);
              return of(null);
            })
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((dto: TechSOAUpsertDto | null) => {
        if (!dto) return;

        const dateOnly = dto.dateIssued ? dto.dateIssued.slice(0, 10) : '';

        // API can send periodFrom/periodTo, but if not, derive from year number
        const from = dto.periodFrom ? dto.periodFrom.slice(0, 10) : this.yearToFrom(dto.periodCovered ?? null);
        const to   = dto.periodTo   ? dto.periodTo.slice(0, 10)   : this.yearToTo(dto.periodCovered ?? null);

        this.form.patchValue(
          {
            date: dateOnly,
            address: dto.address ?? '',
            particulars: dto.particulars ?? '',

            periodFrom: from,
            periodTo: to,

            // keep year as number
            periodCovered: dto.periodCovered ?? null,
          },
          { emitEvent: true } // ✅ triggers years computation
        );
      });
  }

  private yearToFrom(year: number | null): string {
    return year ? `${year}-01-01` : '';
  }

  private yearToTo(year: number | null): string {
    return year ? `${year}-12-31` : '';
  }
}
