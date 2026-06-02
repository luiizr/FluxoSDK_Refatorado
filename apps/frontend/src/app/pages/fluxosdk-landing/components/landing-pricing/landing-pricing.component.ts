import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface PricingPlan {
  name: string;
  description: string;
  price: string;
  period: string;
  cta: string;
  featured: boolean;
  features: string[];
}

@Component({
  selector: 'app-fluxosdk-landing-pricing',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './landing-pricing.component.html',
  styleUrl: './landing-pricing.component.scss',
})
export class FluxosdkLandingPricingComponent {
  readonly plans: PricingPlan[] = [
    {
      name: 'Starter',
      description: 'Para validar instrumentacao em um produto pequeno.',
      price: 'R$ 0',
      period: '/mes',
      cta: 'Comecar gratis',
      featured: false,
      features: [
        '5.000 eventos por mes',
        '1 site monitorado',
        'Timeline de sessoes',
        'Rage e dead clicks',
      ],
    },
    {
      name: 'Pro',
      description: 'Para squads que precisam priorizar conversao toda semana.',
      price: 'R$ 149',
      period: '/mes',
      cta: 'Ativar Pro',
      featured: true,
      features: [
        '100.000 eventos por mes',
        'Sites ilimitados',
        'Erros JS agrupados',
        'Alertas de friccao',
        'Retencao de dados ampliada',
      ],
    },
    {
      name: 'Scale',
      description: 'Para operacoes com alto volume e governanca avancada.',
      price: 'Custom',
      period: '',
      cta: 'Falar com vendas',
      featured: false,
      features: [
        'Eventos sob demanda',
        'SLA e suporte prioritario',
        'Ambientes dedicados',
        'Onboarding tecnico',
      ],
    },
  ];
}
