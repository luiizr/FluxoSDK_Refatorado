import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DashboardNavSectionComponent } from '../dashboard-nav-section/dashboard-nav-section.component';
import { CurrentUser, DashboardTab, NavItem } from '../../dashboard.types';

@Component({
  selector: 'app-dashboard-sidebar',
  standalone: true,
  imports: [CommonModule, DashboardNavSectionComponent],
  templateUrl: './dashboard-sidebar.component.html',
  styleUrl: './dashboard-sidebar.component.scss',
})
export class DashboardSidebarComponent {
  @Input({ required: true }) activeTab: DashboardTab = 'overview';
  @Input({ required: true }) currentUser!: CurrentUser;

  @Output() tabChange = new EventEmitter<DashboardTab>();
  @Output() logout = new EventEmitter<void>();

  readonly mainItems: NavItem[] = [
    { tab: 'overview', label: 'Dashboard', icon: '⌂' },
    { tab: 'logs', label: 'Eventos', icon: '≡' },
    { tab: 'sessions', label: 'Sessões', icon: '◷' },
    { tab: 'kpis', label: 'KPIs', icon: '#' },
    { tab: 'admin', label: 'Admin', icon: '◎', requiresRoot: true },
  ];

  readonly settingsItems: NavItem[] = [{ tab: 'settings', label: 'Sites', icon: '◇' }];
}

