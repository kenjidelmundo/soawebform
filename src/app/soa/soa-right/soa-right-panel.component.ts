import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { SoaPdfService } from '../soa-pdf/soa-pdf.service';

@Component({
  selector: 'app-soa-right-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './soa-right-panel.component.html',
  styleUrls: ['./soa-right-panel.component.css']
})
export class SoaRightPanelComponent {
  @Input() form!: FormGroup;

  @Output() onSave = new EventEmitter<void>();
  @Output() onNewRecord = new EventEmitter<void>();
  @Output() onPrintSOA = new EventEmitter<void>();
  @Output() onAssessment = new EventEmitter<void>();
  @Output() onPrintOP = new EventEmitter<void>();

  constructor(private soaPdf: SoaPdfService) {}

printSOAPreview(): void {
  const v = this.form?.value;

  this.soaPdf.generatePDF({
    soaNo: v?.soaNo ?? '',
    date: v?.dateIssued ?? v?.date ?? '',
    name: v?.payeeName ?? v?.name ?? '',
    address: v?.address ?? '',
    type: v?.type ?? 'New',
    particulars: v?.particulars ?? '',
    periodCovered: v?.periodCovered ?? '',
    sections: [], 
  } as any);
}

}
