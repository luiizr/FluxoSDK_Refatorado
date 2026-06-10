import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SessionService, BrowserSession } from '../../../services/session.service';
import rrwebPlayer from 'rrweb-player';

@Component({
  selector: 'app-dashboard-sessions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sessions.component.html',
  styleUrl: '../dashboard-page.shared.scss',
})
export class SessionsComponent implements OnInit {
  sessions: BrowserSession[] = [];
  selectedSessionEvents: any[] | null = null;
  loadingPlayback = false;

  @ViewChild('playerContainer') playerContainer!: ElementRef;

  constructor(private sessionService: SessionService) {}

  async ngOnInit() {
    await this.loadSessions();
  }

  async loadSessions() {
    this.sessions = await this.sessionService.list();
  }

  async playSession(sessionId: string) {
    this.loadingPlayback = true;
    try {
      this.selectedSessionEvents = await this.sessionService.getEvents(sessionId);
      
      // Pequeno delay para garantir que o container do player apareça no DOM
      setTimeout(() => {
        if (this.playerContainer && this.selectedSessionEvents) {
          // Limpar container anterior
          this.playerContainer.nativeElement.innerHTML = '';
          
          new rrwebPlayer({
            target: this.playerContainer.nativeElement,
            props: {
              events: this.selectedSessionEvents,
              width: 800,
              height: 450,
              autoPlay: true,
            },
          });
        }
      }, 100);
    } catch (err) {
      alert('Erro ao carregar gravação');
    } finally {
      this.loadingPlayback = false;
    }
  }

  closePlayback() {
    this.selectedSessionEvents = null;
    if (this.playerContainer) {
      this.playerContainer.nativeElement.innerHTML = '';
    }
  }

  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  }
}
