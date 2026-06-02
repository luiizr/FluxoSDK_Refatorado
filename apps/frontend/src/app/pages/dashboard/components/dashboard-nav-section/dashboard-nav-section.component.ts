import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DashboardTab, NavItem } from '../../dashboard.types';

@Component({
  selector: 'app-dashboard-nav-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-nav-section.component.html',
  styleUrl: './dashboard-nav-section.component.scss',
})
export class DashboardNavSectionComponent {
  @Input({ required: true }) title = '';
  @Input({ required: true }) items: NavItem[] = [];
  @Input() activeTab: DashboardTab = 'overview';
  @Input() isRoot = false;

  @Output() tabChange = new EventEmitter<DashboardTab>();

  selectTab(tab: DashboardTab) {
    this.tabChange.emit(tab);
  }
}

