import { Routes } from '@angular/router';
import { AuthorizedByPageComponent } from './authorized-by-page.component';
import { SoaPageComponent } from './soa/soa-page.component';

export const routes: Routes = [
  { path: '', component: SoaPageComponent },
  { path: 'authorized-by', component: AuthorizedByPageComponent },
  { path: '**', redirectTo: '' }
];
