import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SiteService, Site } from '../../../services/site.service';

@Component({
  selector: 'app-dashboard-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrl: '../dashboard-page.shared.scss',
})
export class SettingsComponent implements OnInit {
  sites: Site[] = [];
  newName = '';
  newDomain = '';
  selectedSnippet: string | null = null;

  constructor(private siteService: SiteService) {}

  async ngOnInit() {
    await this.loadSites();
  }

  async loadSites() {
    this.sites = await this.siteService.list();
  }

  async createSite() {
    if (!this.newName || !this.newDomain) return;
    try {
      await this.siteService.create(this.newName, this.newDomain);
      this.newName = '';
      this.newDomain = '';
      await this.loadSites();
    } catch (err) {
      alert('Erro ao criar site');
    }
  }

  async viewSnippet(siteId: string) {
    try {
      const { snippet } = await this.siteService.getSnippet(siteId);
      this.selectedSnippet = snippet;
    } catch (err) {
      alert('Erro ao buscar snippet');
    }
  }

  closeModal() {
    this.selectedSnippet = null;
  }
}
