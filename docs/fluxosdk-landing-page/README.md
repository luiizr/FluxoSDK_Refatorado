# FluxoSDK Landing Page Component

Componente Angular standalone para a landing page do FluxoSDK.

## Arquivos

- `fluxosdk-landing.component.ts`
- `fluxosdk-landing.component.html`
- `fluxosdk-landing.component.scss`

## Como usar

Copie a pasta `fluxosdk-landing` para o seu projeto Angular, por exemplo:

```txt
apps/frontend/src/app/pages/fluxosdk-landing/
```

Depois importe o componente na rota desejada:

```ts
import { FluxosdkLandingComponent } from './pages/fluxosdk-landing/fluxosdk-landing.component';

export const routes: Routes = [
  {
    path: '',
    component: FluxosdkLandingComponent,
  },
];
```

## Observações

- O componente é standalone.
- Não usa bibliotecas externas.
- Inclui uma animação em CSS simulando o cursor copiando a chave do site e o dashboard recebendo dados.
- A paleta evita azul como cor principal e usa grafite, bege, âmbar e verde discreto.
