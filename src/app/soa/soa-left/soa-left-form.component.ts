import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-soa-left-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './soa-left-form.component.html',
  styleUrls: ['./soa-left-form.component.css']
})
export class SoaLeftFormComponent {
  @Input() form!: FormGroup;
}
