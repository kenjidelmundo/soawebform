import { Component, Input } from '@angular/core';

import { FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
    selector: 'app-soa-header',
    imports: [ReactiveFormsModule],
    templateUrl: './soa-header.component.html',
    styleUrls: ['./soa-header.component.css']
})
export class SoaHeaderComponent {
  @Input() form!: FormGroup;
}
