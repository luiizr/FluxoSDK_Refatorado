import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

interface HeroMetric {
  label: string;
  value: string;
  detail: string;
  tone: 'accent' | 'blue' | 'amber' | 'danger';
}

interface LiveSignal {
  title: string;
  meta: string;
  status: string;
}

@Component({
  selector: 'app-fluxosdk-landing-hero',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './landing-hero.component.html',
  styleUrl: './landing-hero.component.scss',
})
export class FluxosdkLandingHeroComponent implements OnInit, OnDestroy {
  activeSignalIndex = 0;

  readonly metricSets: HeroMetric[][] = [
    [
      {
        label: 'Eventos hoje',
        value: '24.8k',
        detail: '+18% em 7 dias',
        tone: 'accent',
      },
      {
        label: 'Rage clicks',
        value: '13',
        detail: 'checkout',
        tone: 'danger',
      },
      {
        label: 'Tempo ate insight',
        value: '2.4s',
        detail: 'tempo real',
        tone: 'blue',
      },
    ],
    [
      {
        label: 'Eventos hoje',
        value: '31.2k',
        detail: '+24% em 7 dias',
        tone: 'accent',
      },
      {
        label: 'Dead clicks',
        value: '8',
        detail: 'pricing',
        tone: 'amber',
      },
      {
        label: 'Erros JS',
        value: '4',
        detail: 'alta prioridade',
        tone: 'danger',
      },
    ],
    [
      {
        label: 'Conversao',
        value: '98.7%',
        detail: 'checkout saudavel',
        tone: 'accent',
      },
      {
        label: 'Sessoes ativas',
        value: '1.9k',
        detail: 'ao vivo',
        tone: 'blue',
      },
      {
        label: 'Alertas',
        value: '2',
        detail: 'em investigacao',
        tone: 'amber',
      },
    ],
  ];

  readonly liveSignals: LiveSignal[] = [
    {
      title: 'Rage click detectado',
      meta: 'button#finalizar-compra',
      status: 'critico',
    },
    {
      title: 'Erro JS agrupado',
      meta: 'TypeError em /checkout',
      status: 'novo',
    },
    {
      title: 'Funil recuperado',
      meta: 'lead -> trial -> ativo',
      status: 'ok',
    },
  ];

  metrics = this.metricSets[0];
  private intervalId: number | null = null;

  ngOnInit(): void {
    this.intervalId = window.setInterval(() => {
      this.activeSignalIndex =
        (this.activeSignalIndex + 1) % this.liveSignals.length;
      this.metrics = this.metricSets[this.activeSignalIndex];
    }, 2200);
  }

  ngOnDestroy(): void {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
