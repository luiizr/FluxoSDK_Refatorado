import { Component } from '@angular/core';

interface FeatureItem {
  title: string;
  description: string;
  badge: string;
  tone: 'green' | 'blue' | 'amber' | 'violet';
}

@Component({
  selector: 'app-fluxosdk-landing-features',
  standalone: true,
  templateUrl: './landing-features.component.html',
  styleUrl: './landing-features.component.scss',
})
export class FluxosdkLandingFeaturesComponent {
  readonly features: FeatureItem[] = [
    {
      title: 'Rage e dead clicks',
      description:
        'Detecte cliques repetidos, elementos sem resposta e pontos da tela que geram frustracao.',
      badge: 'UX',
      tone: 'green',
    },
    {
      title: 'Timeline por sessao',
      description:
        'Veja page views, cliques e mutacoes de DOM na ordem exata em que aconteceram.',
      badge: 'Contexto',
      tone: 'blue',
    },
    {
      title: 'Erros JS agrupados',
      description:
        'Transforme excecoes do navegador em cards priorizados com pagina, seletor e impacto.',
      badge: 'Runtime',
      tone: 'amber',
    },
    {
      title: 'Multi-site',
      description:
        'Separe ambientes, dominios e produtos sem misturar dados de producao, staging e demos.',
      badge: 'Operacao',
      tone: 'violet',
    },
    {
      title: 'Funis sem configuracao pesada',
      description:
        'Acompanhe jornadas comuns sem depender de uma taxonomia gigante antes do primeiro insight.',
      badge: 'Growth',
      tone: 'green',
    },
    {
      title: 'Privacidade como base',
      description:
        'Capture sinais comportamentais sem cookies invasivos e com payloads enxutos.',
      badge: 'Trust',
      tone: 'blue',
    },
  ];
}
