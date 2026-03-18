import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

type ParticularsHoverDialogData = {
  particulars?: string;
};

type HoverRow = {
  deviceName: string;
  units: number;
};

const GENERIC_SERVICE_LABELS = [
  'VHF/UHF RADIO STATIONS',
  'MOBILE PHONE PERMITS',
  'TVRO/CATV',
  'AMATEUR',
  'COASTAL STATION LICENSE',
  'SHIP STATION LICENSE',
  'DELETION CERTIFICATE',
] as const;

const NON_DEVICE_SEGMENTS = [
  'DOMESTIC',
  'INTERNATIONAL',
  'HIGH POWERED',
  'MEDIUM POWERED',
  'LOW POWERED',
  'RADIO TELEGRAPHY',
  'RADIO TELEPHONY',
  'COASTAL STATIONS',
  'HIGH FREQUENCY (HF)',
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

function isGenericServiceLabel(value: string): boolean {
  const text = String(value ?? '').trim().toUpperCase();
  return GENERIC_SERVICE_LABELS.some((label) => text === label);
}

function looksLikeNonDeviceSegment(value: string): boolean {
  const text = String(value ?? '').trim().toUpperCase();

  if (NON_DEVICE_SEGMENTS.some((label) => text === label)) return true;
  if (text.includes('POWERED')) return true;
  if (text === 'SESCL/LRIT/SSAS/SESFB') return true;

  return false;
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

function txnSuffix(value: string): string {
  const text = normalizeTxnLabel(value);

  switch (text) {
    case 'NEW':
      return 'NEW';
    case 'RENEW':
      return 'REN';
    case 'MODIFICATION':
      return 'MOD';
    case 'PURCHASE/POSSESS':
    case 'PERMIT TO PURCHASE/POSSESS':
      return 'POSSESS';
    case 'PERMIT TO POSSESS FOR STORAGE OF AMATEUR RADIO STATIONS':
    case 'POSSESS (STORAGE)':
      return 'STORAGE';
    case 'PERMIT TO SELL/TRANSFER':
    case 'SELL/TRANSFER':
      return 'SELL';
    case 'DUPLICATE':
      return 'DUP';
    default:
      return '';
  }
}

function decorateDeviceName(deviceName: string, txn: string): string {
  const base = String(deviceName ?? '').trim();
  const suffix = txnSuffix(txn);

  if (!base) return base;
  if (!suffix) return base;

  return `${base} (${suffix})`;
}

function buildBaseLabel(segments: string[]): string {
  const baseParts: string[] = [];

  for (const segment of segments) {
    if (isTxnSegment(segment) || isUnitsSegment(segment)) break;
    baseParts.push(segment);
  }

  return baseParts.join(' - ').trim();
}

function extractDeviceName(segments: string[], baseLabel: string): string {
  const baseSegments = segments.filter((segment) => !isTxnSegment(segment) && !isUnitsSegment(segment));
  const preferred = baseSegments.find((segment, index) =>
    index > 0 && !isGenericServiceLabel(segment) && !looksLikeNonDeviceSegment(segment)
  );

  if (preferred) return preferred;

  const fallback = baseSegments.find((segment) => !isGenericServiceLabel(segment));
  return fallback || baseLabel || '';
}

function extractPrimaryTxn(segments: string[]): string {
  for (const segment of segments) {
    const txn = normalizeTxnLabel(segment);
    if (txn === 'NEW' || txn === 'RENEW' || txn === 'MODIFICATION') {
      return txn;
    }
  }

  return '';
}

function parseUnitsValue(value: string): number {
  const match = String(value ?? '').trim().toUpperCase().match(/(?:UNITS?[_\s:=-]*|UNIT\s+)(\d+)/);
  return Math.max(1, Number(match?.[1] || 1));
}

function buildTxnRows(segments: string[], deviceName: string): HoverRow[] {
  const rows: HoverRow[] = [];
  let pendingTxn = '';
  let pendingUnits: number | null = null;

  const pushRow = (txn: string, units: number | null) => {
    const normalizedTxn = normalizeTxnLabel(txn);
    const nextUnits = Math.max(1, Number(units ?? 1));

    rows.push({
      deviceName: decorateDeviceName(deviceName || humanizeTxnLabel(normalizedTxn), normalizedTxn),
      units: nextUnits,
    });
  };

  for (const segment of segments) {
    if (isUnitsSegment(segment)) {
      const units = parseUnitsValue(segment);

      if (pendingTxn) {
        pushRow(pendingTxn, units);
        pendingTxn = '';
        pendingUnits = null;
      } else {
        pendingUnits = units;
      }
      continue;
    }

    if (!isTxnSegment(segment)) continue;

    const txn = normalizeTxnLabel(segment);

    if (pendingUnits !== null) {
      pushRow(txn, pendingUnits);
      pendingUnits = null;
      pendingTxn = '';
      continue;
    }

    if (pendingTxn) {
      pushRow(pendingTxn, 1);
    }

    pendingTxn = txn;
  }

  if (pendingTxn) {
    pushRow(pendingTxn, pendingUnits);
  }

  return rows;
}

function parseHoverRows(raw: string): HoverRow[] {
  const particulars = String(raw ?? '').trim();
  if (!particulars) return [];

  const chunks = particulars
    .split('||')
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  const allRows: HoverRow[] = [];

  for (const chunk of chunks) {
    const segments = chunk.split(' - ').map((segment) => segment.trim()).filter(Boolean);
    const baseLabel = buildBaseLabel(segments);
    const deviceName = extractDeviceName(segments, baseLabel);
    const firstTxnIndex = segments.findIndex((segment) => isTxnSegment(segment) || isUnitsSegment(segment));
    const txnSegments = firstTxnIndex >= 0 ? segments.slice(firstTxnIndex) : [];
    const txnRows = buildTxnRows(txnSegments, deviceName);

    if (txnRows.length) {
      allRows.push(...txnRows);
      continue;
    }

    const primaryTxn = extractPrimaryTxn(segments);
    const unitsMatch = chunk.match(/UNITS?_?(\d+)|UNIT\s+(\d+)/i);
    const units = Math.max(1, Number(unitsMatch?.[1] || unitsMatch?.[2] || 1));
    const baseRowName = decorateDeviceName(deviceName || baseLabel || chunk, primaryTxn);

    if (baseRowName) {
      allRows.push({ deviceName: baseRowName, units });
    }
  }

  return allRows;
}

@Component({
  selector: 'app-particulars-hover-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="hoverDlg">
      <table class="tbl" *ngIf="rows.length">
        <thead>
          <tr>
            <th>Device Name</th>
            <th>Units</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let row of rows">
            <td>{{ row.deviceName }}</td>
            <td class="units">{{ row.units }}</td>
          </tr>
        </tbody>
      </table>
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
    }
    .tbl{
      width:100%;
      border-collapse:collapse;
      table-layout:fixed;
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
    }
    tbody tr:last-child td{
      border-bottom:none;
    }
    .units{
      width:72px;
      text-align:center;
      white-space:nowrap;
    }
  `],
})
export class ParticularsHoverDialogComponent {
  readonly rows: HoverRow[];

  constructor(
    private ref: MatDialogRef<ParticularsHoverDialogComponent>,
    @Inject(MAT_DIALOG_DATA) data: ParticularsHoverDialogData
  ) {
    this.rows = parseHoverRows(data?.particulars ?? '');
  }

  close(): void {
    this.ref.close();
  }
}
