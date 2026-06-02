import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CurrentUser, Site } from '../../dashboard.types';

@Component({
  selector: 'app-dashboard-topbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard-topbar.component.html',
  styleUrl: './dashboard-topbar.component.scss',
})
export class DashboardTopbarComponent {
  @Input({ required: true }) sites: Site[] = [];
  @Input({ required: true }) selectedSiteKey = '';
  @Input({ required: true }) currentUser!: CurrentUser;

  @Output() selectedSiteKeyChange = new EventEmitter<string>();

  onSiteChange(value: string) {
    this.selectedSiteKeyChange.emit(value);
  }
}

