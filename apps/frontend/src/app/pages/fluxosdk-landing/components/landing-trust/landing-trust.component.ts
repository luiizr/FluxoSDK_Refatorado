import { Component } from '@angular/core';

interface TrustItem {
  label: string;
  value: string;
}

@Component({
  selector: 'app-fluxosdk-landing-trust',
  standalone: true,
  templateUrl: './landing-trust.component.html',
  styleUrl: './landing-trust.component.scss',
})
export class FluxosdkLandingTrustComponent {
  readonly items: TrustItem[] = [
    { label: 'Eventos rastreados', value: 'page view' },
    { label: 'Interacoes', value: 'cliques' },
    { label: 'Saude tecnica', value: 'erros JS' },
    { label: 'UX invisivel', value: 'rage clicks' },
  ];
}
