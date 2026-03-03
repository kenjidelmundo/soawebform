import { Component, EventEmitter, Input, Output, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { SoaPdfService } from '../soa-pdf/soa-pdf.service';
import { Subject, merge, interval } from 'rxjs';
import { startWith, takeUntil, filter, map, distinctUntilChanged } from 'rxjs/operators';

type TxnKey = 'NEW' | 'RENEW' | 'MOD';

@Component({
  selector: 'app-soa-right-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './soa-right-panel.component.html',
  styleUrls: ['./soa-right-panel.component.css'],
})
export class SoaRightPanelComponent implements OnInit, OnDestroy {
  @Input() form!: FormGroup;

  @Output() onSave = new EventEmitter<void>();
  @Output() onNewRecord = new EventEmitter<void>();
  @Output() onPrintSOA = new EventEmitter<void>();
  @Output() onAssessment = new EventEmitter<void>();
  @Output() onPrintOP = new EventEmitter<void>();

  private destroy$ = new Subject<void>();
  private txnGuard = false;

  constructor(private soaPdf: SoaPdfService) {}

  ngOnInit(): void {
    this.setupTxnSingleSelect();     // ✅ user clicking right panel still behaves like radio
    this.setupTxnAutoSyncPolling();  // ✅ always sync from particulars even if emitEvent:false
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
  // ✅ Right panel NEW/RENEW/MOD must be SINGLE SELECT
  // ======================================================
  private setupTxnSingleSelect(): void {
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
        if (!v) return; // only when user turns one ON
        this.applyTxnKey(key);
      });
  }

  // ======================================================
  // ✅ HARD FIX: Poll the form and sync txn checkboxes
  // This works even if Particulars is patched with emitEvent:false
  // ======================================================
  private setupTxnAutoSyncPolling(): void {
    if (!this.form) return;

    interval(200)
      .pipe(
        takeUntil(this.destroy$),
        filter(() => !this.txnGuard),
        map(() => {
          // read raw values (works even if controls are disabled)
          const raw: any = this.form.getRawValue?.() ?? this.form.value ?? {};

          // ✅ get PARTICULARS text from any control containing "particular"
          const particularsText =
            this.findStringInFormTree(this.form, ['particular']) ||
            String(raw.particulars ?? '');

          // also allow dedicated txn-type controls if you have them
          const txnTypeAny =
            raw.txnType ??
            raw.transactionType ??
            raw.particularsTxnType ??
            raw.partTxnType ??
            this.findStringInFormTree(this.form, ['txn', 'type']) ??
            this.findStringInFormTree(this.form, ['transaction', 'type']);

          // decide from txnType control first, then from particulars text
          return this.normalizeTxn(txnTypeAny) || this.normalizeTxn(particularsText);
        }),
        distinctUntilChanged()
      )
      .subscribe((key) => {
        if (!key) return;
        this.applyTxnKey(key);
      });
  }

  // ======================================================
  // ✅ Apply txn selection to right panel checkboxes
  // Also writes txnType/transactionType if those controls exist
  // ======================================================
  private applyTxnKey(key: TxnKey): void {
    const cNew = this.form.get('txnNew');
    const cRen = this.form.get('txnRenew');
    const cMod = this.form.get('txnModification');

    if (!cNew && !cRen && !cMod) return;

    this.txnGuard = true;

    const patch: any = {
      txnNew: key === 'NEW',
      txnRenew: key === 'RENEW',
      txnModification: key === 'MOD',
    };

    // patch only if those controls exist
    if (!cNew) delete patch.txnNew;
    if (!cRen) delete patch.txnRenew;
    if (!cMod) delete patch.txnModification;

    // optional: keep a string txnType control in sync if present
    if (this.form.get('txnType')) patch.txnType = key;
    if (this.form.get('transactionType')) patch.transactionType = key;

    this.form.patchValue(patch, { emitEvent: false });

    this.txnGuard = false;
  }

  // ======================================================
  // ✅ FIX: RENEW must NOT become NEW (word-boundary + RENEW-first)
  // ======================================================
  private normalizeTxn(v: any): TxnKey | null {
    if (v === null || v === undefined) return null;

    const s = String(v).trim().toUpperCase();

    // exact
    if (s === 'RENEW' || s === 'RENEWAL') return 'RENEW';
    if (s === 'MOD' || s === 'MODIFICATION') return 'MOD';
    if (s === 'NEW') return 'NEW';

    // ✅ word boundaries; check RENEW first
    if (/\bRENEW(AL)?\b/.test(s)) return 'RENEW';
    if (/\bMOD(IFICATION)?\b/.test(s)) return 'MOD';
    if (/\bNEW\b/.test(s)) return 'NEW';

    return null;
  }

  // -----------------------
  // helpers (unchanged)
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

          // ✅ if keywords = ['particular'] then it matches any name containing that
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

  // ✅ pdfMake SOA preview button should call this
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