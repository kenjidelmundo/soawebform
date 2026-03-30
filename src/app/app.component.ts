import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import {
  BadgeComponent,
  ButtonDirective,
  ContainerComponent,
  NavComponent,
  NavItemComponent,
  NavLinkDirective,
  SidebarBrandComponent,
  SidebarComponent,
  SidebarHeaderComponent,
} from '@coreui/angular';
import { IconComponent } from '@coreui/icons-angular';
import {
  cilCalculator,
  cilMenu,
  cilPeople,
  cilSpeedometer,
} from '@coreui/icons';

@Component({
    selector: 'app-root',
    imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    ContainerComponent,
    SidebarComponent,
    SidebarHeaderComponent,
    SidebarBrandComponent,
    NavComponent,
    NavItemComponent,
    NavLinkDirective,
    ButtonDirective,
    BadgeComponent,
    IconComponent
],
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css']
})
export class AppComponent {
  sidebarVisible = true;

  readonly navItems = [
    {
      label: 'Dashboard',
      caption: 'Statement of Account',
      route: '/',
      exact: true,
      icon: cilSpeedometer,
    },
    {
      label: 'Assessment Workspace',
      caption: 'Fees and computations',
      route: '/',
      exact: true,
      icon: cilCalculator,
    },
    {
      label: 'Authorized By',
      caption: 'Team and credits',
      route: '/authorized-by',
      exact: false,
      icon: cilPeople,
    },
  ];

  readonly icons = {
    menu: cilMenu,
  };

  toggleSidebar(): void {
    this.sidebarVisible = !this.sidebarVisible;
  }

  closeSidebarOnMobile(): void {
    if (typeof window !== 'undefined' && window.innerWidth < 992) {
      this.sidebarVisible = false;
    }
  }
}
