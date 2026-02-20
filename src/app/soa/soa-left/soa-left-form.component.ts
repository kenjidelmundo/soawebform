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

  // ✅ CHANGED: dropdown now uses objects {id,name}
  payees: PayeeItem[] = [];

  private destroy$ = new Subject<void>();

  // ✅ listeners
  private unlistenAddressClick?: () => void;
  private unlistenPartClick?: () => void;

  // ✅ prevent re-open loop
  private addressDialogOpen = false;
  private particularsDialogOpen = false;

  // ✅ prevent instant re-open right after close (cooldown)
  private addressCoolDownUntil = 0;
  private particularsCoolDownUntil = 0;
  private readonly COOLDOWN_MS = 350;

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
    this.loadPayees();                  // ✅ GET /api/TechSOA -> dropdown list
    this.setupPeriodCovered();
    this.setupPayeeSelectionAutoFill(); // ✅ Selected ID -> GET /api/TechSOA/{id}
  }

  // ✅ CLICK ONLY to open dialogs
  ngAfterViewInit(): void {
    // ADDRESS input
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

    // PARTICULARS input
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
  // ✅ keeps selected record visible even after update
  // =========================
  private loadPayees(): void {
    // ✅ preserve current selected id
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

        // ✅ unique by id (IMPORTANT: do not unique by name, to avoid “disappearing”)
        const uniq = new Map<number, PayeeItem>();
        for (const item of list) {
          if (!uniq.has(item.id)) uniq.set(item.id, item);
        }

        // ✅ sort by name
        this.payees = Array.from(uniq.values()).sort((a, b) => a.name.localeCompare(b.name));

        // ✅ keep selection if still exists
        if (selectedId > 0) {
          const stillExists = this.payees.some(p => p.id === selectedId);
          if (stillExists) {
            this.form.get('payeeName')?.setValue(selectedId, { emitEvent: false });
          }
        }
      },
      error: (err) => {
        console.error('❌ Failed to load payees from GET /api/TechSOA:', err);
        this.payees = [];
      },
    });
  }

  // =========================
  // AUTO-FILL WHEN PAYEE CHANGES
  // ✅ payeeName is ID now
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
            // ✅ store id for display/debug if you still show form.id somewhere
            const realId = Number(dto?.id ?? dto?.ID ?? dto?.Id ?? id);

            this.form.patchValue(
              {
                id: realId, // optional

                // ✅ IMPORTANT: keep string licensee in separate control (used by SAVE payload)
                licensee: String(dto?.licensee ?? dto?.Licensee ?? ''),

                address: String(dto?.address ?? dto?.Address ?? ''),
                particulars: String(dto?.particulars ?? dto?.Particulars ?? ''),

                date: (dto?.dateIssued ?? dto?.DateIssued)
                  ? String(dto?.dateIssued ?? dto?.DateIssued).slice(0, 10)
                  : this.form.get('date')?.value,

                ...(this.periodCoveredToDates(dto?.periodCovered ?? dto?.PeriodCovered)),
              },
              { emitEvent: false }
            );

            this.form.get('periodFrom')?.updateValueAndValidity({ emitEvent: true });
            this.form.get('periodTo')?.updateValueAndValidity({ emitEvent: true });
          },
          error: (err) => console.warn('⚠️ No details found for id:', id, err),
        });
      });
  }

  private periodCoveredToDates(periodCovered: any): { periodFrom?: string; periodTo?: string } {
    const s = (periodCovered ?? '').toString().trim();
    const m = /^(\d{4})-(\d{4})$/.exec(s);
    if (!m) return {};
    const y1 = Number(m[1]);
    const y2 = Number(m[2]);
    if (!y1 || !y2) return {};
    return { periodFrom: `${y1}-01-01`, periodTo: `${y2}-12-31` };
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

      this.patchIfExists('province', res.province);
      this.patchIfExists('townCity', res.townCity);
      this.patchIfExists('brgy', res.brgy);
      this.patchIfExists('addressLine4', res.line4);
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

  private patchIfExists(ctrlName: string, value: any): void {
    const c = this.form.get(ctrlName);
    if (c) c.setValue(value, { emitEvent: false });
  }

  // =========================
  // PERIOD COVERED COMPUTATION
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