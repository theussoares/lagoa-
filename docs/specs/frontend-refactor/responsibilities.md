# Refatoração do front — responsabilidades

Refatoração sem mudança de comportamento: nenhuma tela, texto ou regra muda.
Não passa pelo Product Owner (não há regra nova); entra direto no Arquiteto.
Caminhos relativos a `apps/web/`.

## 1. Diagnóstico (2026-10-02)

| Problema | Evidência |
| --- | --- |
| Páginas fazendo lógica | `merchant/pages/counter.vue` 145 linhas de script (29 `computed`/`watch`/funções), `customer/pages/check-in.vue` 142, `merchant/pages/club-setup.vue` 101. Páginas montam erro→mensagem, formatam data/moeda, controlam foco, teclado, vibração, câmera e redirecionamento. |
| Páginas desenhando em vez de compor | `counter.vue` 185 linhas de template, `check-in.vue` 119, `club-setup.vue` 107, `discover.vue` 103, `campaigns.vue` 84. Blocos inteiros de tela inline no lugar de componentes. |
| Montagem de `labels` na página | 23 objetos/computeds de rótulo em `counter.vue`, 21 em `club-setup.vue`; cada componente recebe um objeto de textos montado com `t()` na página. |
| Tipos misturados | ~140 declarações `type`/`interface` dentro de `utils/`, `services/`, `composables/` e no próprio `.vue` (ex.: `BirthdayForm.vue` exporta `BirthdayFormLabels`/`BirthdayAction`; `EarnFields.vue`, `CardStack.vue`, `PosterStep.vue` idem). Só `layers/ui/app/types/` segue o padrão. |
| `utils/*Model.ts` virou camada sem nome | 22 arquivos de view-model espalhados (`counterModels`, `checkInModel`, `programFormLabels`…) misturando tipo, formatação, i18n e regra de tela. |
| Browser API na página | `window.confirm`, `window.print`, `beforeunload` em `program.vue` e `club-setup.vue`. |
| Componente de superfície em `layers/ui` | `CounterLedger`, `CustomerTable`, `LaunchReceipt`, `CheckInPoster` (+ `ui/types/counter.ts`, `customers.ts`) são do lojista, não do design system. |
| Pastas de componente sem padrão | `merchant/components/` agrupado por tela; `customer/components/` plano. |
| Sem teste de componente | `layers/*/test` só cobre models/services; nenhum `.vue` testado. |
| Stores quase inexistentes | Só `session` e `clubSetup`; o resto do estado vive em composables (`useAsyncResult`) — precisa de decisão explícita, não de acaso. |

## 2. Regras-alvo (Definition of Done de cada arquivo)

1. **Página = rota + composição.** Só `definePageMeta`, `useHead`, uma chamada
   a um composable de tela (`useCounterScreen()`) e o template com
   componentes. Meta: script ≤ 30 linhas, template ≤ 60, nenhuma função de
   regra, formatação ou foco.
2. **Componente com script mínimo.** `defineProps`/`defineEmits` + estado de
   UI local trivial. Derivação, formatação e mapeamento de erro saem para
   composable ou função pura em `utils/`.
3. **Template > ~80 linhas → quebrar** em subcomponentes por bloco de tela
   (`counter/LaunchPanel.vue`, `counter/RedemptionPanel.vue`…).
4. **Tipos em arquivo próprio.** `layers/<layer>/app/types/<dominio>.ts`
   para props, labels, view-models e estados de tela. Tipos de domínio
   continuam em `shared/schemas` (`z.infer`). Fora de `types/` nenhum
   `export interface`/`export type`. Exceções: `interface Props`/`Emits`
   locais (não exportadas) no `.vue`; a `interface` do service e as uniões
   de erro da sua assinatura ficam no arquivo do service (é o contrato).
5. **Textos.** Componente de superfície recebe dado e chama `$t()` com chave
   em inglês do próprio domínio; objeto `labels` montado na página só para
   componentes de `layers/ui` (que não conhecem domínio).
6. **Browser API** (`window`, foco, vibração, câmera, print, beforeunload)
   só em composable dedicado (`useLeaveGuard`, `usePrint`, `useHaptics`).
7. **Pastas:** `components/<tela>/` nas layers de superfície; `layers/ui` só
   com o que é design system sem domínio de uma superfície.

## 3. Responsabilidades por agente

### Arquiteto (`arquiteto`) — primeiro, sozinho
- Produz `docs/specs/frontend-refactor/solution-design.md` com, por página:
  o composable de tela, a árvore de componentes, os arquivos de `types/` e o
  destino de cada `utils/*Model.ts` (composable de tela, `utils/` puro ou
  `shared/`).
- Decide os 3 pontos em aberto: (a) `labels` vs `$t()` direto nos
  componentes de superfície; (b) o que sai de `layers/ui` para
  `merchant/customer`; (c) quando estado vira store Pinia e quando fica em
  composable.
- Define os limites numéricos da seção 2 como regra do `CLAUDE.md`.

### CTO (`cto`)
- Aprova o solution-design (risco: quebra de fluxo crítico, acoplamento
  entre layers, regressão de LGPD em `PhoneDisplay`/listas).

### Engenheiro (`engenheiro`)
- Quebra por **página** (cada página = 1 subtarefa vertical) e nas ondas
  abaixo; garante que cada PR não muda comportamento (testes verdes antes e
  depois, mesmas chaves i18n).
- Roda até 3 `dev-nuxt` em paralelo, um worktree por página; integra e
  manda para revisão.

### Dev de Tipos (`dev-tipos`) — onda 1
- Cria `layers/{core,customer,merchant}/app/types/` e move todas as
  declarações de `utils/`, `composables/`, `services/` (exceto a interface
  do service) e dos `.vue` para lá.
- Tira tipo de domínio duplicado que já existe em `shared/schemas`.
- Só move e reexporta; não muda assinatura.

### Dev de UI (`dev-ui`) — onda 1, em paralelo
- Move para a layer da superfície os componentes de `layers/ui` que são de
  um domínio só (decisão do Arquiteto) junto com seus tipos.
- Quebra componentes de `layers/ui` com template grande (`RedemptionTicket`
  71, `ShopCard` 69) e extrai a lógica de script de `PhoneDisplay`,
  `RedemptionStub`, `CardStack`.
- Cria os composables de browser compartilhados (`useLeaveGuard`,
  `usePrint`, `useHaptics`) em `layers/core` se o Arquiteto mandar.

### Dev de Stores (`dev-stores`) — onda 2 (subtarefa S1 do solution-design)
- **Nenhum store Pinia novo** (decisão do CTO). `useSessionStore` (sessões +
  `shopStatus`) e `useClubSetupStore` ficam como estão; caderneta, lançamento
  e resgate do Balcão continuam em composable (o celular digitado não entra
  em store).
- Tira de `core/stores/session.ts` a leitura de `window` na criação
  (`import.meta.client`), com saída idêntica no SPA.
- Centraliza o tratamento "erro `unauthorized` → sair / loja fechada →
  refresh" em `useMerchantSessionGuard` e `useCustomerSessionGuard`, com
  testes de paridade. Loja fechada atualiza a situação da loja **só no
  Balcão**, como hoje; estender ao painel inteiro é tarefa separada.

### Dev Nuxt (`dev-nuxt`, 1–3 em paralelo) — onda 2
Uma página por subtarefa, nesta ordem de prioridade (pior primeiro):

| Lote | Páginas |
| --- | --- |
| A | `merchant/counter.vue`, `customer/check-in.vue`, `merchant/club-setup.vue` |
| B | `customer/discover.vue`, `merchant/campaigns.vue`, `merchant/merchant-sign-in.vue`, `merchant/customers.vue` |
| C | `merchant/program.vue`, `customer/sign-in.vue`, `customer/profile.vue`, `customer/rewards.vue`, `customer/reward-redemption.vue`, `customer/wallet.vue`, `merchant/home.vue` |

Para cada página: criar o composable de tela, extrair blocos para
`components/<tela>/`, mover lógica dos componentes de superfície
(`BirthdayForm`, `EarnFields`, `BonusFields`, `MerchantSignInAside`…) e
reorganizar `customer/components/` em pastas por tela.

### QA (`qa`, 1–2 em paralelo) — antes e durante a onda 2
- **Antes de mexer:** teste de componente/página dos fluxos críticos
  (Balcão lançar visita e validar resgate, check-in por QR/código/link,
  criar o clube) para servir de rede de segurança.
- Teste do composable de tela de cada página refatorada.
- Teste de componente para cada componente de domínio de `layers/ui`.

### Revisão
- `code-reviewer`: lote A, `merchant-sign-in`, `sign-in`, `profile`,
  `reward-redemption`, `customers` (Balcão, resgate, sessão, celular,
  consentimento).
- `revisor-ui`: o resto (`discover`, `rewards`, `wallet`, `home`, `program`,
  `campaigns`, mudanças só em `layers/ui`).

## 4. Ordem

```
Arquiteto (solution-design) → CTO aprova
  → onda 0: QA cria rede de segurança dos fluxos críticos
  → onda 1: dev-tipos ∥ dev-ui
  → onda 2: dev-stores (se houver) → dev-nuxt lote A → B → C (QA junto)
  → revisão por lote → merge
```

## 5. Checagem de pronto (por PR)

- `pnpm typecheck` e `pnpm test` verdes; nenhuma chave i18n alterada.
- Página dentro dos limites da seção 2.
- `grep -rE '^\s*export (interface|type) '` vazio fora de `types/` em
  `.vue`, `utils/`, `composables/` e `stores/`. Permitidos: `interface
  Props`/`Emits` locais **não exportadas** no `.vue`; em `services/`, a
  interface do service e as uniões de erro da sua assinatura;
  `core/app/mock/**`.
- Nenhum `window.`/`navigator.`/`document.` fora de composable dedicado
  (exceções nomeadas: `core/app/stores/session.ts`,
  `core/app/plugins/backend.ts`, `core/app/mock/**`).
- As duas checagens acima rodam em `layers/core/test/conventions.test.ts`; o
  PR tira a página migrada da lista de exceções.
