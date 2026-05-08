# FluxoSDK 🚀

<!-- [![CI](https://github.com/luiizr/FluxoSDK_Refatorado/actions/workflows/ci.yml/badge.svg)](https://github.com/luiizr/FluxoSDK_Refatorado/actions/workflows/ci.yml) -->
[![Nx](https://img.shields.io/badge/nx-monorepo-blue?style=flat-square)](https://nx.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Nota:** Este projeto é fruto de um Trabalho de Conclusão de Curso (TCC) e encontra-se atualmente em fase de desenvolvimento.

FluxoSDK é uma solução robusta de monitoramento comportamental e analytics, projetada para capturar, processar e visualizar interações de usuários em tempo real através de um SDK integrável.

## 📌 Visão Geral

O ecossistema FluxoSDK é composto por três frentes principais:
1.  **Backend (API):** Desenvolvido em Node.js com Express, responsável pelo processamento de eventos, gerenciamento de sessões e persistência de dados em PostgreSQL.
2.  **Frontend (Dashboard):** Uma interface administrativa em Angular para visualização de métricas e gestão de sites monitorados.
3.  **SDK (Client):** Script otimizado para ser embarcado em sites clientes, capturando eventos de forma leve e eficiente.

## 🛠️ Tecnologias Utilizadas

- **Monorepo:** [Nx](https://nx.dev)
- **Frontend:** [Angular 21](https://angular.io/)
- **Backend:** [Node.js](https://nodejs.org/) & [Express](https://expressjs.com/)
- **Banco de Dados:** [PostgreSQL](https://www.postgresql.org/)
- **Testes:** [Jest](https://jestjs.io/) & [Playwright](https://playwright.dev/)
- **Linter:** [ESLint](https://eslint.org/)
- **Pipeline:** GitHub Actions

## 🚀 Como Começar

### Pré-requisitos
- Node.js (v20 ou superior)
- npm ou yarn
- Docker (opcional, para o banco de dados)

### Instalação
1. Clone o repositório:
   ```bash
   git clone https://github.com/luiizr/FluxoSDK_Refatorado.git
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```


### Desenvolvimento
Para rodar todos os serviços simultaneamente em modo de desenvolvimento:
```bash
npm run dev
```

Ou individualmente via Nx:
```bash
npx nx serve backend
npx nx serve frontend
npx nx serve example-client
```

## 🏗️ Estrutura do Projeto

```text
apps/
├── backend/        # API REST e lógica de negócios
├── frontend/       # Dashboard administrativo (Angular)
└── example-client/ # Exemplo de integração do SDK
docs/               # Documentação detalhada do projeto (em desenvolvimento)
```

## ⚖️ LGPD e Privacidade

O **FluxoSDK** foi projetado com os princípios de *Privacy by Design* em mente, visando a conformidade com a **Lei Geral de Proteção de Dados (LGPD)**.

-   **Anonimização:** Por padrão, a coleta de dados é focada em eventos comportamentais. Identificadores de usuários são tratados de forma segura.
-   **Transparência:** O SDK permite que os sites integradores informem claramente quais eventos estão sendo monitorados.
-   **Controle de Dados:** Estrutura preparada para suportar requisições de exclusão e portabilidade de dados capturados durante as sessões.

## 📄 Documentação

A documentação técnica detalhada, incluindo especificações da API, guias de integração do SDK e diagramas de arquitetura, está sendo centralizada na pasta:

👉 [**/docs**](./docs) *(Em desenvolvimento)*

---

<!-- └── backend-e2e/    # Testes de ponta a ponta -->

<!-- ## 🧪 Testes e Qualidade

O projeto preza pela qualidade e consistência do código.

- **Linting:** `npx nx run-many -t lint`
- **Unit Tests:** `npx nx run-many -t test`
- **E2E Tests:** `npx nx run-many -t e2e` -->
<!-- 
## 📈 Roadmap

- [x] Arquitetura base com Nx Monorepo.
- [x] Coleta básica de eventos (SDK -> Backend).
- [x] Dashboard administrativo inicial.
- [ ] Implementação de filtros avançados no Dashboard.
- [ ] Otimização de performance para grandes volumes de dados.
- [ ] Documentação completa da API. -->

---

Desenvolvido por Luiz Roberto da Silva como parte do TCC em Análise e Desenvolvimento de Sistemas pelo Instituto Federal de Educação, Ciência e Tecnologia do Rio Grande do Norte (IFRN).