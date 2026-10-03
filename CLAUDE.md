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
- **Backend (histórico):** ainda não definido. Até o ADR do CTO sair, o front consome
  services com interface e implementação mock em `layers/core` — nenhum
  componente chama `fetch`/`$fetch` direto. O mock é um servidor falso único
  (`layers/core/app/mock`), escolhido por `runtimeConfig.public.apiMode`, e
  guarda o estado no `localStorage` (cliente e Balcão em abas diferentes veem os
  mesmos dados). Dados de exemplo em `seed.example.ts`; código de login do mock:
  `246810`. Por isso o app roda como SPA (`ssr: false`) por enquanto.
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
| Visita / lançar visita    | `visit` / `registerVisit`      |
| Check-in                  | `checkIn`                      |
| Código da loja (check-in) | `checkInCode`                  |
| Antifraude (janela)       | `checkInCooldown`              |
| Regras bônus              | `bonusRules` (`welcomeBonus`, `birthdayMultiplier`, `referralBonus`, `surpriseDay`) |
| Expiração                 | `expirationPolicy`             |
| Prêmio                    | `reward`                       |
| Resgate / código          | `redemption` / `redemptionCode`|
| Balcão                    | `counter`                      |
| Descobrir / desafio       | `discover` / `challenge`       |
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
  `useHaptics`, `useQrScanner`, `usePrint`, `useLeaveGuard`). Exceções
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
- **Lançar visita:** lojista digita o celular do cliente no Balcão e dá 1
  carimbo (ou lança por valor). Cliente novo ganha cartão na hora.
- **Check-in:** cliente escaneia o QR da loja e ganha o carimbo sozinho.
- **Antifraude:** no máximo 1 check-in por cliente/loja a cada janela
  configurável (ex.: 4 h, 1 dia). Qualquer visita conta para a janela, inclusive
  a lançada no balcão.
- **Regras bônus:** boas-vindas (cartão começa com 2 carimbos), aniversário em
  dobro, traga um amigo (+1 quando o amigo faz a 1ª visita), dia surpresa em dobro.
  Multiplicadores não se somam: vale o maior (aniversário no dia surpresa = 2×,
  não 4×). Quem nasceu em 29/02 comemora em 28/02 nos anos sem 29.
- **Aniversário:** o cliente informa dia e mês no Perfil. A primeira data é
  livre; depois a troca fica travada por 365 dias (senão viraria dobro todo
  dia). Tirar a data vale a qualquer hora, mas não destrava a próxima troca.
- **Mudança de programa:** mudar a meta vale também para os cartões em
  andamento; trocar o modo (carimbos ↔ pontos) fica bloqueado enquanto houver
  cartões.
- **Expiração:** carimbos vencem após X meses sem visita (ou nunca).
- **Resgate:** cliente gera um código de uso único (6 caracteres, ~10 min de
  validade); o lojista valida no Balcão e confirma a entrega. Prêmio não
  resgatado fica guardado 30 dias. Após o resgate o próximo cartão já começa
  andado se a regra de boas-vindas estiver ligada.
- **Descobrir:** vitrine das lojas da rede e desafios da cidade
  (ex.: "visite 3 lojas novas").
- **Clientes sumidos:** sem visita há mais de 30 dias; alvo de lembrete com
  carimbo bônus, só para quem aceitou avisos.
- **Plano Fundador:** R$ 79/mês com preço travado; lojas entram por aprovação
  do admin da rede.

## Regras que não se negociam

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
