# Lagoa+

Clube de fidelidade para o comércio local (piloto em Três Lagoas/MS). O cliente
junta carimbos ou pontos nas lojas da cidade numa carteira única; o lojista
lança visitas no balcão e acompanha quem voltou; a rede aprova lojas e cobra o
plano.

Design system: [`design-system/lagoa/MASTER.md`](./design-system/lagoa/MASTER.md)
(mundo visual "Carimbo e Caderneta", Nuxt UI v4 —
[ADR-0001](./docs/adr/0001-component-library.md)). Verdade de produto:
[`PRODUCT.md`](./PRODUCT.md).
Design de referência antigo (vale só como evidência de conteúdo e fluxo, não
como identidade visual): https://claude.ai/artifact/BkmsXbbcBXZTe9GStye6Ui
Equipe de agentes e regras de uso dos modelos: [`EQUIPE.md`](./EQUIPE.md).

## Estado do projeto

- **Front:** Nuxt 4 (Vue 3, `<script setup lang="ts">`, Pinia) + Nuxt UI v4.
- **API (`apps/api`):** NestJS + Drizzle sobre Postgres do Supabase (modelo em
  [`docs/database-model.md`](./docs/database-model.md)). Um app só, módulos por
  superfície: `customer/*` (cliente) e `merchant/*` (painel, Caio); `auth`,
  `database`, `common` são compartilhados. `pnpm dev:api`, `pnpm test:api`,
  `pnpm typecheck:api`; env em `apps/api/.env.example`. Migrations em
  `apps/api/drizzle` (`pnpm --filter @lagoa/api db:generate`).
- **Padrão da API** (`apps/api/src/<superfície>/<feature>/`): `controller`
  (só HTTP: valida com `ZodValidationPipe`, devolve `unwrap(result)`) →
  `service` (orquestra, devolve `Result<T, DomainError>`, sem Drizzle) →
  `*.rules.ts` (decisão pura, testável sem banco) → `repository` (classe
  abstrata = contrato; `Drizzle*Repository` = I/O). Tipos e erros vêm de
  `shared/`; o corpo de erro HTTP é o próprio `DomainError`. Rota é autenticada
  por padrão (`SupabaseAuthGuard` global; `@Public()` é a exceção). Toda query
  filtra pelo `user.id` do JWT, nunca por id vindo do cliente. Celular/e-mail só
  saem mascarados e nunca entram em log. Escrita que depende de leitura usa
  transação com `FOR UPDATE` dentro do repository. Índice `DESC` criado pelo
  Drizzle é `NULLS LAST`: a consulta precisa de `order by ... desc nulls last`,
  senão o planner ignora o índice e ordena a tabela inteira (medido: 9 ms → 0,15 ms
  em 20 mil linhas). Lista que cresce sempre sai com `limit` e sem N+1 (use
  `LATERAL ... LIMIT` para "as N mais novas de cada").
  **Limite de uso** ([ADR-0002](./docs/adr/0002-contador-de-limite-no-postgres.md)): o contador do `ThrottlerModule` é o `PostgresThrottlerStorage` (tabela `rate_limits`, compartilhada entre instâncias serverless); rota cujo limite sustenta segurança leva `@FailClosedThrottle()` (recusa se o contador cair), as demais deixam passar.
  **Ledger:** a única porta de escrita é o `LedgerStore` (`apps/api/src/ledger`):
  trava o cartão (`FOR UPDATE`) já com o vencimento aplicado, grava boas-vindas e
  visita e atualiza o saldo na mesma transação. Saldo lido sem passar por ele
  (listas, painel) usa `planExpiration`/`applyExpiration` (`shared/domain/expiration.ts`). Indicação: depois
  de confirmar a **primeira visita** de alguém, chame `ReferralSettlement.settlePending`
  (o uso do QR da visita já chama). A conta do que uma visita rende é `planEarning`
  (`shared/domain/earning.ts`) e a janela de check-in é `checkInAvailableAt`
  (`shared/domain/antifraud.ts`): API e mock usam as mesmas, nunca uma cópia.
  **QR da visita** ([spec](./docs/specs/dynamic-visit-qr/spec.md)): o QR da loja (`?loja=`) só **entra no
  clube** (`POST /v1/shop-join`, cartão zerado); ganhar é só pelo QR da visita que o lojista gera na venda
  (`POST /v1/check-in` com o token, `POST /v1/check-in/code` com o código curto), uso único e 5 min.
  Validade e uso único moram em `shared/domain/visitQr.ts`. O token vai no **fragmento**
  (`/check-in#visita=<token>`), nunca em query: não chega ao servidor, ao `Referer` nem ao `?para=` do login.
  O Balcão não recebe mais celular.
- **BFF (`apps/web/server`, modo `http`):** o navegador só fala com o próprio domínio. `/api/auth/*`
  faz o login por SMS no Supabase e guarda o token em cookie httpOnly (`lagoa_at`/`lagoa_rt`, SameSite=Lax,
  path `/api`); cada rota de `server/api/**` é um handler explícito (método + caminho fixo da API, entrada validada com
  o schema do `shared`) que troca o cookie por `Bearer` via `callApi` (`NUXT_API_BASE_URL`, só no servidor); não há
  proxy genérico: rota que não existe lá devolve 404 e os caminhos reais da API nunca aparecem no navegador. Escrita em `/api/**` exige `Origin` do próprio host ou de `NUXT_ALLOWED_ORIGINS`. Peças puras
  em `server/utils/*` com testes em `server/test`; as rotas só compõem.
- **SSR e sessão do cliente:** `ssr: true`. O cliente não tem mock nem `localStorage`: o plugin `lagoa:backend`
  monta o `ApiClient` sobre `/api` (BFF). No servidor o fetcher chama o próprio `/api` em memória com o cookie do
  pedido (`createServerFetcher`) e repassa o `Set-Cookie` do refresh; no navegador é o `fetch`. A sessão
  (`useSessionStore`, só `customer` + `checked`) não persiste: o middleware `customer-auth`/`customer-guest` chama
  `GET /api/session` uma vez (`useCustomerSession().restore()`) e o estado vai no payload. Dados de tela do cliente
  usam `useAsyncQuery(key, load)` (SSR); `useAsyncResult` (só no cliente) segue no lojista. `watch` com `immediate`
  não roda no SSR: estado derivado de dado assíncrono é `computed`.
- **Lojista (painel):** SPA (`routeRules` `ssr: false`: `/painel`, `/balcao/**`, `/programa`, `/clientes`, `/campanhas`,
  `/configuracoes`) sobre a API `merchant/*` pelo mesmo BFF (`server/api/merchant/**`, uma rota por rota da API). Login
  pelo mesmo SMS do cliente (`/api/auth`); depois do código, `GET /api/merchant/session` diz se já há loja (`session`) ou
  se falta o Criar o clube (`signUp`, sem ticket: o cookie identifica o dono). A sessão (`useMerchantSessionStore`) fica só
  na memória e é conferida no servidor pelos middlewares (`useMerchantSession().check()`). `runtimeConfig.public.merchantBackend`
  (`NUXT_PUBLIC_MERCHANT_BACKEND`) é `http` por padrão; `mock` (navegador, `localStorage`, código `246810`) só para testes e
  demonstração offline, e some na M6.
  **Cookie compartilhado com o app do cliente** (mesma conta Supabase): entrar ou sair pelo painel zera o cache do cliente
  (`resetCustomer`) e o logout é `scope: 'local'`; outra aba aberta só descobre a troca na próxima navegação (risco aceito).
  Sair só deixa o painel depois que o servidor confirma (`signOut`); `expire()` é o logout só local, para `unauthorized`. **Ainda sem API:** Campanhas (M5); no `http` a tela fica escondida (`useCampaignsEnabled`, `NUXT_PUBLIC_CAMPAIGNS_ENABLED`). Termo do lojista: a sessão traz `termsAccepted` e o Início pede o aceite (`HomeTermsAcceptance`). Plano: `docs/specs/api-merchant/`.
- **Monorepo (pnpm workspace):** o front vive em `apps/web` (Nuxt + `layers/`);
  `shared/` fica na raiz (alias `#shared`) para o futuro `apps/api` reusar
  os contratos. Caminhos `layers/...` neste documento são relativos a `apps/web/`.
- **Rodar (da raiz):** `pnpm dev` (cliente em `/carteira`, lojista em `/balcao`),
  `pnpm test`, `pnpm typecheck`.
- **Landing page do lojista:** `apps/site` (Nuxt pré-renderizado, herda
  `apps/web/layers/ui`). `pnpm dev:site` (porta 3001), `pnpm generate:site`.
  O `generate` exige `NUXT_PUBLIC_APP_URL` (link do Balcão congelado no HTML).

## Idioma

- **Código 100% em inglês:** nomes de arquivos, pastas, variáveis, funções,
  tipos, stores, rotas internas, chaves de tradução, commits, comentários e
  testes (`describe`/`it`).
- **Português só no que o usuário final vê:** textos da interface, mensagens
  de erro exibidas, e-mails/avisos. Ficam em `layers/core/i18n/locales/pt-BR.json`
  (`@nuxtjs/i18n`, só o locale pt-BR) e são usados via `$t()`/`useI18n()`
  com chaves em inglês (`wallet.rewardReady`).
- **Documentação do time** (`CLAUDE.md`, `EQUIPE.md`, specs, ADRs) segue em
  português.
- Slugs de URL visíveis ao usuário podem ser em português
  (`/carteira`, `/balcao`) via `definePageMeta`/alias; o nome do arquivo da
  página continua em inglês.

### Glossário de domínio → código

| Domínio (pt-BR)           | Código (en)                    |
| ------------------------- | ------------------------------ |
| Cliente                   | `customer`                     |
| Lojista                   | `merchant`                     |
| Loja                      | `shop` (evita conflito com Pinia store) |
| Rede / admin da rede      | `network` / `admin`            |
| Clube / programa          | `program`                      |
| Cartão de fidelidade      | `loyaltyCard`                  |
| Carimbo / ponto           | `stamp` / `point`              |
| Carteira                  | `wallet`                       |
| Unidade (carimbo ou ponto)| `unit` (`stamp` \| `point`)     |
| Caderneta (histórico)     | `ledger` (`counterEntry` no Balcão, `walletActivity` no app) |
| Visita (tipo de ganho)    | `visit` (`EarnInput.kind = 'visit'`; "lançar visita por celular" saiu do Balcão) |
| Check-in (cliente escaneia o QR da visita e ganha) | `checkIn` (ledger `checkIn` = linhas antigas) |
| Código da loja (entrar no clube) | `checkInCode` (nome legado, vai no QR da loja `?loja=`) |
| QR da loja (cartaz fixo; só entra no clube) | `shopQr`                |
| Entrar no clube (pelo QR da loja) | `joinShop` / `shopJoin` (cartão zerado; não é visita) |
| QR da visita (gerado na venda, uso único) | `visitQr`         |
| Token do QR da visita     | `visitToken` (opaco, 256 bits; banco guarda só o hash) |
| Código curto da visita (digitado) | `visitCode` (`VISIT_CODE_LENGTH`) |
| Gerar / usar / cancelar QR da visita | `issueVisitQr` / `claimVisitQr` / `cancelVisitQr` |
| Situação do QR da visita  | `visitQrStatus` (`active` \| `claimed` \| `expired` \| `cancelled`) |
| Validade do QR da visita  | `VISIT_QR_TTL_MINUTES`         |
| Link do QR da visita      | `VISIT_QR_LINK_PARAM` (fragmento `/check-in#visita=<token>`, nunca query) |
| Antifraude (janela)       | `checkInCooldown`              |
| Uma vez por dia (vira à meia-noite) | `calendarDay` (`cooldownMode`; o outro modo é `rolling`, horas corridas) |
| Regras bônus              | `bonusRules` (`welcomeBonus`, `birthdayMultiplier`, `referralBonus`, `surpriseDay`) |
| Expiração                 | `expirationPolicy`             |
| Prêmio                    | `reward`                       |
| Resgate / código          | `redemption` / `redemptionCode`|
| Balcão                    | `counter`                      |
| Descobrir / desafio       | `discover` / `challenge`       |
| Destaque no Descobrir (Pro) | `discoverFeatured`           |
| Clientes sumidos          | `lapsedCustomers`              |
| Campanha / aviso          | `campaign` / `notification`    |
| Lembrete (para sumidos)   | `reminder` (`lapsedReminder`)  |
| Alcance da campanha       | `reach`                        |
| Presente do lembrete      | `campaignBonus`                |
| Consentimento             | `consent`                      |
| Aniversário (sem ano)     | `birthday` (`MM-DD`)           |
| Troca do aniversário travada | `birthdayLocked` (`birthdayChangeableAt`) |
| Criar o clube (cadastro)  | `clubSetup`                    |
| Ticket do cadastro (celular confirmado sem loja) | `signUpTicket` |
| Cartaz do balcão (QR)     | `poster` (`checkInPoster`)     |
| Cabeçalho de tela / card herói | `screenHeader` / `heroCard` |
| Situação da loja          | `shopStatus` (`pending` \| `approved` \| `suspended`) |
| Plano / cobrança          | `plan` / `billing`             |
| Fundador / Fundador Pro   | `founder` / `founderPro`       |

Termo novo de domínio entra nesta tabela antes de virar código.

## Padrões de código

### Fluxo de dependências (de fora para dentro)

```
page (smart) → components (dumb)
     ↓
composables  → stores (Pinia, estado)
                 ↓
              services (regra de aplicação, interface)
                 ↓
              repositories / API client (I/O, implementação trocável)
                 ↓
              shared/ (tipos + schemas Zod)
```

- Cada camada só conhece a de baixo. Componente não importa service; service
  não conhece Vue, Pinia nem Nuxt.
- **Services** ficam em `layers/<layer>/app/services/`: uma `interface`
  (`RedemptionService`) e implementações (`HttpRedemptionService`,
  `MockRedemptionService`). A implementação é injetada por um plugin/
  composable de `layers/core` — trocar o backend é trocar a implementação.

### SOLID

- **S** — um motivo para mudar por arquivo: componente desenha, composable
  orquestra, store guarda estado, service aplica regra, repository faz I/O.
- **O** — modos de programa (`stamps`, `pointsPerCurrency`, `pointsPerVisit`)
  e regras bônus são estratégias plugáveis (mapa `mode → strategy`), não
  `if/switch` espalhado.
- **L** — toda implementação de uma interface (mock ou http) cumpre o mesmo
  contrato e passa nos mesmos testes.
- **I** — interfaces pequenas por caso de uso (`CounterService` não carrega
  métodos de billing).
- **D** — camadas de cima dependem de interfaces, nunca de implementação
  concreta.

### Clean code e DRY

- Nomes que dizem o que é (`remainingStamps`, não `n`/`aux`); funções pequenas
  com um nível de abstração; early return em vez de `if` aninhado.
- Sem número mágico: limites de domínio (`REDEMPTION_CODE_TTL_MINUTES`,
  `LAPSED_AFTER_DAYS`) em constantes nomeadas em `shared/`.
- Sem comentário explicando o óbvio; comentário só para o *porquê*.
- DRY de conhecimento, não de aparência: regra de negócio e formatação
  (ex.: `maskPhone`, `formatCurrency`) existem em um lugar só. Duas telas
  parecidas por acaso não precisam virar um componente genérico.

### Componentes

- **Página = rota + composição.** Só `definePageMeta`, `usePageTitle`, uma
  chamada a `use<Tela>Screen()` (e `useRoute` para parâmetro de rota) e o
  template com componentes. Script ≤ 30 linhas, template ≤ 60, nenhuma função
  de regra, formatação ou foco. A página não desestrutura o retorno do
  composable de tela (é um `reactive`).
- **Composable de tela** (`composables/use<Tela>Screen.ts`, na raiz da pasta):
  orquestra composables de dado, guarda de sessão, foco e textos derivados.
  ≤ 150 linhas; acima disso, sub-composable por bloco.
- **Smart** só a página (ou um container explícito `*Container.vue`): lê o
  composable de tela e repassa para os dumb.
- **Dumb components** por padrão: dados por props, avisos por emits, sem
  acesso a store, service ou rota. Script ≤ 40 linhas, sem `watch`; template
  ≤ 80 linhas — acima disso, quebrar por bloco de tela.
- **Textos.** Componente de superfície (`customer`, `merchant`, `admin`) chama
  `$t()` com chave em inglês do próprio domínio e recebe **códigos** de erro,
  não mensagens. Frase composta de dado (plural, regra) vem pronta de um
  mapeador puro em `utils/`. Componente de `layers/ui` não conhece i18n:
  recebe texto pronto (props ou `labels`).
- **Browser API** (`window`, `document`, `navigator`, foco, vibração, câmera,
  impressão, `beforeunload`) só em composable dedicado (`useFocusRequest`,
  `useHaptics`, `useQrScanner`, `usePrint`, `useLeaveGuard`, `useFileDownload`, `useImageResize`). Exceções
  nomeadas: persistência da sessão (`core/app/stores/session.ts`) e o mock
  (`core/app/plugins/backend.ts`, `core/app/mock/**`).
- **Pastas.** `components/<arquivo-da-página>/<Bloco>.vue` nas superfícies
  (nome no template: `<Pasta><Bloco>`); componente usado por várias telas fica
  na pasta do domínio dono. `layers/ui` só tem peças do design system sem
  domínio de uma superfície.
- **Store × composable.** Vira store `use<Domínio>Store` só estado que
  sobrevive à troca de página, é lido por mais de uma página/layout, ou é a
  sessão. O resto é composable da tela. Celular digitado nunca vai para store.

### Tipagem

- `strict: true`, sem `any` (use `unknown` + narrowing), sem `as` para calar o
  compilador, sem `!` non-null sem justificativa.
- `defineProps<Props>()` e `defineEmits<Emits>()` com tipos explícitos;
  retorno explícito em funções exportadas de services, composables e stores.
- Tipos de domínio derivam dos schemas Zod em `shared/` (`z.infer`); toda
  resposta externa é validada no repository antes de entrar no app.
- IDs e dados sensíveis com tipos de marca (`ShopId`, `CustomerId`,
  `PhoneNumber`) para não misturar nem vazar sem querer.
- Uniões discriminadas para estados (`{ status: 'idle' | 'loading' | 'error' | 'success' }`)
  e para resultados de service (`Result<T, DomainError>`), em vez de
  `null`/exceção solta.
- **Tipos em arquivo próprio:** `layers/<layer>/app/types/<domínio>.ts`
  (nome do glossário, singular) para props compartilhadas, view-models,
  estados e retornos de composable. Fora de `types/` não há
  `export interface`/`export type`; em `.vue`, `utils/`, `composables/` e
  `services/` só `import type`. Exceções: `interface Props`/`Emits` locais e
  **não exportadas** do SFC, e a interface do service com as uniões de erro da
  sua assinatura (ficam no arquivo do service). Arquivo em `types/` importa
  `Ref`/`ComputedRef` de `'vue'`.
- Tipo de domínio não se reescreve: deriva de `shared/schemas`
  (`z.infer`, `Omit`, `Pick`); celular em view-model é sempre `MaskedPhone`.

## Superfícies

| Superfície | Formato             | Telas do MVP                                                                  |
| ---------- | ------------------- | ----------------------------------------------------------------------------- |
| Cliente    | mobile (390px)      | Entrar, Código e LGPD, Carteira, Cartão da loja, Check-in, Carimbo ganho, Resgate, Descobrir, Perfil |
| Lojista    | desktop (1280px)    | Criar o clube, Início, Balcão, Programa e prêmios, Clientes, Campanhas        |
| Admin      | desktop (1280px)    | Lojas (aprovação), Planos e cobrança, Métricas da rede, Vitrine Descobrir     |

## Glossário de domínio

- **Clube / programa:** a regra de fidelidade de uma loja. Modos: *cartão de
  carimbos* (N carimbos = prêmio), *pontos por real* e *pontos por visita*.
- **Carimbo / ponto:** unidade ganha a cada visita válida.
- **Entrar no clube:** cliente escaneia o QR da loja (cartaz) e ganha o cartão
  zerado; não é visita e não rende.
- **QR da visita / check-in:** na venda, o lojista gera no Balcão um QR de uso
  único (5 min; no modo por real com o valor preso) e o cliente escaneia (ou
  digita o código curto) para ganhar. Sem cartão, o QR da visita já cria. Não há
  mais lançamento por celular no Balcão.
- **Antifraude:** no máximo 1 visita que rende por cliente/loja a cada janela
  configurável: horas corridas (4 h, 12 h, 24 h, 2 dias, 7 dias) ou **1 vez por dia**, que vira à
  meia-noite local (23h e 3h do dia seguinte valem duas). A recusa não consome o QR da visita.
- **Regras bônus:** boas-vindas (cartão começa com 2 carimbos), aniversário em
  dobro, traga um amigo (+1 quando o amigo faz a 1ª visita), dia surpresa em dobro.
  Multiplicadores não se somam: vale o maior (aniversário no dia surpresa = 2×,
  não 4×). Quem nasceu em 29/02 comemora em 28/02 nos anos sem 29.
- **Aniversário:** o cliente informa dia e mês no Perfil. A primeira data é
  livre; depois a troca fica travada por 365 dias (senão viraria dobro todo
  dia). Tirar a data vale a qualquer hora, mas não destrava a próxima troca.
- **Mudança de programa:** a loja define meta, modo e prêmio (texto livre) e pode
  trocar quando quiser. A troca cria uma nova versão do programa (`programs.active`):
  cartões com saldo terminam na versão em que começaram; cartão novo, zerado ou
  recém-resgatado já pega a versão ativa. Sobra de pontos só atravessa a troca se a
  unidade for a mesma. Exceção: cartão em pontos por real sem prêmio ganhado, quando a loja sai
  desse modo mantendo a unidade (ponto), passa para a versão ativa na próxima visita (senão nunca mais renderia: o QR
  por visita não leva valor); cartão por real que muda para carimbo fica na versão antiga (decisão: o saldo em pontos não vira carimbo) e o painel avisa o lojista antes de salvar.
- **Expiração:** carimbos vencem após X meses sem visita (ou nunca).
- **Resgate:** cliente gera um código de uso único (6 caracteres, ~10 min de
  validade); o lojista valida no Balcão e confirma a entrega. Prêmio não
  resgatado fica guardado 30 dias. Após o resgate o próximo cartão já começa
  andado se a regra de boas-vindas estiver ligada.
- **Descobrir:** vitrine das lojas da rede e desafios da cidade
  (ex.: "visite 3 lojas novas"). Loja do Fundador Pro aparece em destaque
  (`discoverFeatured`).
- **Clientes sumidos:** sem visita há mais de 30 dias; alvo de lembrete com
  carimbo bônus, só para quem aceitou avisos.
- **Planos Fundador:** Fundador R$ 79,90/mês (de R$ 119,90) e Fundador Pro R$ 89,90/mês (de R$ 249,90; inclui clientes sumidos, campanhas e destaque no Descobrir). Preço de Fundador só para as 10 primeiras lojas, preço travado e sem fidelidade; lojas entram por aprovação
  do admin da rede.

## Regras que não se negociam

- **Banco de produção só depois do de teste.** Migration só entra em produção pelo
  `db:migrate:prod` (`apps/api/scripts/migrate-prod.sh`): o banco de teste precisa ter exatamente as migrations do repo e os
  testes de integração passando nele, e a produção não pode divergir. Nada de `apply_migration` do MCP nem SQL à mão em
  produção. Detalhes em `apps/api/README.md`.
- **Celular é dado pessoal (LGPD).** Mascarado em listas
  (`(67) 9••••-0374`), nunca em logs, URLs, analytics ou métricas da rede. O
  admin vê só dados agregados.
- Consentimento de avisos é explícito e revogável; sem consentimento, sem
  campanha.
- Código de resgate e regras de antifraude são validados no servidor. O front
  só exibe.
- Toda string visível é pt-BR e vem do `pt-BR.json` via chave em inglês
  (sem texto solto no template).
- Acessibilidade: alvos de toque ≥ 44px, contraste 4.5:1, elementos
  interativos reais (`<button>`, `<a>`, `<input>` + `<label>`).
