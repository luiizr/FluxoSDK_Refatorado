import { Component } from '@angular/core';

interface StepItem {
  step: string;
  title: string;
  description: string;
}

@Component({
  selector: 'app-fluxosdk-landing-workflow',
  standalone: true,
  templateUrl: './landing-workflow.component.html',
  styleUrl: './landing-workflow.component.scss',
})
export class FluxosdkLandingWorkflowComponent {
  readonly steps: StepItem[] = [
    {
      step: '01',
      title: 'Cole o snippet',
      description:
        'Adicione o SDK uma vez no front-end e associe o site ao projeto certo.',
    },
    {
      step: '02',
      title: 'Capture sinais reais',
      description:
        'Page views, cliques, mutacoes, erros e metadados chegam em tempo real.',
    },
    {
      step: '03',
      title: 'Priorize a correcao',
      description:
        'A timeline revela o impacto de cada friccao para o time agir com foco.',
    },
  ];
}
