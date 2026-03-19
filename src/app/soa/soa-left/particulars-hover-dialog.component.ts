import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

type ParticularsHoverDialogData = {
  particulars?: string;
  years?: string | number | null;
  licensePermitNo?: string | null;
};

type HoverEntry = {
  status: string;
  type: string;
  years: string;
  units: string;
  licensePermitNo: string;
};

const GENERIC_SERVICE_LABELS = [
  'ROC',
  'VHF/UHF RADIO STATIONS',
  'MOBILE PHONE PERMITS',
  'TVRO/CATV',
  'AMATEUR',
  'COASTAL STATION LICENSE',
  'SHIP STATION LICENSE',
  'DELETION CERTIFICATE',
] as const;

const TXN_LABELS = [
  'PERMIT TO POSSESS FOR STORAGE OF AMATEUR RADIO STATIONS',
  'PERMIT TO PURCHASE/POSSESS',
  'PERMIT TO SELL/TRANSFER',
  'PURCHASE AND POSSESS',
  'PURCHASE/POSSESS',
  'POSSESS (STORAGE)',
  'MODIFICATION',
  'SELL/TRANSFER',
  'RENEW',
  'NEW',
  'MOD',
  'DUPLICATE',
] as const;

function normalizeTxnLabel(value: string): string {
  const text = String(value ?? '').trim().toUpperCase();

  switch (text) {
    case 'MOD':
      return 'MODIFICATION';
    case 'PURCHASE AND POSSESS':
      return 'PURCHASE/POSSESS';
    default:
      return text;
  }
}

function isTxnSegment(value: string): boolean {
  const text = normalizeTxnLabel(value);
  return TXN_LABELS.some((label) => text === label);
}

function isUnitsSegment(value: string): boolean {
  const text = String(value ?? '').trim().toUpperCase();
  return /^UNITS?[_\s:=-]*\d+$/.test(text) || /^UNIT\s+\d+$/.test(text);
}

function splitSlashSeparated(value: string): string[] {
  return String(value ?? '')
    .split(/\s+\/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function isGenericServiceLabel(value: string): boolean {
  const text = String(value ?? '').trim().toUpperCase();
  return GENERIC_SERVICE_LABELS.some((label) => text === label);
}

function humanizeTxnLabel(value: string): string {
  const text = normalizeTxnLabel(value);

  switch (text) {
    case 'NEW':
      return 'NEW';
    case 'RENEW':
      return 'RENEW';
    case 'MODIFICATION':
      return 'MODIFICATION';
    case 'PURCHASE/POSSESS':
      return 'PURCHASE/POSSESS';
    case 'PERMIT TO PURCHASE/POSSESS':
      return 'PERMIT TO PURCHASE/POSSESS';
    case 'PERMIT TO SELL/TRANSFER':
      return 'PERMIT TO SELL/TRANSFER';
    case 'SELL/TRANSFER':
      return 'SELL/TRANSFER';
    case 'PERMIT TO POSSESS FOR STORAGE OF AMATEUR RADIO STATIONS':
      return 'PERMIT TO POSSESS FOR STORAGE';
    case 'POSSESS (STORAGE)':
      return 'POSSESS (STORAGE)';
    case 'DUPLICATE':
      return 'DUPLICATE';
    default:
      return text;
  }
}

function parseUnitsValue(value: string): number {
  const match = String(value ?? '').trim().toUpperCase().match(/(?:UNITS?[_\s:=-]*|UNIT\s+)(\d+)/);
  return Math.max(1, Number(match?.[1] || 1));
}

function formatYearsValue(value: string | number | null | undefined): string {
  const text = String(value ?? '').trim();
  if (!text || text === '0') return '';
  return text;
}

function displayStatusLabel(value: string): string {
  const text = normalizeTxnLabel(value);

  switch (text) {
    case 'NEW':
      return 'New';
    case 'RENEW':
      return 'Ren';
    case 'MODIFICATION':
      return 'Mod';
    case 'DUPLICATE':
      return 'Dup';
    case 'PURCHASE/POSSESS':
      return 'Purchase/Possess';
    case 'PERMIT TO PURCHASE/POSSESS':
      return 'Permit to Purchase/Possess';
    case 'SELL/TRANSFER':
      return 'Sell/Transfer';
    case 'PERMIT TO SELL/TRANSFER':
      return 'Permit to Sell/Transfer';
    case 'PERMIT TO POSSESS FOR STORAGE OF AMATEUR RADIO STATIONS':
    case 'POSSESS (STORAGE)':
      return 'Possess (Storage)';
    default:
      return humanizeTxnLabel(text);
  }
}

function shouldCombineStatuses(current: string, next: string): boolean {
  const combinable = new Set(['New', 'Ren', 'Mod']);
  return combinable.has(current) && combinable.has(next);
}

function combineStatus(current: string, next: string): string {
  if (!current) return next;
  if (!next || current === next) return current;

  const parts = current.split('/').map((part) => part.trim()).filter(Boolean);
  if (parts.includes(next)) return current;

  return `${current}/${next}`;
}

function segmentHasTxnOrUnits(value: string): boolean {
  return splitSlashSeparated(value).some((piece) => isTxnSegment(piece) || isUnitsSegment(piece));
}

function buildTypeLabel(baseSegments: string[], fallback: string): string {
  if (!baseSegments.length) return fallback.trim();

  const detailSegments = baseSegments.filter((segment) => !isGenericServiceLabel(segment));
  const cleanedDetail =
    detailSegments.length >= 2 &&
    detailSegments[1].toUpperCase().startsWith(detailSegments[0].toUpperCase())
      ? detailSegments.slice(1)
      : detailSegments;

  return cleanedDetail.join(' - ').trim() || baseSegments.join(' - ').trim() || fallback.trim();
}

function buildEntriesForChunk(
  chunk: string,
  years: string,
  licensePermitNo: string
): HoverEntry[] {
  const segments = chunk.split(' - ').map((segment) => segment.trim()).filter(Boolean);
  if (!segments.length) return [];

  const firstTxnIndex = segments.findIndex((segment) => segmentHasTxnOrUnits(segment));
  const baseSegments = firstTxnIndex >= 0 ? segments.slice(0, firstTxnIndex) : segments.slice();
  const type = buildTypeLabel(baseSegments, chunk);
  const tailSegments = firstTxnIndex >= 0 ? segments.slice(firstTxnIndex) : [];
  const pieces = tailSegments.flatMap((segment) => splitSlashSeparated(segment));

  const entries: HoverEntry[] = [];
  let pendingUnits = '';

  for (const piece of pieces) {
    if (isUnitsSegment(piece)) {
      const units = String(parseUnitsValue(piece));
      const lastEntry = entries[entries.length - 1];

      if (lastEntry && !lastEntry.units) {
        lastEntry.units = units;
      } else {
        pendingUnits = units;
      }
      continue;
    }

    if (!isTxnSegment(piece)) continue;

    const status = displayStatusLabel(piece);
    const lastEntry = entries[entries.length - 1];

    if (status === 'Dup' && lastEntry) {
      lastEntry.status = combineStatus(lastEntry.status, status);
      continue;
    }

    if (lastEntry && !lastEntry.units && !pendingUnits && shouldCombineStatuses(lastEntry.status, status)) {
      lastEntry.status = combineStatus(lastEntry.status, status);
      continue;
    }

    entries.push({
      status,
      type,
      years,
      units: pendingUnits,
      licensePermitNo,
    });
    pendingUnits = '';
  }

  if (!entries.length) {
    return [
      {
        status: '',
        type,
        years,
        units: pendingUnits,
        licensePermitNo,
      },
    ];
  }

  return entries;
}

function parseHoverEntries(
  raw: string,
  yearsValue: string | number | null | undefined,
  licensePermitNoValue: string | null | undefined
): HoverEntry[] {
  const particulars = String(raw ?? '').trim();
  if (!particulars) return [];

  const chunks = particulars
    .split('||')
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  const years = formatYearsValue(yearsValue);
  const licensePermitNo = String(licensePermitNoValue ?? '').trim();
  const allEntries: HoverEntry[] = [];

  for (const chunk of chunks) {
    allEntries.push(...buildEntriesForChunk(chunk, years, licensePermitNo));
  }

  return allEntries;
}

@Component({
  selector: 'app-particulars-hover-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="hoverDlg">
      <div class="tblWrap" *ngIf="entries.length; else emptyState">
        <table class="tbl">
          <thead>
            <tr>
              <th *ngFor="let row of rows">{{ row.label }}</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let entry of entries">
              <td *ngFor="let row of rows">{{ entry[row.key] || '' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <ng-template #emptyState>
        <div class="empty">No particulars to preview.</div>
      </ng-template>
    </div>
  `,
  styles: [`
    .hoverDlg{
      width:100%;
      min-height:48px;
      padding:0;
      border:1px solid #a8b0bf;
      border-radius:10px;
      background:#fffef7;
      box-shadow:0 10px 24px rgba(0,0,0,.16);
      box-sizing:border-box;
      overflow:hidden;
    }
    .tblWrap{
      overflow:auto;
    }
    .tbl{
      width:100%;
      border-collapse:collapse;
      table-layout:auto;
      font-family:Arial,sans-serif;
      font-size:12px;
      color:#1f2937;
    }
    th, td{
      padding:7px 9px;
      border:1px solid #d7dde6;
      vertical-align:top;
      text-align:left;
      word-break:break-word;
    }
    th{
      background:#eef4fb;
      font-weight:700;
      white-space:nowrap;
    }
    td{
      background:#fff;
    }
    .empty{
      padding:12px 14px;
      font:600 12px Arial,sans-serif;
      color:#475569;
    }
  `],
})
export class ParticularsHoverDialogComponent {
  readonly entries: HoverEntry[];
  readonly rows: Array<{ label: string; key: keyof HoverEntry }> = [
    { label: 'Status', key: 'status' },
    { label: 'Type', key: 'type' },
    { label: 'Years', key: 'years' },
    { label: 'Units (optional)', key: 'units' },
    { label: 'License No / Permit No.', key: 'licensePermitNo' },
  ];

  constructor(
    private ref: MatDialogRef<ParticularsHoverDialogComponent>,
    @Inject(MAT_DIALOG_DATA) data: ParticularsHoverDialogData
  ) {
    this.entries = parseHoverEntries(
      data?.particulars ?? '',
      data?.years,
      data?.licensePermitNo
    );
  }

  close(): void {
    this.ref.close();
  }
}
