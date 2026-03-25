
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

type ParticularsHoverDialogData = {
  particulars?: string;
  years?: string | number | null;
  licensePermitNo?: string | null;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
};

export type ParticularsHoverEntry = {
  status: string;
  type: string;
  years: string;
  units: string;
  licensePermitNo: string;
  chunkIndex: number;
  baseSegments: string[];
  rawParts: string[];
};

type ParticularsHoverTableRow = {
  label: string;
  key: keyof ParticularsHoverEntry;
};

type ParticularsTableDialogData = {
  entries: ParticularsHoverEntry[];
};

export type ParticularsHoverDialogResult = {
  action: 'showTable';
};

export type ParticularsTableDialogResult =
  | { action: 'delete'; particulars: string }
  | { action: 'edit'; entryIndex: number };

const PARTICULARS_TABLE_ROWS: ParticularsHoverTableRow[] = [
  { label: 'Status', key: 'status' },
  { label: 'Type', key: 'type' },
  { label: 'Years', key: 'years' },
  { label: 'Units (optional)', key: 'units' },
  { label: 'License No / Permit No.', key: 'licensePermitNo' },
];

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
  licensePermitNo: string,
  chunkIndex: number
): ParticularsHoverEntry[] {
  const segments = chunk.split(' - ').map((segment) => segment.trim()).filter(Boolean);
  if (!segments.length) return [];

  const firstTxnIndex = segments.findIndex((segment) => segmentHasTxnOrUnits(segment));
  const baseSegments = firstTxnIndex >= 0 ? segments.slice(0, firstTxnIndex) : segments.slice();
  const type = buildTypeLabel(baseSegments, chunk);
  const tailSegments = firstTxnIndex >= 0 ? segments.slice(firstTxnIndex) : [];
  const pieces = tailSegments.flatMap((segment) => splitSlashSeparated(segment));

  const entries: ParticularsHoverEntry[] = [];
  let pendingUnits = '';
  let pendingUnitsRaw = '';

  for (const piece of pieces) {
    if (isUnitsSegment(piece)) {
      const units = String(parseUnitsValue(piece));
      const unitsRaw = `UNITS_${units}`;
      const lastEntry = entries[entries.length - 1];

      if (lastEntry && !lastEntry.units) {
        lastEntry.units = units;
        lastEntry.rawParts.push(unitsRaw);
      } else {
        pendingUnits = units;
        pendingUnitsRaw = unitsRaw;
      }
      continue;
    }

    if (!isTxnSegment(piece)) continue;

    const status = displayStatusLabel(piece);
    const normalizedTxn = normalizeTxnLabel(piece);
    const lastEntry = entries[entries.length - 1];

    if (status === 'Dup' && lastEntry) {
      lastEntry.status = combineStatus(lastEntry.status, status);
      lastEntry.rawParts.push(normalizedTxn);
      continue;
    }

    if (lastEntry && !lastEntry.units && !pendingUnits && shouldCombineStatuses(lastEntry.status, status)) {
      lastEntry.status = combineStatus(lastEntry.status, status);
      lastEntry.rawParts.push(normalizedTxn);
      continue;
    }

    entries.push({
      status,
      type,
      years,
      units: pendingUnits,
      licensePermitNo,
      chunkIndex,
      baseSegments: [...baseSegments],
      rawParts: pendingUnitsRaw ? [normalizedTxn, pendingUnitsRaw] : [normalizedTxn],
    });
    pendingUnits = '';
    pendingUnitsRaw = '';
  }

  if (!entries.length) {
    return [
      {
        status: '',
        type,
        years,
        units: pendingUnits,
        licensePermitNo,
        chunkIndex,
        baseSegments: [...baseSegments],
        rawParts: pendingUnitsRaw ? [pendingUnitsRaw] : [],
      },
    ];
  }

  return entries;
}

export function parseParticularsHoverEntries(
  raw: string,
  yearsValue: string | number | null | undefined,
  licensePermitNoValue: string | null | undefined
): ParticularsHoverEntry[] {
  const particulars = String(raw ?? '').trim();
  if (!particulars) return [];

  const chunks = particulars
    .split('||')
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  const years = formatYearsValue(yearsValue);
  const licensePermitNo = String(licensePermitNoValue ?? '').trim();
  const allEntries: ParticularsHoverEntry[] = [];

  for (const [chunkIndex, chunk] of chunks.entries()) {
    allEntries.push(...buildEntriesForChunk(chunk, years, licensePermitNo, chunkIndex));
  }

  return allEntries;
}

export function serializeParticularsHoverEntries(entries: ParticularsHoverEntry[]): string {
  const grouped = new Map<number, { baseSegments: string[]; parts: string[] }>();

  for (const entry of entries) {
    const current = grouped.get(entry.chunkIndex);
    if (current) {
      current.parts.push(...entry.rawParts);
      continue;
    }

    grouped.set(entry.chunkIndex, {
      baseSegments: [...entry.baseSegments],
      parts: [...entry.rawParts],
    });
  }

  return Array.from(grouped.values())
    .map(({ baseSegments, parts }) => [...baseSegments, ...parts].filter(Boolean).join(' - ').trim())
    .filter(Boolean)
    .join(' || ');
}

@Component({
    selector: 'app-particulars-table-dialog',
    imports: [],
    template: `
    <div class="tableDlg">
      <div class="tableDlgHeader">
        <h3 class="tableDlgTitle">Particulars Table</h3>
        <button type="button" class="tableDlgCloseBtn" (click)="close()">Close</button>
      </div>
    
      @if (entries.length) {
        <div class="tableDlgBody">
          <div class="tblWrap">
            <table class="tbl">
              <thead>
                <tr>
                  @for (row of rows; track row) {
                    <th>{{ row.label }}</th>
                  }
                  <th class="actionsCol">Action</th>
                </tr>
              </thead>
              <tbody>
                @for (entry of entries; track entry; let i = $index) {
                  <tr>
                    @for (row of rows; track row) {
                      <td>{{ entry[row.key] || '' }}</td>
                    }
                    <td class="actionsCell">
                      <button
                        type="button"
                        class="iconBtn"
                        aria-label="Edit row"
                        title="Edit row"
                        (click)="editEntry(i, $event)"
                        >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path
                            d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm14.71-9.04a.996.996 0 0 0 0-1.41l-2.5-2.5a.996.996 0 1 0-1.41 1.41l2.5 2.5c.39.39 1.03.39 1.41 0z"
                            />
                        </svg>
                      </button>
                      <button
                        type="button"
                        class="iconBtn danger"
                        aria-label="Delete row"
                        title="Delete row"
                        (click)="deleteEntry(i, $event)"
                        >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path
                            d="M6 7h12l-1 14H7L6 7zm3-3h6l1 2h4v2H4V6h4l1-2z"
                            />
                        </svg>
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      } @else {
        <div class="empty">No particulars to preview.</div>
      }
    
    </div>
    `,
    styles: [`
    .tableDlg{
      width:100%;
      background:#fffef7;
      border:1px solid #a8b0bf;
      border-radius:12px;
      box-shadow:0 18px 40px rgba(15,23,42,.18);
      overflow:hidden;
    }
    .tableDlgHeader{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:12px;
      padding:14px 16px;
      background:#eef4fb;
      border-bottom:1px solid #d7dde6;
    }
    .tableDlgTitle{
      margin:0;
      font:700 14px Arial,sans-serif;
      color:#1f2937;
    }
    .tableDlgCloseBtn{
      padding:7px 12px;
      border:1px solid #b9c7da;
      border-radius:8px;
      background:#fff;
      color:#1f2937;
      font:600 12px Arial,sans-serif;
      cursor:pointer;
    }
    .tableDlgCloseBtn:hover{
      background:#f8fafc;
    }
    .tableDlgBody{
      padding:0;
    }
    .tblWrap{
      overflow:auto;
      max-height:min(70vh, 560px);
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
      position:sticky;
      top:0;
      z-index:1;
      background:#eef4fb;
      font-weight:700;
      white-space:nowrap;
    }
    td{
      background:#fff;
    }
    .actionsCol{
      width:92px;
      min-width:92px;
      text-align:center;
    }
    .actionsCell{
      white-space:nowrap;
      text-align:center;
    }
    .iconBtn{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      width:28px;
      height:28px;
      margin:0 2px;
      border:1px solid #cbd5e1;
      border-radius:7px;
      background:#f8fafc;
      color:#1e3a8a;
      cursor:pointer;
      transition:background-color .15s ease, border-color .15s ease, transform .15s ease;
    }
    .iconBtn:hover{
      background:#e8f0ff;
      border-color:#93c5fd;
      transform:translateY(-1px);
    }
    .iconBtn svg{
      width:15px;
      height:15px;
      fill:currentColor;
    }
    .iconBtn.danger{
      color:#b42318;
    }
    .iconBtn.danger:hover{
      background:#fff1f2;
      border-color:#fda4af;
    }
    .empty{
      padding:16px;
      font:600 12px Arial,sans-serif;
      color:#475569;
    }
  `]
})
export class ParticularsTableDialogComponent {
  readonly entries: ParticularsHoverEntry[];
  readonly rows = PARTICULARS_TABLE_ROWS;

  constructor(
    private ref: MatDialogRef<ParticularsTableDialogComponent>,
    @Inject(MAT_DIALOG_DATA) data: ParticularsTableDialogData
  ) {
    this.entries = Array.isArray(data?.entries) ? data.entries : [];
  }

  close(): void {
    this.ref.close();
  }

  editEntry(entryIndex: number, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.ref.close({ action: 'edit', entryIndex } satisfies ParticularsTableDialogResult);
  }

  deleteEntry(entryIndex: number, event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    const nextEntries = this.entries.filter((_, index) => index !== entryIndex);
    this.ref.close({
      action: 'delete',
      particulars: serializeParticularsHoverEntries(nextEntries),
    } satisfies ParticularsTableDialogResult);
  }
}

@Component({
    selector: 'app-particulars-hover-dialog',
    imports: [],
    template: `
    <div
      class="hoverDlg"
      (mouseenter)="handlePointerEnter()"
      (mouseleave)="handlePointerLeave()"
      >
      @if (entries.length) {
        <div class="tblWrap">
          <table class="tbl">
            <thead>
              <tr>
                @for (row of rows; track row) {
                  <th>{{ row.label }}</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (entry of entries; track entry) {
                <tr>
                  @for (row of rows; track row) {
                    <td>{{ entry[row.key] || '' }}</td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <div class="empty">No particulars to preview.</div>
      }
    
    
      <div class="hoverActions">
        <button type="button" class="showTableBtn" (click)="openTableDialog($event)">
          Show table
        </button>
      </div>
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
    .hoverActions{
      display:flex;
      justify-content:flex-end;
      padding:10px 12px;
      border-top:1px solid #d7dde6;
      background:#f9fbff;
    }
    .showTableBtn{
      padding:7px 12px;
      border:1px solid #9db9ff;
      border-radius:8px;
      background:#eaf2ff;
      color:#1d4ed8;
      font:700 12px Arial,sans-serif;
      cursor:pointer;
      transition:background-color .15s ease, border-color .15s ease;
    }
    .showTableBtn:hover{
      background:#dbeafe;
      border-color:#7ea6ff;
    }
  `]
})
export class ParticularsHoverDialogComponent {
  readonly entries: ParticularsHoverEntry[];
  readonly rows = PARTICULARS_TABLE_ROWS;
  private readonly onPointerEnterCallback?: () => void;
  private readonly onPointerLeaveCallback?: () => void;

  constructor(
    private ref: MatDialogRef<ParticularsHoverDialogComponent>,
    @Inject(MAT_DIALOG_DATA) data: ParticularsHoverDialogData
  ) {
    this.entries = parseParticularsHoverEntries(
      data?.particulars ?? '',
      data?.years,
      data?.licensePermitNo
    );
    this.onPointerEnterCallback = data?.onPointerEnter;
    this.onPointerLeaveCallback = data?.onPointerLeave;
  }

  close(): void {
    this.ref.close();
  }

  openTableDialog(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.ref.close({ action: 'showTable' } satisfies ParticularsHoverDialogResult);
  }

  handlePointerEnter(): void {
    this.onPointerEnterCallback?.();
  }

  handlePointerLeave(): void {
    this.onPointerLeaveCallback?.();
  }
}
