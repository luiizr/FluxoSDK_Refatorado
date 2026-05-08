import { CommonModule } from '@angular/common';
import { Component, OnInit, AfterViewInit, ElementRef, Renderer2 } from '@angular/core';

@Component({
  selector: 'app-fluxosdk-landing',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './fluxosdk-landing.component.html',
  styleUrls: ['./fluxosdk-landing.component.scss'],
})
export class FluxosdkLandingComponent implements OnInit, AfterViewInit {
  conversionRate = 0;
  rageClicks = 0;
  deadClicks = 0;
  jsErrors = 0;
  activeSite = 'Produção (app.exemplo.com)';
  
  private metricsInterval: any;

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  ngOnInit() {
    this.simulateMetrics();
  }

  ngAfterViewInit() {
    this.setupScrollAnimations();
  }

  private setupScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.renderer.addClass(entry.target, 'is-revealed');
          // observer.unobserve(entry.target); // Optional: animate only once
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    const elements = this.el.nativeElement.querySelectorAll('.reveal-on-scroll');
    elements.forEach((el: HTMLElement) => observer.observe(el));
  }

  private simulateMetrics() {
    // Reset and grow metrics periodically to look "alive"
    this.metricsInterval = setInterval(() => {
      if (this.conversionRate < 24.8) {
        this.conversionRate += 0.4;
      } else {
        this.conversionRate = 21.2;
      }

      this.rageClicks = Math.floor(Math.random() * 5) + 8;
      this.deadClicks = Math.floor(Math.random() * 3) + 5;
      this.jsErrors = Math.floor(Math.random() * 2) + 2;
    }, 3000);
  }

  toggleSite() {
    this.activeSite = this.activeSite.includes('Produção') 
      ? 'Staging (beta.exemplo.com)' 
      : 'Produção (app.exemplo.com)';
  }
}
