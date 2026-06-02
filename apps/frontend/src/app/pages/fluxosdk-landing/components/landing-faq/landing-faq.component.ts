import { Component } from '@angular/core';

interface FaqItem {
  question: string;
  answer: string;
}

@Component({
  selector: 'app-fluxosdk-landing-faq',
  standalone: true,
  templateUrl: './landing-faq.component.html',
  styleUrl: './landing-faq.component.scss',
})
export class FluxosdkLandingFaqComponent {
  readonly faqs: FaqItem[] = [
    {
      question: 'O FluxoSDK substitui Google Analytics?',
      answer:
        'Ele complementa ferramentas de volume. O foco e explicar friccao: cliques, erros, sessoes e pontos onde o usuario trava.',
    },
    {
      question: 'Preciso configurar eventos manualmente?',
      answer:
        'Voce pode enviar eventos customizados, mas o SDK ja captura sinais essenciais como page views, cliques e erros do navegador.',
    },
    {
      question: 'O SDK pesa no front-end?',
      answer:
        'A proposta e manter um payload enxuto, com coleta seletiva e sem dependencias pesadas no cliente.',
    },
    {
      question: 'Da para monitorar varios sites?',
      answer:
        'Sim. Os planos pagos separam dominios e ambientes para que staging, producao e demos nao contaminem a analise.',
    },
    {
      question: 'Como a privacidade e tratada?',
      answer:
        'O produto prioriza eventos comportamentais e metadados tecnicos, sem depender de cookies invasivos para gerar insight.',
    },
    {
      question: 'Qual e o melhor primeiro uso?',
      answer:
        'Comece por uma tela critica, como pricing, cadastro ou checkout, e acompanhe rage clicks, dead clicks e erros JS por sessao.',
    },
  ];
}
