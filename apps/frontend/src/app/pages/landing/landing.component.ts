import {
  Component,
  OnDestroy,
  OnInit,
  inject,
  NgZone,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

type LiveEventKind = 'page_view' | 'click' | 'dom_mutation';

interface LiveEventItem {
  id: string;
  kind: LiveEventKind;
  label: string;
  meta: string;
  when: string;
  isNew?: boolean;
}

interface KpiItem {
  value: string;
  trend: string;
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
})
export class LandingComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private readonly zone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);

  currentYear = new Date().getFullYear();

  // Phone mock dynamics
  activeKpiIndex = 0;
  kpis: KpiItem[] = [
    { value: '12.4k', trend: '+18%/sem' },
    { value: '1.2k', trend: '+7%/sem' },
    { value: '2m 14s', trend: '-9% bounce' },
  ];

  featuredEvent = {
    title: 'Clique em “Começar agora”',
    path: '/landing',
    time: 'agora',
  };

  liveEvents: LiveEventItem[] = [
    {
      id: 'e1',
      kind: 'page_view',
      label: 'Page view',
      meta: '/landing',
      when: 'agora',
    },
    {
      id: 'e2',
      kind: 'click',
      label: 'Clique',
      meta: 'button#start',
      when: '1m',
    },
    {
      id: 'e3',
      kind: 'dom_mutation',
      label: 'DOM mutation',
      meta: 'section#pricing',
      when: '4m',
    },
  ];

  private intervalId: number | null = null;
  // faster reveal, but still lightweight and paused during interaction
  private readonly demoTickMs = 1200;

  ngOnInit() {
    setTimeout(() => this.checkScrollReveal(), 100);

    // quick first update so the phone doesn't feel "stuck" on load
    window.setTimeout(() => {
      this.tickPhoneDemo();
    }, 220);

    // autonomous demo loop (doesn't depend on user interaction)
    // Ensure updates always trigger UI refresh (some build setups can run timers outside Angular).
    this.zone.runOutsideAngular(() => {
      this.intervalId = window.setInterval(() => {
        this.zone.run(() => {
          this.tickPhoneDemo();
          this.cdr.markForCheck();
        });
      }, this.demoTickMs);
    });
  }

  ngOnDestroy() {
    if (this.intervalId) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  goToLogin() {
    this.router.navigate(['/auth']);
  }

  checkScrollReveal() {
    const reveals = document.querySelectorAll('.reveal-on-scroll');
    const windowHeight = window.innerHeight;
    for (let i = 0; i < reveals.length; i++) {
      const elementTop = reveals[i].getBoundingClientRect().top;
      const elementVisible = 50;

      if (elementTop < windowHeight - elementVisible) {
        reveals[i].classList.add('is-visible');
      }
    }
  }

  private tickPhoneDemo() {
    // rotate KPI highlight
    this.activeKpiIndex = (this.activeKpiIndex + 1) % this.kpis.length;

    // simulate live event stream
    const next = this.generateEvent();
    this.liveEvents = [
      { ...next, isNew: true },
      ...this.liveEvents.map((e) => ({ ...e, isNew: false })),
    ].slice(0, 4);

    this.featuredEvent = {
      title: next.label + ' • ' + next.meta,
      path: next.meta.startsWith('/') ? next.meta : '/dashboard',
      time: 'agora',
    };

    // slightly animate numbers (string swap)
    if (this.activeKpiIndex === 0) this.kpis[0] = this.bumpKpi(this.kpis[0]);
    if (this.activeKpiIndex === 1) this.kpis[1] = this.bumpKpi(this.kpis[1]);
  }

  private bumpKpi(kpi: KpiItem): KpiItem {
    // tiny deterministic-ish variation
    const n = Math.floor(Math.random() * 9) + 1;
    if (kpi.value.includes('k')) {
      const base = parseFloat(kpi.value.replace('k', ''));
      const next = (base + n / 100).toFixed(2);
      return { ...kpi, value: `${next}k` };
    }
    if (kpi.value.includes('m')) return kpi;
    return kpi;
  }

  private generateEvent(): LiveEventItem {
    const kinds: LiveEventKind[] = ['page_view', 'click', 'dom_mutation'];
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    const id = `e_${Date.now()}_${Math.random().toString(16).slice(2)}`;

    const pagePaths = ['/landing', '/dashboard', '/pricing', '/auth'];
    const pick = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

    if (kind === 'page_view') {
      return {
        id,
        kind,
        label: 'Page view',
        meta: pick(pagePaths),
        when: 'agora',
      };
    }

    if (kind === 'click') {
      const targets = [
        'button#start',
        'a#github',
        'select#sites',
        'button#logout',
      ];
      return { id, kind, label: 'Clique', meta: pick(targets), when: 'agora' };
    }

    const muts = [
      'section#kpis',
      'div.timeline',
      'aside.sidebar',
      'card.metric',
    ];
    return { id, kind, label: 'DOM mutation', meta: pick(muts), when: 'agora' };
  }
}
