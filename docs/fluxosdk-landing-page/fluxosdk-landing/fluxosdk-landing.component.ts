import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-fluxosdk-landing',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './fluxosdk-landing.component.html',
  styleUrls: ['./fluxosdk-landing.component.scss'],
})
export class FluxosdkLandingComponent {
  readonly stats = [
    { label: 'Eventos hoje', value: '12.847', delta: '+18%' },
    { label: 'Sessões', value: '3.291', delta: '+9%' },
    { label: 'Erros JS', value: '24', delta: '-12%' },
  ];

  readonly events = [
    { type: 'page_view', detail: '/dashboard', time: 'agora' },
    { type: 'click', detail: 'botão criar projeto', time: '2s' },
    { type: 'form_submit', detail: 'cadastro', time: '5s' },
    { type: 'js_error', detail: 'checkout.component.ts', time: '9s' },
  ];

  readonly features = [
    {
      title: 'Eventos reais do sistema',
      description:
        'Capture cliques, navegação, formulários, erros e ações importantes sem transformar seu produto em um painel confuso.',
    },
    {
      title: 'Instalação por chave de site',
      description:
        'Cada projeto recebe uma chave própria para conectar o SDK, validar o envio e separar ambientes com segurança.',
    },
    {
      title: 'Dashboard para decisão',
      description:
        'Veja sessões, eventos, erros e sinais de uso em uma interface feita para indicar o que merece atenção.',
    },
    {
      title: 'Base para evoluir produto',
      description:
        'Transforme dados de uso em melhorias concretas de UX, performance, estabilidade e retenção.',
    },
  ];

  readonly steps = [
    'Crie seu projeto',
    'Copie a chave do site',
    'Instale o SDK',
    'Receba o primeiro evento',
  ];
}
