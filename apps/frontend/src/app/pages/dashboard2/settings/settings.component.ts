import { Component, OnInit, signal, inject } from '@angular/core';
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
  private siteService = inject(SiteService);

  sites = signal<Site[]>([]);
  newName = signal('');
  newDomain = signal('');
  selectedSnippet = signal<string | null>(null);
  selectedSiteForConfig = signal<Site | null>(null);
  isLoading = signal(false);

  async ngOnInit() {
    await this.loadSites();
  }

  async loadSites() {
    try {
      const data = await this.siteService.list();
      this.sites.set(data);
    } catch (err) {
      console.error('Erro ao carregar sites', err);
    }
  }

  async createSite() {
    const name = this.newName();
    const domain = this.newDomain();

    if (!name || !domain) return;

    this.isLoading.set(true);
    try {
      await this.siteService.create(name, domain);
      this.newName.set('');
      this.newDomain.set('');
      await this.loadSites();
    } catch (err) {
      alert('Erro ao criar site');
    } finally {
      this.isLoading.set(false);
    }
  }

  async viewSnippet(siteId: string) {
    try {
      const { snippet } = await this.siteService.getSnippet(siteId);
      this.selectedSnippet.set(snippet);
    } catch (err) {
      alert('Erro ao buscar snippet');
    }
  }

  openSettings(site: Site) {
    // Clonar para evitar mutação direta antes de salvar
    this.selectedSiteForConfig.set(JSON.parse(JSON.stringify(site)));
  }

  async saveSettings() {
    const site = this.selectedSiteForConfig();
    if (!site || !site.settings) return;

    this.isLoading.set(true);
    try {
      await this.siteService.updateSettings(site.id, site.settings);
      this.selectedSiteForConfig.set(null);
      await this.loadSites();
    } catch (err) {
      alert('Erro ao salvar configurações');
    } finally {
      this.isLoading.set(false);
    }
  }

  closeModal() {
    this.selectedSnippet.set(null);
    this.selectedSiteForConfig.set(null);
  }
}
