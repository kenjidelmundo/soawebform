import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { SoaPdfService } from '../soa-pdf/soa-pdf.service';
import { Subject, merge, interval } from 'rxjs';
import { startWith, takeUntil, filter, map, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-soa-right-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './soa-right-panel.component.html',
  styleUrls: ['./soa-right-panel.component.css'],
})
export class SoaRightPanelComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() form!: FormGroup;

  @Output() onSave = new EventEmitter<void>();
  @Output() onNewRecord = new EventEmitter<void>();
  @Output() onPrintSOA = new EventEmitter<void>();
  @Output() onAssessment = new EventEmitter<void>();
  @Output() onPrintOP = new EventEmitter<void>();

  private destroy$ = new Subject<void>();
  private txnGuard = false;

  constructor(
    private soaPdf: SoaPdfService,
    private elRef: ElementRef<HTMLElement>
  ) {}

  ngOnInit(): void {
    this.setupTxnCheckboxRules();
    this.setupTxnAutoSyncPolling();
  }

  ngAfterViewInit(): void {
    this.forcePayOnOrBeforeAsDateInput();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  save(): void { this.onSave.emit(); }
  newRecord(): void { this.onNewRecord.emit(); }
  printSoa(): void { this.onPrintSOA.emit(); }
  assessment(): void { this.onAssessment.emit(); }
  printOp(): void { this.onPrintOP.emit(); }

  // ======================================================
  // ✅ Make "To be paid on or before" use calendar
  // HTML remains unchanged
  // ======================================================
  private forcePayOnOrBeforeAsDateInput(): void {
    const host = this.elRef?.nativeElement;
    if (!host) return;

    const input = host.querySelector('.noteIn') as HTMLInputElement | null;
    if (!input) return;

    input.type = 'date';
    input.setAttribute('type', 'date');
  }

  // ======================================================
  // Keep NEW and RENEW mutually exclusive. MOD is independent.
  // ======================================================
  private setupTxnCheckboxRules(): void {
    if (!this.form) return;

    const cNew = this.form.get('txnNew');
    const cRen = this.form.get('txnRenew');
    const cMod = this.form.get('txnModification');

    if (!cNew && !cRen && !cMod) return;

    const stream$ = merge(
      ...(cNew ? [cNew.valueChanges.pipe(startWith(cNew.value), map((v) => ({ key: 'NEW' as const, v })))] : []),
      ...(cRen ? [cRen.valueChanges.pipe(startWith(cRen.value), map((v) => ({ key: 'RENEW' as const, v })))] : []),
      ...(cMod ? [cMod.valueChanges.pipe(startWith(cMod.value), map((v) => ({ key: 'MOD' as const, v })))] : [])
    );

    stream$
      .pipe(takeUntil(this.destroy$), filter(() => !this.txnGuard))
      .subscribe(({ key, v }) => {
        if (!v) return;
        const current = {
          txnNew: !!cNew?.value,
          txnRenew: !!cRen?.value,
          txnModification: !!cMod?.value,
        };

        if (key === 'NEW') {
          this.applyTxnState({
            txnNew: true,
            txnRenew: false,
            txnModification: current.txnModification,
          });
          return;
        }

        if (key === 'RENEW') {
          this.applyTxnState({
            txnNew: false,
            txnRenew: true,
            txnModification: current.txnModification,
          });
          return;
        }

        this.applyTxnState({
          txnNew: current.txnNew,
          txnRenew: current.txnRenew,
          txnModification: true,
        });
      });
  }

  // ======================================================
  // ✅ HARD FIX: Poll the form and sync txn checkboxes
  // ======================================================
  private setupTxnAutoSyncPolling(): void {
    if (!this.form) return;

    interval(200)
      .pipe(
        takeUntil(this.destroy$),
        filter(() => !this.txnGuard),
        map(() => {
          const raw: any = this.form.getRawValue?.() ?? this.form.value ?? {};

          const particularsText =
            this.findStringInFormTree(this.form, ['particular']) ||
            String(raw.particulars ?? '');

          const txnTypeAny =
            raw.txnType ??
            raw.transactionType ??
            raw.particularsTxnType ??
            raw.partTxnType ??
            this.findStringInFormTree(this.form, ['txn', 'type']) ??
            this.findStringInFormTree(this.form, ['transaction', 'type']);

          const fromTxnType = this.normalizeTxnState(txnTypeAny);
          const fromParticulars = this.normalizeTxnState(particularsText);

          // Prefer explicit txn fields only when they clearly point to NEW/RENEW/MOD.
          // For DUPLICATE-only, keep particulars as source so mixed cases like
          // "MODIFICATION - DUPLICATE" still preserve MOD.
          if (fromTxnType?.txnNew || fromTxnType?.txnRenew || fromTxnType?.txnModification) {
            return fromTxnType;
          }

          return fromParticulars || fromTxnType;
        }),
        distinctUntilChanged((a, b) =>
          !!a &&
          !!b &&
          a.txnNew === b.txnNew &&
          a.txnRenew === b.txnRenew &&
          a.txnModification === b.txnModification
        )
      )
      .subscribe((state) => {
        if (!state) return;
        this.applyTxnState(state);
      });
  }

  private applyTxnState(state: {
    txnNew: boolean;
    txnRenew: boolean;
    txnModification: boolean;
  }): void {
    const cNew = this.form.get('txnNew');
    const cRen = this.form.get('txnRenew');
    const cMod = this.form.get('txnModification');

    if (!cNew && !cRen && !cMod) return;

    this.txnGuard = true;

    const patch: any = {
      txnNew: state.txnNew,
      txnRenew: state.txnRenew,
      txnModification: state.txnModification,
    };

    if (!cNew) delete patch.txnNew;
    if (!cRen) delete patch.txnRenew;
    if (!cMod) delete patch.txnModification;

    if (this.form.get('txnType')) {
      patch.txnType = state.txnRenew ? 'RENEW' : state.txnNew ? 'NEW' : state.txnModification ? 'MOD' : '';
    }
    if (this.form.get('transactionType')) {
      patch.transactionType = state.txnRenew ? 'RENEW' : state.txnNew ? 'NEW' : state.txnModification ? 'MOD' : '';
    }

    this.form.patchValue(patch, { emitEvent: false });

    this.txnGuard = false;
  }

  private normalizeTxnState(v: any): {
    txnNew: boolean;
    txnRenew: boolean;
    txnModification: boolean;
  } | null {
    if (v === null || v === undefined) return null;

    const s = String(v).trim().toUpperCase();
    if (!s) return null;

    const hasRenew =
      s === 'RENEW' ||
      s === 'RENEWAL' ||
      /\bRENEW(AL)?\b/.test(s) ||
      s.includes('REVALID') ||
      s.includes('EXTEND') ||
      s.includes('REISSUE') ||
      s.includes('RE-ISSUE');

    const hasMod =
      s === 'MOD' ||
      s === 'MODIFICATION' ||
      /\bMOD(IFICATION)?\b/.test(s) ||
      s.includes('MODIFIED') ||
      s.includes('MODIF') ||
      s.includes('AMEND') ||
      s.includes('CHANGE') ||
      s.includes('CORRECTION');

    const hasNew = s === 'NEW' || /\bNEW\b/.test(s) || s.includes('NEW APPLICATION');
    const hasDuplicate = s === 'DUPLICATE' || /\bDUPLICATE\b/.test(s);

    if (hasDuplicate && !hasNew && !hasRenew && !hasMod) {
      return {
        txnNew: false,
        txnRenew: false,
        txnModification: false,
      };
    }

    if (!hasNew && !hasRenew && !hasMod) return null;

    return {
      txnNew: hasNew && !hasRenew,
      txnRenew: hasRenew,
      txnModification: hasMod,
    };
  }

  // -----------------------
  // helpers
  // -----------------------
  private num(v: any): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  private pick(v: any, keys: string[], fallback: any = ''): any {
    for (const k of keys) {
      const val = v?.[k];
      if (val !== undefined && val !== null && String(val).trim() !== '') return val;
    }
    return fallback;
  }

  private pickNum(v: any, keys: string[], fallback = 0): number {
    for (const k of keys) {
      const val = v?.[k];
      if (val !== undefined && val !== null && String(val).trim() !== '') return this.num(val);
    }
    return fallback;
  }

  private findBoolInFormTree(root: AbstractControl | null | undefined, keywords: string[]): boolean {
    if (!root) return false;
    const keys = keywords.map((k) => k.toLowerCase());

    const walk = (ctrl: AbstractControl): boolean | null => {
      const anyCtrl: any = ctrl as any;

      if (anyCtrl?.controls && typeof anyCtrl.controls === 'object') {
        for (const name of Object.keys(anyCtrl.controls)) {
          const child = anyCtrl.controls[name] as AbstractControl;
          const nameLower = String(name).toLowerCase();

          const match = keys.every((k) => nameLower.includes(k));
          if (match) {
            const v = (child as any)?.value;
            if (typeof v === 'boolean') return v;
          }

          const found = walk(child);
          if (found !== null) return found;
        }
      }
      return null;
    };

    const r = walk(root);
    return r === null ? false : !!r;
  }

  private findStringInFormTree(root: AbstractControl | null | undefined, keywords: string[]): string {
    if (!root) return '';
    const keys = keywords.map((k) => k.toLowerCase());

    const walk = (ctrl: AbstractControl): string | null => {
      const anyCtrl: any = ctrl as any;

      if (anyCtrl?.controls && typeof anyCtrl.controls === 'object') {
        for (const name of Object.keys(anyCtrl.controls)) {
          const child = anyCtrl.controls[name] as AbstractControl;
          const nameLower = String(name).toLowerCase();

          const match = keys.every((k) => nameLower.includes(k));
          if (match) {
            const v = (child as any)?.value;
            if (v !== undefined && v !== null && String(v).trim() !== '') return String(v);
          }

          const found = walk(child);
          if (found !== null) return found;
        }
      }
      return null;
    };

    const r = walk(root);
    return r === null ? '' : r;
  }

  // ======================================================
  // ✅ pdfMake SOA preview
  // ======================================================
  printSOAPreview(): void {
    if (!this.form) {
      alert('Form not found.');
      return;
    }

    const v: any = this.form.getRawValue?.() ?? this.form.value ?? {};

    const forAssessmentOnly = this.findBoolInFormTree(this.form, ['assessment']);
    const endorsedForPayment = this.findBoolInFormTree(this.form, ['endorsed']);

    const preparedBy =
      this.findStringInFormTree(this.form, ['prepared']) || this.pick(v, ['preparedBy'], '');
    const approvedBy =
      this.findStringInFormTree(this.form, ['approved']) || this.pick(v, ['approvedBy'], '');

    const soaData: any = {
      soaNo: this.pick(v, ['soaSeries', 'seriesNumber', 'opSeries'], ''),
      date: this.pick(v, ['date', 'dateIssued'], ''),
      name: this.pick(v, ['licensee'], ''),
      address: this.pick(v, ['address'], ''),
      particulars: this.pick(v, ['particulars'], ''),
      periodCovered: this.pick(v, ['periodCovered'], ''),

      preparedBy,
      approvedBy,

      flags: {
        txnNew: !!v.txnNew,
        txnRenew: !!v.txnRenew,
        txnCO: !!v.txnCO,
        txnCV: !!v.txnCV,
        txnModification: !!v.txnModification,
        catROC: !!v.catROC,

        forAssessmentOnly,
        endorsedForPayment,
      },

      sections: [
        {
          title: 'FOR LICENSES',
          rows: [
            ['Permit to Purchase', this.pickNum(v, ['licPermitToPurchase'], 0)],
            ['Filing Fee', this.pickNum(v, ['licFilingFee'], 0)],
            ['Permit to Possess / Storage', this.pickNum(v, ['licPermitToPossess'], 0)],
            ['Construction Permit Fee', this.pickNum(v, ['licConstructionPermitFee'], 0)],
            ['Radio Station License', this.pickNum(v, ['licRadioStationLicense'], 0)],
            ['Inspection Fee', this.pickNum(v, ['licInspectionFee'], 0)],
            ['Spectrum User’s Fee (SUF)', this.pickNum(v, ['licSUF'], 0)],
            ['Surcharges', this.pickNum(v, ['licSurcharges'], 0)],
            ['Fines and Penalties', this.pickNum(v, ['licFinesPenalties'], 0)],
          ],
        },
        {
          title: 'FOR PERMITS',
          rows: [
            ['Permit (Dealer / Reseller / Service Center)', this.pickNum(v, ['perPermitFees'], 0)],
            ['Inspection Fee', this.pickNum(v, ['perInspectionFee'], 0)],
            ['Filing Fee', this.pickNum(v, ['perFilingFee'], 0)],
            ['Surcharges', this.pickNum(v, ['perSurcharges'], 0)],
          ],
        },
        {
          title: 'FOR AMATEUR AND ROC',
          rows: [
            ['Radio Station License', this.pickNum(v, ['amRadioStationLicense'], 0)],
            ["Radio Operator’s Certificate", this.pickNum(v, ['amRadioOperatorsCert'], 0)],
            ['Application Fee', this.pickNum(v, ['amApplicationFee'], 0)],
            ['Filing Fee', this.pickNum(v, ['amFilingFee'], 0)],
            ['Seminar Fee', this.pickNum(v, ['amSeminarFee'], 0)],
            ['Surcharges', this.pickNum(v, ['amSurcharges'], 0)],
          ],
        },
        {
          title: 'OTHER APPLICATION',
          rows: [
            ['Registration Fee', this.pickNum(v, ['appRegistrationFee'], 0)],
            ['Supervision / Regulation Fee', this.pickNum(v, ['appSupervisionRegulationFee'], 0)],
            ['Verification / Authentication Fee', this.pickNum(v, ['appVerificationAuthFee'], 0)],
            ['Examination Fee', this.pickNum(v, ['appExaminationFee'], 0)],
            ['Clearance / Certification Fee (Special)', this.pickNum(v, ['appClearanceCertificationFee'], 0)],
            ['Modification Fee', this.pickNum(v, ['appModificationFee'], 0)],
            ['Miscellaneous Income', this.pickNum(v, ['appMiscIncome'], 0)],
            ['Documentary Stamp Tax (DST)', this.pickNum(v, ['dst'], 0)],
            ['Others', this.pickNum(v, ['appOthers'], 0)],
          ],
        },
      ],
    };

    this.soaPdf.generatePDF(soaData);
  }
}
