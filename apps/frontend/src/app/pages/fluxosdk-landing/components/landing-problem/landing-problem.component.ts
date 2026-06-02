import { Component } from '@angular/core';

interface ProblemCard {
  title: string;
  description: string;
  accent: string;
}

@Component({
  selector: 'app-fluxosdk-landing-problem',
  standalone: true,
  templateUrl: './landing-problem.component.html',
  styleUrl: './landing-problem.component.scss',
})
export class FluxosdkLandingProblemComponent {
  readonly cards: ProblemCard[] = [
    {
      title: 'Metricas sem causa',
      description:
        'Voce sabe que a conversao caiu, mas nao ve o clique, a tela ou o erro que iniciou o abandono.',
      accent: 'dados',
    },
    {
      title: 'Erros silenciosos',
      description:
        'Falhas de JavaScript acontecem no navegador do usuario e chegam tarde demais para o time tecnico.',
      accent: 'runtime',
    },
    {
      title: 'Ferramentas dispersas',
      description:
        'Produto olha funil, engenharia olha logs, growth olha campanha. O contexto se perde entre as abas.',
      accent: 'silos',
    },
  ];
}
