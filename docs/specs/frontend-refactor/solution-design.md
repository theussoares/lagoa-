# Refatoração do front — solution design

Fonte: [`responsibilities.md`](./responsibilities.md). Sem regra nova: nenhuma
tela, texto, chave i18n ou comportamento muda. Caminhos relativos a `apps/web/`
(exceto `shared/`, na raiz). Status: **aprovado com ajustes pelo CTO**
(seção 9).

Lido antes de propor: as 15 páginas, todos os composables, os 22 `utils/` de
tela, os componentes de `customer`, `merchant` e `ui`, os stores, `nuxt.config`,
`vitest.config.ts` e `tsconfig.test.json`.

---

## 0. O padrão-alvo em uma tela

```
pages/counter.vue                      smart: rota + composição (≤ 30 linhas de script)
  └─ composables/useCounterScreen.ts   orquestra: dados, guarda de sessão, foco, textos derivados
       ├─ useCounterLaunch / useCounterLedger / useRedemptionCheck   (já existem; estado de dado)
       ├─ useMerchantSessionGuard(...)  (novo; política unauthorized/loja fechada)
       └─ utils/counterModels.ts        (mapeadores puros, testados; recebem Translate)
  └─ components/counter/*.vue          dumb: props/emits, $t com chave do domínio
       └─ layers/ui/*                   design system: recebe texto pronto
```

- **Composable de tela devolve `reactive({...})`** (o template lê sem `.value`,
  e `v-model:x="screen.bloco.x"` funciona). Composables de dado continuam
  devolvendo refs. A página **nunca desestrutura** o retorno do composable de
  tela (perderia reatividade): `const screen = useCounterScreen()`.
- O tipo do retorno descreve a forma já desembrulhada (`phone: string`, não
  `Ref<string>`) e mora em `types/<domínio>.ts`.
- Título da aba em todas as páginas: `usePageTitle('counter.title')` (novo, em
  `core`), no lugar do `useHead` repetido 15 vezes.

---

## 1. Decisões em aberto

### a) Textos: `labels` montado na página × `$t()` no componente de superfície

**Decisão:** componentes de **superfície** (`layers/customer|merchant/app/components/**`)
chamam `$t()`/`useI18n()` com chaves do próprio domínio (`counter.*`,
`clubSetup.*`, `program.*`, `errors.*`, `common.*`, `units.*`). Componentes de
**`layers/ui`** continuam sem i18n: recebem texto pronto (props ou objeto
`labels`).

Regra de corte para o que **não** vai para o template:

| Tipo de texto | Onde fica |
| --- | --- |
| Rótulo fixo (`counter.launch.phoneLabel`) ou com parâmetro que já é prop (`clubSetup.shop.nameError`, `{ max }` de constante) | `$t` no componente de superfície |
| Código de erro → mensagem (`errors.${code}`) | componente recebe o **código**, faz `$t` |
| Frase composta de dado com plural/regra (recibo do lançamento, linha da caderneta, aviso do check-in, resumo do programa) | mapeador puro em `utils/` (já testado), chamado pelo composable de tela, entra como prop de texto pronto |
| Texto para componente de `layers/ui` | montado no componente de superfície que o envolve; se a página usa o componente de `ui` direto, o composable de tela expõe o `labels` |

Por quê: elimina os 23 + 21 objetos de rótulo de `counter.vue`/`club-setup.vue`
sem acoplar `layers/ui` a domínio; o mapeador continua sendo o único lugar de
regra de frase (testável sem montar componente). Custo: componente de superfície
passa a depender de `@nuxtjs/i18n` — aceitável porque ele já é do domínio, e o
teste de componente roda no ambiente `nuxt` (ver QA-0).

**Precisa de aprovação:** contradiz a frase atual do `CLAUDE.md` ("dumb … não
acessam … i18n de domínio por conta própria"). Texto novo na seção 4.

### b) O que sai de `layers/ui`

Critério: fica em `ui` o que é **peça do mundo visual** (carimbo, casa, régua,
canhoto, picote, selo, teclado, visor) e recebe primitivos/texto pronto; sai o
que é **um bloco de uma tela de uma superfície**, com view-model daquela tela.

Uso real conferido no código:

| Componente / tipo | Usado por | Destino |
| --- | --- | --- |
| `ui/components/CounterLedger.vue` | só `merchant/pages/counter.vue` | **sai** → `merchant/components/counter/CounterLedger.vue` (`<CounterLedger>`, nome igual) |
| `ui/components/LaunchReceipt.vue` | só `counter.vue` | **sai** → `merchant/components/counter/LaunchReceipt.vue` (`<CounterLaunchReceipt>`) |
| `ui/components/CheckInPoster.vue` | só `merchant/components/setup/PosterStep.vue` | **sai** → `merchant/components/club-setup/Poster.vue` (`<ClubSetupPoster>`); `ui/utils/qrPath.ts` fica em `ui` (genérico) |
| `ui/components/CustomerTable.vue` | só `merchant/pages/customers.vue` (`home` usa só o tipo) | **sai** → `merchant/components/customers/Table.vue` (`<CustomersTable>`) |
| `ui/types/counter.ts` → `CounterLedgerEntryModel`, `LaunchReceiptModel` | merchant | **sai** → `merchant/app/types/counter.ts` |
| `ui/types/counter.ts` → `CounterKeypadLabels` | `ui/CounterKeypad` | **fica**, em `ui/app/types/keypad.ts` |
| `ui/types/customers.ts` (`CustomerRowModel`, `CustomerTableLabels`) | merchant (customers, home) | **sai** → `merchant/app/types/customer.ts` |
| `ui/types/poster.ts` (`CheckInPosterModel`) | merchant | **sai** → `merchant/app/types/poster.ts` |
| `CounterKeypad`, `PhoneDisplay`, `RedemptionStub` | só counter, mas são o "teclado do Balcão", visor e canhoto listados no `EQUIPE.md` como peças do DS | **ficam** em `ui` (sem domínio, texto por prop) |
| `StampCard`, `CardStack`, `LedgerList`, `RewardCoupon`, `RewardProgressList`, `RedemptionTicket`, `ShopCard`, `ShopTile`, `ChallengeCard`, `HeroCard`, `ScreenHeader`, `QrViewfinder`… | customer (alguns também merchant) | **ficam** (peças; `StampCard` é usado pelas duas superfícies) |

Se o admin precisar do cartaz ou da tabela, o componente sobe de volta para `ui`
com props de texto (regra "o que é comum sobe").

### c) Store Pinia × composable; tratamento de `unauthorized` / loja fechada

**Critério:** vira store `use<Domain>Store` só o estado que (1) precisa
sobreviver à troca de página **ou** (2) é lido por mais de uma página/layout
**ou** (3) é a identidade da sessão. Estado de uma tela só (formulário,
resultado de chamada, caderneta do dia, foco) fica em composable e nasce/morre
com a página.

Aplicação:

| Estado | Hoje | Decisão |
| --- | --- | --- |
| Sessões + `shopStatus` | `core/stores/session.ts` | **fica** (já é store; `useShopStatus` lê dele; não criar outro) |
| Ticket + rascunho do Criar o clube | `merchant/stores/clubSetup.ts` | **fica** (atravessa login → criar clube) |
| Caderneta do Balcão, lançamento, resgate | composables | **ficam em composable**: só `counter.vue` usa; virar store mudaria o comportamento (a caderneta deixaria de recarregar ao voltar) e o celular digitado iria para o devtools do Pinia (LGPD) |
| Cartões da carteira (`useWalletCards`) | composable, recarregado em 4 páginas | **fica**. Candidato a `useWalletStore` quando uma feature pedir cache entre telas; hoje seria mudança de comportamento |

**Nenhum store novo nesta refatoração.**

**Erro de sessão — onde centralizar.** Não é estado, é política: vira
composable de guarda, chamado uma vez por composable de tela.

- `layers/core/app/utils/errorCode.ts` — `errorCodeOf(state: ErrorCarrier): DomainErrorCode | null`
  e `hasErrorCode(states: readonly ErrorCarrier[], codes: readonly DomainErrorCode[]): boolean`
  (normaliza `{ status: 'error', error: { code } }` e `{ status: 'error', code }`,
  o `'error' in state ? …` que hoje está em `counter.vue`).
- `layers/merchant/app/composables/useMerchantSessionGuard.ts`
  `useMerchantSessionGuard(source: () => readonly ErrorCarrier[], options?: MerchantSessionGuardOptions): void`
  — `unauthorized` → `useMerchantSession().signOut()`; senão, com
  `options.refreshShopStatus`, `shopPendingApproval | shopSuspended` →
  `useShopStatus().refresh()`.
- `layers/customer/app/composables/useCustomerSessionGuard.ts`
  `useCustomerSessionGuard(source: () => readonly ErrorCarrier[]): void` — `unauthorized` → `signOut()`.

Paridade: cada guarda observa um `computed<boolean>` por código (dispara na
transição falso → verdadeiro), igual aos `watch(unauthorized)` das páginas do
cliente; no Balcão a transição se repete a cada erro novo porque o estado passa
por `pending`. `refreshShopStatus: true` **só no Balcão** (como hoje).
Alternativa para o CTO: ligar em todo o painel (campanha recusada por loja
suspensa também atualizaria a faixa) — melhora, mas é mudança de comportamento.

Descartado: decorar os services no plugin para deslogar em qualquer resultado
`unauthorized` — mudaria comportamento (`useShopStatus().refresh()` no layout e
`profile.acceptTerms()` no login passariam a deslogar).

### d) Destino dos 22 `utils/*Model.ts` / `*Labels.ts` / `*Form.ts`

**Regra geral**

1. Função pura (sem Vue, sem `useI18n`; `Translate` entra por parâmetro) →
   **fica em `utils/`** da layer da superfície, com teste. Só os tipos saem para
   `types/`.
2. Arquivo que só tem `interface` → some; tipos vão para `types/`. Interfaces
   `*Labels` de componente de superfície somem quando o componente passa a usar
   `$t` (decisão a).
3. Formatação de data em pt-BR no fuso do piloto (hoje há 3 cópias de
   `timeFormat` e 4 outros `Intl.DateTimeFormat`) → **`shared/utils/dateFormat.ts`**,
   ao lado de `shared/utils/currency.ts` (o backend vai precisar para avisos).
4. Helper usado pelas duas superfícies → `layers/core/app/utils/` (ex.: `unitsText`).
5. Algo que precisa de reatividade, serviço, rota ou foco → composable de tela.
6. Regra que o servidor também aplicaria → `shared/domain/`. **Nenhum** dos 22
   se enquadra (são regras de tela: modo do botão, troca de modo no editor,
   "momento" do check-in).

**Tabela por arquivo**

| # | Arquivo | Funções → | Tipos → |
| - | --- | --- | --- |
| 1 | `merchant/app/utils/campaignModels.ts` | ficam; `sentAtFormat` → `shared/utils/dateFormat.ts#formatShortDateTime` | `ReachLine`, `ReachModel`, `ReminderPreviewModel`, `CampaignHistoryRow` → `merchant/app/types/campaign.ts` |
| 2 | `merchant/app/utils/clubSetupForm.ts` | ficam (`CLUB_SETUP_STEPS` passa a `readonly ClubSetupStep[]` com `satisfies`) | `ClubSetupStep`, `ClubSetupFormStep`, `ShopField`, `ShopFieldErrors`, `ShopProfileForm`, `ClubSetupForm` → `merchant/app/types/clubSetup.ts` |
| 3 | `merchant/app/utils/clubSetupLabels.ts` | — (só tipos) → **apagar** | `SetupStepItem` (perde `label`), `ShopFieldLimits` → `types/clubSetup.ts`; `ShopFieldsLabels`, `PosterStepLabels` somem no lote A |
| 4 | `merchant/app/utils/counterAction.ts` | ficam | `CounterAction` → `types/counter.ts` |
| 5 | `merchant/app/utils/counterModels.ts` | ficam; ganha `toLaunchFormText(action, t)` e `toRedemptionPreviewModel(preview, confirming, t)`; `unitsText` → `core/app/utils/units.ts`; `timeFormat` → `formatTime` | (usa `types/counter.ts`) |
| 6 | `merchant/app/utils/customerFilterQuery.ts` | fica | — |
| 7 | `merchant/app/utils/customerModels.ts` | fica | `CustomerRowModel` (vindo de `ui`) → `types/customer.ts` |
| 8 | `merchant/app/utils/homeModels.ts` | ficam; `dayFormat` → `formatWeekdayShortDate` | `WeekDayRow` → `types/home.ts`; `LapsedPreviewLabels` some no lote C |
| 9 | `merchant/app/utils/posterModel.ts` | fica | `CheckInPosterModel` (vindo de `ui`) → `types/poster.ts` |
| 10 | `merchant/app/utils/programForm.ts` | ficam (`COOLDOWN_HOUR_OPTIONS`, `EXPIRATION_MONTH_OPTIONS` também) | `ProgramField`, `ProgramFieldErrors` → `types/program.ts` |
| 11 | `merchant/app/utils/programFormLabels.ts` | — (só tipos) → **apagar** | `NumberRange`, `ProgramFieldLimits` → `types/program.ts`; `SelectOption` → `ui/app/types/form.ts`; `ModeOptionLabel`, `EarnFieldsLabels`, `BonusToggleLabel`, `BonusFieldsLabels`, `VisitRulesLabels` somem no lote A |
| 12 | `merchant/app/utils/programPreviewModel.ts` | fica | `ProgramPreview` → `types/program.ts` |
| 13 | `merchant/app/utils/programSummary.ts` | ficam | `ProgramFoldSection`, `ProgramSectionSummaries` → `types/program.ts` |
| 14 | `merchant/app/utils/reminderForm.ts` | ficam | `ReminderField`, `ReminderFieldErrors`, `ReminderFieldLimits` → `types/campaign.ts`; `ReminderFieldsLabels` some no lote B |
| 15 | `customer/app/utils/birthdayModel.ts` | ficam (formatos de aniversário são em UTC, próprios do domínio) | `BirthdayOption` → alias de `SelectOption` (`ui/types/form.ts`); `BirthdayParts` → `customer/app/types/profile.ts` |
| 16 | `customer/app/utils/categoryIcon.ts` | fica | — |
| 17 | `customer/app/utils/checkInModel.ts` | ficam | `CheckInSource`, `CheckInRecovery`, `CheckInNoticeModel`, `CheckInMoment`, `CheckInEarnedModel` → `customer/app/types/checkIn.ts` |
| 18 | `customer/app/utils/discoverModel.ts` | ficam | `ShopGroups` → `customer/app/types/discover.ts` |
| 19 | `customer/app/utils/ledgerEntryModel.ts` | `toLedgerEntryModel`, `formatLedgerWhen` ficam; `formatShortDate`, `formatTime` → `shared/utils/dateFormat.ts` | — |
| 20 | `customer/app/utils/redemptionTicketModel.ts` | ficam | — |
| 21 | `customer/app/utils/rewardsModel.ts` | ficam | `RewardGroups` → `customer/app/types/reward.ts` |
| 22 | `customer/app/utils/walletCardModel.ts` | fica | `WalletCardModelOptions` → `customer/app/types/wallet.ts` |

Também: `merchant/app/composables/useProgramFormLabels.ts` é substituído por
`useProgramFieldOptions(draft)` (mesma lógica de limites, opções com
`withCurrent` e resumos; sem os textos fixos, que vão para os componentes).

`shared/utils/dateFormat.ts` (mesmas opções `Intl` de hoje, saída idêntica):
`formatTime(iso)`, `formatShortDate(iso)`, `formatShortDateTime(iso)`,
`formatWeekdayShortDate(date)`, `formatLongWeekdayDate(date)` — todas em
`pt-BR` + `PILOT_TIME_ZONE`, com teste de saída.

### e) Convenções de pasta e nome

| O quê | Convenção | Exemplo |
| --- | --- | --- |
| Tipos | `layers/<layer>/app/types/<domínio>.ts`, nome do glossário no **singular** (como `shared/schemas`) | `merchant/app/types/counter.ts`, `customer/app/types/checkIn.ts` |
| Import de tipo | sempre `import type`; mesma layer por caminho relativo, outra layer por `#layers/<layer>/app/types/...`. `types/` não é auto-importado (bom: dependência explícita) | `import type { CounterAction } from '../types/counter'` |
| Tipos e `Ref` | arquivo em `types/` importa `Ref`/`ComputedRef` de `'vue'` explicitamente (roda também em `tsconfig.test.json`, sem globais do Nuxt) | `import type { Ref } from 'vue'` |
| Composable de tela | `layers/<superfície>/app/composables/use<Tela>Screen.ts`, **na raiz** de `composables/` (o Nuxt só auto-importa o primeiro nível). Nome global único: prefixo da superfície quando a tela existe nas duas | `useCounterScreen`, `useSignInScreen` (cliente), `useMerchantSignInScreen`, `useMerchantHomeScreen` |
| Tipo do retorno | `<Tela>Screen` em `types/<domínio>.ts` | `CounterScreen` |
| Componentes por tela | `layers/<superfície>/app/components/<arquivo-da-página>/<Bloco>.vue` (pasta = nome do arquivo da página, kebab-case). Nome no template = `<Pasta><Bloco>` (prefixo de pasta do Nuxt; se o arquivo já começa com o nome da pasta, o Nuxt não duplica) | `components/counter/LaunchPanel.vue` → `<CounterLaunchPanel>`; `components/counter/CounterLedger.vue` → `<CounterLedger>` |
| Componente usado por várias telas da mesma superfície | pasta do domínio dono | `merchant/components/program/*` (programa e criar clube); `customer/components/wallet/Problem.vue` → `<WalletProblem>` |
| `layers/ui` | plano, sem pasta por tela; só peças sem domínio | — |
| Composable de browser | `use<Capacidade>` em `core` (ou `ui` quando o consumidor é componente de `ui`) | `useLeaveGuard`, `usePrint`, `useHaptics`, `useFocusRequest` |

Renomeações de pasta resultantes (nome no template muda, conferir todos os usos):
`merchant/components/setup/` → `club-setup/` (`SetupSteps` → `ClubSetupSteps`,
`SetupShopFields` → `ClubSetupShopFields`, `SetupPosterStep` → `ClubSetupPosterStep`);
`merchant/components/campaign/` → `campaigns/` (`Campaign*` → `Campaigns*`);
`customer/components/BirthdayForm.vue` → `profile/BirthdayForm.vue`
(`<ProfileBirthdayForm>`). As demais mudanças de pasta preservam o nome:
`CheckInNotice` (`check-in/Notice.vue`), `SignInHero` (`sign-in/Hero.vue`),
`WalletEmpty`/`WalletProblem`/`WalletStackSkeleton` (`wallet/*.vue`),
`MerchantSignInAside` (`merchant-sign-in/Aside.vue`).

---

## 2. Composables novos de base (onda 1)

### `layers/ui` (focus é comportamento do DS; `ui` não depende de `core`)

`layers/ui/app/types/focus.ts`
```ts
export interface FocusRequest<T extends string> { readonly target: T; readonly id: number }
```
`layers/ui/app/composables/useFocus.ts`
```ts
/** No composable de tela: decide QUANDO focar. */
export function useFocusRequest<T extends string>(): { request: Readonly<Ref<FocusRequest<T> | null>>; focus: (target: T) => void }
/** No componente: decide COMO focar (watch flush 'post', depois do DOM). */
export function useFocusTarget<T extends string>(request: () => FocusRequest<T> | null, target: T, focus: () => void): void
/** Substitui as 5 cópias de `$el.querySelector('input')?.focus()`. */
export function focusFirstInput(instance: unknown): void
/** `document.querySelector(selector)?.focus()` (criar clube: h1 e primeiro campo inválido). */
export function focusFirstMatching(selector: string): void
```
`layers/ui/app/composables/useInputCaret.ts` — `useInputCaret(input: Readonly<ShallowRef<HTMLInputElement | null>>): { focus(): void; caretToEnd(): void }` (sai do `PhoneDisplay`).

### `layers/core`

`layers/core/app/types/browser.ts`
```ts
export type VibrationPattern = number | readonly number[]
export interface LeaveGuardOptions {
  readonly when: () => boolean                          // há algo a perder agora?
  readonly allow?: (to: RouteLocationNormalized) => boolean  // sai sem perguntar (login)
  readonly message: () => string                        // texto pt-BR já traduzido
  readonly warnOnUnload: boolean                        // também beforeunload
}
```
| Arquivo | Assinatura | Substitui |
| --- | --- | --- |
| `core/app/composables/useLeaveGuard.ts` | `useLeaveGuard(options: LeaveGuardOptions): void` | `onBeforeRouteLeave` + `window.confirm` + `beforeunload` de `club-setup.vue` (com unload) e `program.vue` (**sem** unload — como hoje) |
| `core/app/composables/usePrint.ts` | `usePrint(): { print: () => void }` | `window.print()` de `club-setup.vue` |
| `core/app/composables/useHaptics.ts` | `useHaptics(): { vibrate: (pattern: VibrationPattern) => void }` (no-op sem `navigator.vibrate`) | `navigator.vibrate?.` de `check-in.vue` |
| `core/app/composables/usePageTitle.ts` | `usePageTitle(key: string): void` → `` `${t(key)} · ${t('app.name')}` `` | `useHead` das 15 páginas |
| `core/app/composables/useThemeChoiceLabels.ts` | `useThemeChoiceLabels(): ComputedRef<ThemeChoiceLabels>` | objeto duplicado em `profile.vue` e `settings.vue` |
| `core/app/utils/errorCode.ts` | `errorCodeOf`, `hasErrorCode` (seção 1c) | expressão de `counter.vue` |
| `core/app/utils/units.ts` | `unitsText(t: Translate, unit: ProgramUnit, count: number): string` | `merchant/utils/counterModels.ts#unitsText` |

Todos os composables de browser checam `import.meta.client` antes de tocar em
`window`/`navigator`/`document`. A câmera continua em
`customer/app/composables/useQrScanner.ts` (já é dedicado; só os tipos saem).

### Componentes novos em `layers/ui` (DRY de identidade visual)

| Componente | Props / emits | Substitui |
| --- | --- | --- |
| `ui/components/FieldErrorMessage.vue` | `{ message?: string }` | o slot `#error` com ícone, repetido em counter, check-in, sign-in ×2, merchant-sign-in ×2 |
| `ui/components/PanelRefreshAction.vue` | `{ countText?: string; loading: boolean; label: string }` / `refresh` | contagem + botão 44px de atualizar em counter e customers |
| `ui/components/InlineStatus.vue` | `{ tone: 'success' \| 'error'; text: string }` (o contêiner `aria-live` fica no pai) | linha de feedback de salvar/enviar em program e campaigns |

---

## 3. Plano por página

Legenda: **S** = smart, **D** = dumb. "Sai" = o que deixa o `<script>` da página.

### Lote A

#### A1. `merchant/pages/counter.vue` (hoje: script 145, template 185)

**Composable:** `layers/merchant/app/composables/useCounterScreen.ts`
```ts
export function useCounterScreen(): CounterScreen
```
`layers/merchant/app/types/counter.ts` (novo, junto com `CounterAction`,
`CounterLaunchState`, `CounterLaunch`, `RedemptionCheckState`,
`RedemptionCheck`, `CounterLedger`, `CounterLedgerEntryModel`, `LaunchReceiptModel`):
```ts
export type CounterField = 'phone' | 'amount'
export type CounterFocusTarget = CounterField | 'redemptionCode'

export interface CounterLaunchView {
  phone: string                                   // só dígitos; v-model do PhoneDisplay
  readonly amountText: string                     // "R$ 24,90" ou ''
  readonly action: CounterAction | null
  readonly submitLabel: string                    // toLaunchFormText
  readonly amountHint: string | undefined         // toLaunchFormText
  readonly pending: boolean
  readonly phoneErrorCode: 'invalidPhone' | null
  readonly amountErrorCode: 'invalidAmount' | null
  readonly alertCode: DomainErrorCode | null      // erro que não é de campo
  readonly programFailed: boolean
  readonly receipt: { readonly key: string; readonly model: LaunchReceiptModel } | null
  readonly setActiveField: (field: CounterField) => void
  readonly inputAmount: (value: string | number) => void
  readonly pressDigit: (digit: string) => void
  readonly pressBackspace: () => void
  readonly clear: () => void
  readonly submit: () => Promise<void>
  readonly retryProgram: () => Promise<void>
}
export interface CounterRedemptionPreviewModel {
  readonly rewardTitle: string
  readonly customerLine: string                   // "(67) 9••••-0374 · vale até 14:32" (celular mascarado)
  readonly confirming: boolean
}
export interface CounterRedemptionView {
  code: string[]
  readonly status: RedemptionCheckState['status']
  readonly errorCode: DomainErrorCode | null
  readonly preview: CounterRedemptionPreviewModel | null
  readonly deliveredReward: string | null
  readonly complete: () => Promise<void>
  readonly deliver: () => Promise<void>
  readonly cancel: () => void
}
export interface CounterLedgerView {
  readonly status: 'loading' | 'error' | 'success'
  readonly errorCode: TransportError['code'] | null
  readonly rows: readonly CounterLedgerEntryModel[]
  readonly reload: () => Promise<void>
}
export interface CounterScreen {
  readonly today: string                          // formatLongWeekdayDate(new Date())
  readonly focusRequest: FocusRequest<CounterFocusTarget> | null
  readonly launch: CounterLaunchView
  readonly redemption: CounterRedemptionView
  readonly ledger: CounterLedgerView
}
```

**Sai da página → para onde**

| Hoje em `counter.vue` | Destino |
| --- | --- |
| `watch` de `unauthorized`/loja fechada | `useMerchantSessionGuard(() => [program, ledger, launch, redemption].map(s => s.state.value), { refreshShopStatus: true })` |
| `program` via `useAsyncResult`, `action`, `rewardTitle` | `useCounterScreen` |
| `submitLabel`, `amountHint` | `utils/counterModels.ts#toLaunchFormText(action, t)` |
| `amountText` (`formatCurrency`) | `useCounterScreen` |
| `phoneError`/`amountError`/`launchAlert` (textos) | viram **códigos** no composable; `$t` no componente |
| `receipt`, `ledgerRows` | `useCounterScreen` (mapeadores existentes) |
| `keypadLabels` | `components/counter/LaunchForm.vue` (envolve `ui/CounterKeypad`) |
| `activeField`, `onKeypadDigit/Backspace`, `onAmountInput`, `submitLaunch` (Enter no celular vai ao valor), `clearLaunch`, `onCodeComplete`, `deliverReward`, `cancelRedemption` | `useCounterScreen` (regra de quando focar → `focus('phone' \| 'amount' \| 'redemptionCode')`) |
| `useTemplateRef` ×3, `focusPhone`, `focusAmount`, `$el.querySelector` | componentes, via `useFocusTarget` + `focusFirstInput` |
| `dayFormat`, `timeFormat`, `STAMP_ICON` | `shared/utils/dateFormat.ts`; `STAMP_ICON` → constante em `counter/LaunchFeedback.vue` |
| `onMounted(focusPhone)` | `useCounterScreen` (`onMounted(() => focus('phone'))`) |

**Árvore de componentes**

```
merchant/pages/counter.vue                                   S  PageTitle + grid; ~45 linhas de template
├─ ui/PageTitle (#actions: screen.today)
├─ merchant/components/counter/LaunchPanel.vue  <CounterLaunchPanel>       D
│    props: v-model:phone, amountText, action, submitLabel, amountHint, pending,
│           phoneErrorCode, amountErrorCode, alertCode, programFailed, receipt, focusRequest
│    emits: fieldFocus(field), amountInput(value), digit(d), backspace, clear, submit, retryProgram
│    ├─ ui/PanelModule
│    ├─ counter/LaunchForm.vue  <CounterLaunchForm>                D  form + ui/PhoneDisplay + AmountField + ui/CounterKeypad + submit
│    │    useFocusTarget('phone' → phoneDisplay.focus())
│    │    └─ counter/AmountField.vue  <CounterAmountField>         D  UFormField/UInput + ui/FieldErrorMessage; useFocusTarget('amount' → focusFirstInput)
│    └─ counter/LaunchFeedback.vue  <CounterLaunchFeedback>        D  contêiner aria-live SEMPRE montado; InkNote erro / InkNote programa / CounterLaunchReceipt
│         └─ counter/LaunchReceipt.vue  <CounterLaunchReceipt>      D  (vindo de ui/LaunchReceipt)
├─ counter/RedemptionPanel.vue  <CounterRedemptionPanel>          D
│    props: v-model:code, status, errorCode, preview, deliveredReward, focusRequest
│    emits: complete, deliver, cancel   (Esc no canhoto → cancel)
│    ├─ ui/RedemptionStub          useFocusTarget('redemptionCode' → stub.focus())
│    └─ counter/RedemptionStatus.vue  <CounterRedemptionStatus>    D  aria-live: conferindo / erro / válido + botões / entregue
└─ counter/LedgerPanel.vue  <CounterLedgerPanel>                  D
     props: status, errorCode, rows / emits: reload
     ├─ ui/PanelModule + ui/PanelRefreshAction (countText = $t('counter.todayCount', n))
     ├─ counter/LedgerSkeleton.vue  <CounterLedgerSkeleton>          D
     └─ counter/CounterLedger.vue  <CounterLedger>                   D  (vindo de ui; região rolável tabindex=0 fica no LedgerPanel)
```

**Browser:** `useFocusRequest`/`useFocusTarget`, `focusFirstInput`. Nada de `window`.

#### A2. `customer/pages/check-in.vue` (hoje: script 142, template 119)

**Composable:** `layers/customer/app/composables/useCheckInScreen.ts` → `useCheckInScreen(): CheckInScreen`

`layers/customer/app/types/checkIn.ts` (com os tipos do `checkInModel`, `CheckInState`, `CheckIn`):
```ts
export type CheckInFocusTarget = 'earnedHeading' | 'code'
export type CheckInMode = 'scan' | 'type'
export type CameraIssue = 'denied' | 'unavailable'
export type ViewfinderStatus = 'busy' | 'scanning' | 'starting'
export interface CheckInHeroStamp { readonly icon: string; readonly tilt: number; readonly tone: 'ink' | 'reward' }
export interface CheckInEarnedView {
  readonly text: CheckInEarnedModel
  readonly card: StampCardModel | null
  readonly heroStamp: CheckInHeroStamp | null
  readonly rewardCardId: LoyaltyCardId | null     // botão "Resgatar" quando o prêmio liberou
}
export interface CheckInScreen {
  readonly view: 'earned' | 'notice' | 'scan' | 'type'
  readonly announcement: string                    // aria-live
  readonly earned: CheckInEarnedView | null
  readonly notice: CheckInNoticeModel | null
  readonly viewfinderStatus: ViewfinderStatus
  readonly cameraIssue: CameraIssue | null
  code: string[]
  readonly codeInvalid: boolean
  readonly typing: boolean
  readonly mockCode: string | null
  readonly focusRequest: FocusRequest<CheckInFocusTarget> | null
  readonly setVideo: (video: HTMLVideoElement | null) => void
  readonly submitTyped: () => void
  readonly typeCode: () => void
  readonly switchToCamera: () => void
  readonly recover: () => void
}
```
`layers/customer/app/types/qrScanner.ts`: `QrScannerStatus`, `QrScannerControl`.

**Sai da página**

| Hoje | Destino |
| --- | --- |
| `?loja=` do link → `router.replace` + `submit(…, 'link')` | `useCheckInScreen` (no setup, mesmo momento) |
| `watch([shouldScan, video])` start/stop da câmera, `watch(scanner.status)` | `useCheckInScreen` (o `<video>` chega por `setVideo`) |
| `viewfinderStatus`, `notice`, `codeError`, `typing`, `earned*`, `heroStamp` | `useCheckInScreen` (mapeadores existentes; `VIEWFINDER_TEXT` vira mapa status→chave dentro de `check-in/ScanStep.vue`) |
| `watch(earned)`: `seenStamps.remember`, `navigator.vibrate`, foco no título | `useCheckInScreen` com `useHaptics().vibrate(...)` e `focus('earnedHeading')`; `STAMP_VIBRATION_MS`/`REWARD_VIBRATION_PATTERN` vão junto |
| `watch(state)`: `unauthorized` → signOut | `useCustomerSessionGuard(() => [state.value])` |
| `watch(state)`: digitado errado → limpa casas + foco | `useCheckInScreen` → `focus('code')` |
| `switchToCamera`, `submitTyped`, `typeCode`, `recover` | `useCheckInScreen` |
| `CHEER_DELAY_MS`, `FALLBACK_STAMP_ICON` | `CHEER_DELAY_MS` em `check-in/EarnedStep.vue`; `FALLBACK_STAMP_ICON` no composable |

**Árvore**

```
customer/pages/check-in.vue                                   S  <p aria-live> + v-if por screen.view; ~30 linhas
├─ check-in/EarnedStep.vue  <CheckInEarnedStep>              D  props: earned, focusRequest
│    ui/PageTitle (focusable; useFocusTarget('earnedHeading')) + ui/StampImpression + ui/StampCard + botões (Resgatar / Carteira)
├─ ui/PageTitle (título + lead conforme modo; só fora do earned)
├─ check-in/Notice.vue  <CheckInNotice>                      D  props: notice / emits: recover, typeCode (botões passam para dentro; some o slot)
├─ check-in/ScanStep.vue  <CheckInScanStep>                  D  props: status / emits: video(el|null), typeCode
│    ui/QrViewfinder (emite o <video> exposto ao montar/desmontar)
├─ check-in/CodeForm.vue  <CheckInCodeForm>                  D  props: v-model:code, cameraIssue, invalid, typing, focusRequest
│    emits: submit, switchToCamera; ui/InkNote (câmera) + UFormField/UPinInput + ui/FieldErrorMessage; useFocusTarget('code' → focusFirstInput)
└─ ui/InkNote (mockCode)
```

**Browser:** `useHaptics` (vibração), `useQrScanner` (câmera, já existe),
`useSeenStamps` (localStorage, já existe), foco via `useFocusTarget`.

#### A3. `merchant/pages/club-setup.vue` (hoje: script 101, template 107)

**Composable:** `layers/merchant/app/composables/useClubSetupScreen.ts` → `useClubSetupScreen(): ClubSetupScreen`

`layers/merchant/app/types/clubSetup.ts` (com os tipos de `clubSetupForm`,
`ClubSetupSubmitState`, `ClubPosterState`, `ClubSetup`):
```ts
export interface SetupStepItem { readonly key: ClubSetupStep; readonly state: 'done' | 'current' | 'next' }
export interface ClubSetupScreen {
  readonly step: ClubSetupStep
  readonly shopName: string                        // trim do nome digitado
  readonly steps: readonly SetupStepItem[]
  form: ClubSetupForm                              // rascunho do store (v-model nos campos)
  readonly shopErrors: ShopFieldErrors
  readonly programErrors: ProgramFieldErrors
  readonly fieldOptions: ProgramFieldOptions
  readonly creating: boolean
  readonly submitError: CreateClubError['code'] | null
  readonly preview: ProgramPreview
  readonly posterStatus: ClubPosterState['status']
  readonly poster: CheckInPosterModel | null
  readonly isPending: boolean
  readonly canApprove: boolean
  readonly submitStep: () => Promise<void>
  readonly back: () => void
  readonly setMode: (mode: ProgramMode) => void
  readonly approve: () => Promise<void>
  readonly print: () => void
  readonly retryPoster: () => Promise<void>
}
```
`layers/merchant/app/types/program.ts` ganha:
```ts
export interface ProgramFieldOptions {
  readonly unit: ProgramUnit
  readonly limits: ProgramFieldLimits
  readonly cooldownOptions: readonly SelectOption[]
  readonly expirationOptions: readonly SelectOption[]
  readonly summaries: ProgramSectionSummaries | null
}
// merchant/app/composables/useProgramFieldOptions.ts
export function useProgramFieldOptions(draft: Readonly<Ref<ProgramDraft | null>>): ComputedRef<ProgramFieldOptions>
```

**Sai da página**

| Hoje | Destino |
| --- | --- |
| `stepItems`, `categories`, `shopLimits`, `shopLabels`, `posterLabels` | `steps` no composable; categorias, limites e textos dentro de `club-setup/ShopFields.vue` / `Steps.vue` / `PosterStep.vue` via `$t` e constantes de `shared` |
| `labels = useProgramFormLabels(program)` | `useProgramFieldOptions` + `$t` nos componentes `program/*` |
| `preview`, `poster`, `isPending`, `submitError`, `approve` | `useClubSetupScreen` |
| `window.print()` | `usePrint()` |
| `watch(step)` foco no `h1`; foco no primeiro `[aria-invalid="true"]` | `useClubSetupScreen` + `focusFirstMatching` (mesmos seletores) |
| `onBeforeRouteLeave` + `window.confirm` + `beforeunload` | `useLeaveGuard({ when: () => step !== 'poster', allow: to => to.path === MERCHANT_SIGN_IN_PATH, message: () => t('clubSetup.leaveConfirm'), warnOnUnload: true })` |
| `useRequestURL().origin` | `useClubSetupScreen` (SSR-safe) |

**Árvore**

```
merchant/pages/club-setup.vue                                    S  ~35 linhas
├─ club-setup/Header.vue  <ClubSetupHeader>                    D  props: shopName, steps (app name, "Criando para…", ClubSetupSteps)
│    └─ club-setup/Steps.vue  <ClubSetupSteps>                  D  (de setup/Steps; $t por key)
├─ club-setup/FormStep.vue  <ClubSetupFormStep>                D  props: step, creating, submitError / emits: submit, back
│    PageTitle (focusable) + fieldset + slot + InkNote erro (ação "confirmar celular" p/ signUpExpired) + navegação
│    ├─ club-setup/ShopStep.vue  <ClubSetupShopStep>          D  PanelModule + ClubSetupShopFields (v-model:shop, errors)
│    │    └─ club-setup/ShopFields.vue  <ClubSetupShopFields>  D  (de setup/ShopFields; categorias/limites/$t dentro)
│    ├─ club-setup/RulesStep.vue  <ClubSetupRulesStep>        D  ProgramEarnFields + ProgramVisitRulesFields
│    └─ club-setup/RewardStep.vue  <ClubSetupRewardStep>      D  ProgramRewardTitleField + ProgramBonusFields
├─ program/PreviewAside.vue  <ProgramPreviewAside>             D  props: preview, ariaLabel, title, headingLevel (compartilhado com program.vue)
└─ club-setup/PosterStep.vue  <ClubSetupPosterStep>            D  props: status, poster, isPending, canApprove / emits: approve, print, retry ($t dentro)
     └─ club-setup/Poster.vue  <ClubSetupPoster>                D  (vindo de ui/CheckInPoster)

merchant/components/program/ (compartilhados; migram neste lote)
├─ EarnFields.vue        props: unit, limits, errors, modeLocked, targetChanged; v-model:rules; emits mode   ($t dentro)
├─ BonusFields.vue       props: unit, limits, errors; v-model:bonus                                         ($t + unitsText dentro)
├─ VisitRulesFields.vue  props: cooldownOptions, expirationOptions, errors; v-model:check-in, v-model:expiration
└─ RewardTitleField.vue  <ProgramRewardTitleField> (novo) v-model:title, invalid  — mesmo bloco em club-setup e program
```

O PR do A3 atualiza também a fiação de `program.vue` para os novos props de
`program/*` (sem refatorar a página; isso é o C1).

### Lote B

| Página | Composable de tela (retorno) | Componentes novos / movidos | Sai do script → | Browser |
| --- | --- | --- | --- | --- |
| **B1 `customer/discover.vue`** (template 103) | `useDiscoverScreen(): DiscoverScreen` — `query` (rw), `searching`, `loading`, `shopsErrorCode`, `isEmpty`, `hero: DiscoverHeroModel \| null` (com `filled`/`total` calculados), `otherChallenges`, `fresh`, `known`, `mapUrl`, `reloadShops` | `discover/Header.vue` (ScreenHeader + link do mapa + busca, `v-model:query`), `discover/HeroChallenge.vue` (HeroCard), `discover/ChallengeList.vue`, `discover/FreshShops.vue` (título, link, lista ShopCard, vazio/sem resultado), `discover/KnownShops.vue`, `discover/Skeleton.vue` | filtros/agrupamentos/mapeadores, `walletShopIds`, `CITY_HEADER_IMAGE`, guarda `unauthorized` → `useCustomerSessionGuard`; o `stops.filter(...).length` do template vai para o composable | — |
| **B2 `merchant/campaigns.vue`** (template 84) | `useCampaignsScreen(): CampaignsScreen` — `status`, `errorCode`, `reach`, `preview`, `history`, `draft` (rw), `fieldErrors`, `limits`, `sending`, `feedback: { tone; text } \| null`, `reachable`, `confirm: { open; recipients; bonusLine }`, `submit`, `confirmSend`, `closeConfirm`, `reload` | `campaigns/ReminderForm.vue` (PanelModule + form + fieldset + `CampaignsReminderFields` + `ui/InlineStatus` + enviar), `campaigns/SendConfirmModal.vue` (UModal), `campaigns/Skeleton.vue`; pasta `campaign/` → `campaigns/` ($t dentro de ReachSummary, ReminderPreview, HistoryList, ReminderFields) | `fieldLabels`, `limits`, `confirmBonus`, `sendMessage`, `onSubmit/onConfirm`, guarda | — |
| **B3 `merchant/merchant-sign-in.vue`** | `useMerchantSignInScreen(): MerchantSignInScreen` — `step`, `phoneDraft` (rw), `code` (rw), `phoneErrorCode`, `codeErrorCode`, `sentTo`, `pending`, `resendIn`, `mockCode`, `mockPhone`, `focusRequest`, `inputPhone`, `requestCode`, `submitCode` (navegação por `outcome` + `safeMerchantReturnPath`), `resend`, `backToPhone` | `merchant-sign-in/Aside.vue` (`<MerchantSignInAside>`; passos e marca via `$t`), `merchant-sign-in/PhoneForm.vue`, `merchant-sign-in/CodeForm.vue` (UPinInput + `useFocusTarget('code')`) | `steps`, `errorText`, `sentTo`, `onPhoneInput`, `submitCode`, `backToPhone`, foco por `$el` | foco |
| **B4 `merchant/customers.vue`** | `useCustomersScreen(): CustomersScreen` — `filter` (rw), `status`, `errorCode`, `count`, `rows`, `reachableLapsed`, `showLapsedHint`, `reload` | `customers/FilterTabs.vue` (UTabs + `useId`, itens via `$t`), `customers/LapsedHint.vue`, `customers/Table.vue` (de `ui/CustomerTable`; labels → `$t`), `customers/TableSkeleton.vue`; `ui/PanelRefreshAction` | os 2 `watch` de sincronia filtro ↔ `?filtro=` (com `router.replace`, mesmas regras), `filterItems`, `onFilterChange`, `tableLabels`, guarda | — |

### Lote C

| Página | Composable de tela (retorno) | Componentes | Sai do script → | Browser |
| --- | --- | --- | --- | --- |
| **C1 `merchant/program.vue`** | `useProgramScreen(): ProgramScreen` — `status`, `errorCode`, `draft` (rw), `fieldErrors`, `fieldOptions`, `modeLocked`, `targetChanged`, `isDirty`, `saving`, `feedback`, `preview`, `bonusOpen`/`visitRulesOpen` (rw), `setMode`, `save`, `discard`, `reload` | `program/CardPanel.vue` (RewardTitleField + EarnFields), `program/SaveBar.vue` (barra fixa; `ui/InlineStatus`, descartar, salvar), `program/EditorSkeleton.vue`, `program/PreviewAside.vue` (do A3) | `watch(saveState)` que reabre seção com erro, guarda `unauthorized`, `preview`, `saveMessage` | `useLeaveGuard({ when: isDirty && sessão, allow: login, message: 'program.save.leaveConfirm', warnOnUnload: false })` |
| **C2 `customer/sign-in.vue`** | `useSignInScreen(): SignInScreen` — como B3 + `consent` (rw), sem navegação de lojista | `sign-in/Hero.vue` (`<SignInHero>`), `sign-in/PhoneForm.vue`, `sign-in/CodeForm.vue` (consent switch, termos, reenviar) | `codeFieldElement`, `errorText`, `sentTo`, `onPhoneInput`, `submitCode`, `backToPhone` | foco |
| **C3 `customer/profile.vue`** | `useProfileScreen(): ProfileScreen` — `status`, `errorCode`, `maskedPhone`, `notifications`, `savingConsent`, `birthday`, `birthdayPending`, `birthdayLockedUntil`, `setConsent`, `saveBirthday`, `removeBirthday`, `reload`, `signOut`. **A página hoje chama `useCustomerServices()` direto** — sai para `customer/app/composables/useProfileEditor.ts` (estado + ações, devolve resultado) e o toast fica no composable de tela | `profile/AccountCard.vue` (celular mascarado + switch de avisos), `profile/BirthdayForm.vue` (`<ProfileBirthdayForm>`; script vira `customer/app/composables/useBirthdayDraft.ts`; recebe `lockedUntil: string \| null` e monta `$t` dentro), `profile/AppearanceSection.vue` (ThemeChoice + `useThemeChoiceLabels`) | `birthdayLabels`, `themeLabels`, `onConsentChange`, `saveBirthday`, guarda | — |
| **C4 `customer/rewards.vue`** | `useRewardsScreen(): RewardsScreen` — `cardsStatus`, `cardsErrorCode`, `hasCards`, `ready`, `upcoming`, `closest`, `historyStatus`, `historyErrorCode`, `history`, `reloadCards`, `reloadHistory` | `rewards/Skeleton.vue`, `rewards/ReadySection.vue`, `rewards/UpcomingSection.vue`, `rewards/HistorySection.vue` | agrupamentos/mapeadores, guarda | — |
| **C5 `customer/reward-redemption.vue`** | `useRewardRedemptionScreen(): RewardRedemptionScreen` — `status`, `errorText`, `canRetry`, `title`, `back: { to; labelKey }`, `card`, `ticket`, `icon`, `rewardTitle`, `announcement`, `heldUntil`, `retryOrLeave`, `regenerate` | `reward-redemption/TicketSkeleton.vue`, `reward-redemption/TicketActions.vue` (como usar / gerar de novo / voltar) | `card`, `ticket`, `announcement`, `heldUntil`, `errorText` (caso `rewardNotReady`), `back` (`router.options.history.state.back`), `canRetry`, guarda | — |
| **C6 `customer/wallet.vue`** | `useWalletScreen(): WalletScreen` — `greeting`, `cardsStatus`, `cardsErrorCode`, `cards`, `activeId` (rw), `ledgerStatus`, `ledger`, `reloadCards` | `wallet/Header.vue` (ScreenHeader + link do perfil), `wallet/Stack.vue` (CardStack com `showLabel`/`moreLabel` via `$t`), `wallet/LedgerSection.vue`; `Empty`/`Problem`/`StackSkeleton` já em `wallet/` | `watch(cardsState)` com `seenStamps`, guarda, `greeting`, `ledger` | `useSeenStamps` (já existe) |
| **C7 `merchant/home.vue`** | `useMerchantHomeScreen(): MerchantHomeScreen` — `status`, `errorCode`, `headline`, `weekRows`, `lapsedRows`, `lapsedTotal`, `reachable`, `lapsedLink`, `reload` | `home/WeekPanel.vue`, `home/LapsedPanel.vue` (LapsedPreview + lembrar + "ver todos"), `home/Skeleton.vue`; `LapsedPreview` com `$t` | mapeadores, `lapsedLabels`, guarda | — |
| **`merchant/settings.vue`** (fora dos lotes) | sem composable de tela (sem lógica) | — | `themeLabels` → `useThemeChoiceLabels()` | — |

Tipos dos retornos de B e C: `types/discover.ts`, `types/campaign.ts`,
`types/signIn.ts`, `types/customer.ts`, `types/program.ts`, `types/profile.ts`,
`types/reward.ts`, `types/redemption.ts`, `types/wallet.ts`, `types/home.ts`
da respectiva superfície, no padrão de `CounterScreen` (forma desembrulhada).

SSR: as 15 páginas são **client-only hoje** (`ssr: false`, mock em
`localStorage`); nenhuma passa a usar `useAsyncData`. Quando o SSR ligar, o
composable de tela é o único ponto a trocar `useAsyncResult` por
`useAsyncData` com chave `<tela>:<recurso>` (`counter:ledger`,
`wallet:cards`). Páginas candidatas a SSR depois: `sign-in`,
`merchant-sign-in` (sem dado de sessão). As demais dependem de sessão e
podem continuar client-only.

---

## 4. Mapa de tipos

Fica onde está (decisão, ver riscos): `interface Props`/`interface Emits` locais
e **não exportadas** do SFC (são o contrato do componente e o compilador do Vue
resolve tipos de props importados com limitações); a `interface` de cada
service **e as uniões de erro da sua assinatura** (`SignInError`,
`MerchantSignInError`, `UpdateProgramError`, `ShopClosedError`,
`RegisterVisitError`, `ValidateRedemptionError`, `CampaignOverviewError`,
`SendReminderError`, `CreateClubError`, `CheckInError`, `SessionProvider` e
aliases, `MerchantServices`, `CustomerServices`); `layers/core/app/mock/**`
(implementação do repositório; tipos já derivados de Zod em `state.ts`).

| Arquivo atual | Declarações | Destino |
| --- | --- | --- |
| `core/app/composables/useAsyncResult.ts` | `AsyncResultState`, `AsyncResult` | `core/app/types/asyncResult.ts` |
| `core/app/utils/translate.ts` | `Translate` | `core/app/types/i18n.ts` (arquivo apagado) |
| `core/app/utils/sessionPersistence.ts` | `StoredSessions` | `core/app/types/session.ts` (schema com `satisfies z.ZodType<StoredSessions>`) |
| `core` (inline) | retorno de `useCountdown`, `useMerchantSession`, `useCustomerSession`, `useSeenStamps` | recomendado nomear: `Countdown` (`core/types/countdown.ts`), `MerchantSessionControl`, `CustomerSessionControl`, `SeenStamps` |
| `ui/app/utils/qrPath.ts` | `QrPath` | `ui/app/types/qr.ts` |
| `ui/app/utils/tallyGroups.ts` | `TallyGroups` | `ui/app/types/tally.ts` |
| `ui/app/types/counter.ts` | `CounterLedgerEntryModel`, `LaunchReceiptModel` / `CounterKeypadLabels` | `merchant/app/types/counter.ts` / `ui/app/types/keypad.ts` |
| `ui/app/types/customers.ts` | `CustomerRowModel`, `CustomerTableLabels` | `merchant/app/types/customer.ts` (`CustomerTableLabels` some no B4) |
| `ui/app/types/poster.ts` | `CheckInPosterModel` | `merchant/app/types/poster.ts` |
| `customer/app/components/BirthdayForm.vue` | `BirthdayFormLabels` (export), `BirthdayAction` (export) | `customer/app/types/profile.ts` (`BirthdayFormLabels` some no C3) |
| `customer/app/utils/birthdayModel.ts` | `BirthdayOption`, `BirthdayParts` | alias de `SelectOption` (`ui/types/form.ts`) / `customer/types/profile.ts` |
| `customer/app/utils/checkInModel.ts` | `CheckInSource`, `CheckInRecovery`, `CheckInNoticeModel`, `CheckInMoment`, `CheckInEarnedModel` | `customer/app/types/checkIn.ts` |
| `customer/app/composables/useCheckIn.ts` | `CheckInState`, `CheckIn` | `customer/app/types/checkIn.ts` |
| `customer/app/composables/useQrScanner.ts` | `QrScannerStatus`, `QrScannerControl` | `customer/app/types/qrScanner.ts` |
| `customer/app/utils/discoverModel.ts` | `ShopGroups` | `customer/app/types/discover.ts` |
| `customer/app/utils/rewardsModel.ts` | `RewardGroups` | `customer/app/types/reward.ts` |
| `customer/app/utils/walletCardModel.ts` | `WalletCardModelOptions` | `customer/app/types/wallet.ts` |
| `customer/app/composables/useSeenStamps.ts` | `SeenBalances` | `customer/app/types/wallet.ts` |
| `customer/app/composables/useCustomerSignIn.ts` | `SignInStep`, `CustomerSignIn` | `customer/app/types/signIn.ts` (`SignInStep` = alias de `PhoneSignInStep`) |
| `customer/app/composables/useRewardRedemption.ts` | `RewardRedemptionError`, `RewardRedemptionState`, `RewardRedemption` | `customer/app/types/redemption.ts` |
| `merchant/app/utils/campaignModels.ts` | `ReachLine`, `ReachModel`, `ReminderPreviewModel`, `CampaignHistoryRow` | `merchant/app/types/campaign.ts` |
| `merchant/app/utils/reminderForm.ts` | `ReminderField`, `ReminderFieldErrors`, `ReminderFieldsLabels`, `ReminderFieldLimits` | `merchant/app/types/campaign.ts` (`ReminderFieldsLabels` some no B2) |
| `merchant/app/composables/useCampaigns.ts` | `ReminderSendState`, `Campaigns` | `merchant/app/types/campaign.ts` |
| `merchant/app/utils/clubSetupForm.ts` | `ClubSetupStep`, `ClubSetupFormStep`, `ShopField`, `ShopFieldErrors`, `ShopProfileForm`, `ClubSetupForm` | `merchant/app/types/clubSetup.ts` |
| `merchant/app/utils/clubSetupLabels.ts` | `SetupStepItem`, `ShopFieldsLabels`, `ShopFieldLimits`, `PosterStepLabels` | `merchant/app/types/clubSetup.ts` (`*Labels` somem no A3) |
| `merchant/app/composables/useClubSetup.ts` | `ClubSetupSubmitState`, `ClubPosterState`, `ClubSetup` | `merchant/app/types/clubSetup.ts` |
| `merchant/app/utils/counterAction.ts` | `CounterAction` | `merchant/app/types/counter.ts` |
| `merchant/app/composables/useCounterLaunch.ts` | `CounterLaunchState`, `CounterLaunch` | `merchant/app/types/counter.ts` |
| `merchant/app/composables/useCounterLedger.ts` | `CounterLedger` | `merchant/app/types/counter.ts` |
| `merchant/app/composables/useRedemptionCheck.ts` | `RedemptionCheckState`, `RedemptionCheck` | `merchant/app/types/counter.ts` |
| `merchant/app/utils/homeModels.ts` | `WeekDayRow`, `LapsedPreviewLabels` | `merchant/app/types/home.ts` (`LapsedPreviewLabels` some no C7) |
| `merchant/app/composables/useMerchantHome.ts` | `MerchantHomeSnapshot`, `MerchantHome` | `merchant/app/types/home.ts` |
| `merchant/app/composables/useMerchantCustomers.ts` | `MerchantCustomers` | `merchant/app/types/customer.ts` |
| `merchant/app/composables/useMerchantSignIn.ts` | `MerchantSignInStep`, `MerchantSignInOutcome`, `MerchantSignIn` | `merchant/app/types/signIn.ts` (`MerchantSignInStep` = alias de `PhoneSignInStep`) |
| `merchant/app/composables/useShopStatus.ts` | `ShopStatusSync` | `merchant/app/types/session.ts` |
| `merchant/app/utils/programForm.ts` | `ProgramField`, `ProgramFieldErrors` | `merchant/app/types/program.ts` |
| `merchant/app/utils/programFormLabels.ts` | `NumberRange`, `ProgramFieldLimits`, `ModeOptionLabel`, `EarnFieldsLabels`, `BonusToggleLabel`, `BonusFieldsLabels`, `SelectOption`, `VisitRulesLabels` | `merchant/app/types/program.ts`; `SelectOption` → `ui/app/types/form.ts` (`*Labels`/`ModeOptionLabel`/`BonusToggleLabel` somem no A3) |
| `merchant/app/utils/programPreviewModel.ts` | `ProgramPreview` | `merchant/app/types/program.ts` |
| `merchant/app/utils/programSummary.ts` | `ProgramFoldSection`, `ProgramSectionSummaries` | `merchant/app/types/program.ts` |
| `merchant/app/composables/useProgramEditor.ts` | `ProgramSnapshot` (local), `ProgramSaveState`, `ProgramEditor` | `merchant/app/types/program.ts` |
| `merchant/app/composables/useProgramFormLabels.ts` | `ProgramFormLabels` | substituído por `ProgramFieldOptions` (`types/program.ts`) |

**Duplicatas / derivações**

| # | Duplicata | Ação |
| - | --- | --- |
| 1 | `StoredSessions` repete `z.infer<typeof StoredSessionsSchema>` | uma definição + `satisfies` |
| 2 | `ShopProfileForm` reescreve `ShopProfileDraft` (só `category` anulável) | `type ShopProfileForm = Omit<ShopProfileDraft, 'category'> & { category: ShopCategory \| null }` |
| 3 | `ClubSetupForm` reescreve `ClubSetupDraft` | `{ shop: ShopProfileForm; program: ClubSetupDraft['program'] }` |
| 4 | `RewardRedemptionError` repete a união inline de `RewardRedemptionService.requestCode` | nomear `RequestRedemptionCodeError` no arquivo do service; o tipo do composable vira alias |
| 5 | `SignInStep` (cliente) ≡ `MerchantSignInStep` | `PhoneSignInStep` em `core/app/types/signIn.ts`; os dois nomes ficam como alias (assinatura igual) |
| 6 | `BirthdayOption` ≡ `SelectOption` | `SelectOption` em `ui/app/types/form.ts` |
| 7 | `CounterLedgerEntryModel.phone: string` enquanto `CustomerRowModel.phone: MaskedPhone` e `CounterEntry.maskedPhone: MaskedPhone` | apertar para `MaskedPhone` (LGPD: o tipo impede passar celular cru para a caderneta) |
| 8 | `ProgramSnapshot`/`MerchantHomeSnapshot`/estados de tela × `AsyncResultState` | não são duplicata (formas diferentes); ficam |

Arquivo `tsconfig.test.json`: incluir `layers/{core,customer,merchant}/app/types/**/*.ts`,
`layers/core/app/utils/**/*.ts`; tirar `layers/core/app/utils/translate.ts`.

---

## 5. Limites numéricos e texto para o `CLAUDE.md`

Contagem: linhas não vazias entre as tags `<script>`/`<template>`.

| Arquivo | Limite |
| --- | --- |
| Página: `<script>` | ≤ 30 linhas; só `definePageMeta`, `usePageTitle`, **uma** chamada a `use<Tela>Screen()` (e `useRoute` para parâmetro de rota); zero `function`, `watch`, `computed`, `ref` |
| Página: `<template>` | ≤ 60 linhas |
| Componente (`ui` ou superfície): `<template>` | ≤ 80 linhas; acima disso, quebrar por bloco |
| Componente: `<script>` | ≤ 40 linhas; sem `watch` (usar composable), sem acesso a service/store/rota, sem `window`/`document`/`navigator` |
| Composable de tela | ≤ 150 linhas; acima disso, extrair sub-composable por bloco (`useCounterLaunchForm`) |

Verificação automática: `layers/core/test/conventions.test.ts` (Vitest, lê os
arquivos) checa os limites, `export (interface|type)` fora de `types/` e
`window.`/`navigator.` fora de composable de browser. Começa com uma lista de
exceções (as páginas ainda não migradas) que cada PR encolhe.

**Texto proposto — `CLAUDE.md`, seção "Componentes" (substitui a seção inteira):**

```markdown
### Componentes

- **Página = rota + composição.** Só `definePageMeta`, `usePageTitle`, uma
  chamada a `use<Tela>Screen()` e o template com componentes. Script ≤ 30
  linhas, template ≤ 60, nenhuma função de regra, formatação ou foco. A página
  não desestrutura o retorno do composable de tela (é um `reactive`).
- **Composable de tela** (`composables/use<Tela>Screen.ts`, na raiz da pasta):
  orquestra composables de dado, guarda de sessão, foco e textos derivados.
  ≤ 150 linhas; acima disso, sub-composable por bloco.
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
  `useHaptics`, `useQrScanner`, `usePrint`, `useLeaveGuard`).
- **Pastas.** `components/<arquivo-da-página>/<Bloco>.vue` nas superfícies
  (nome no template: `<Pasta><Bloco>`); componente usado por várias telas fica
  na pasta do domínio dono. `layers/ui` só tem peças do design system sem
  domínio de uma superfície.
- **Store × composable.** Vira store `use<Domínio>Store` só estado que
  sobrevive à troca de página, é lido por mais de uma página/layout, ou é a
  sessão. O resto é composable da tela. Celular digitado nunca vai para store.
```

**Texto proposto — `CLAUDE.md`, seção "Tipagem" (acrescentar ao fim):**

```markdown
- **Tipos em arquivo próprio:** `layers/<layer>/app/types/<domínio>.ts`
  (nome do glossário, singular) para props compartilhadas, view-models,
  estados e retornos de composable. Em `.vue`, `utils/`, `composables/` e
  `services/` só `import type`. Exceções: `interface Props`/`Emits` locais e
  não exportadas do SFC, e a interface do service com as uniões de erro da sua
  assinatura. Arquivo em `types/` importa `Ref`/`ComputedRef` de `'vue'`.
- Tipo de domínio não se reescreve: deriva de `shared/schemas`
  (`z.infer`, `Omit`, `Pick`); celular em view-model é sempre `MaskedPhone`.
```

---

## 6. Subtarefas sugeridas

Ordem: QA-0 → (T1 ∥ U1) → S1 → N-A1 ∥ N-A2 ∥ N-A3 → lote B → lote C. Cada PR:
`pnpm typecheck` e `pnpm test` verdes antes e depois, **nenhuma chave em
`pt-BR.json` alterada**.

| ID | Dono | O quê | Depende de | NÃO toca |
| --- | --- | --- | --- | --- |
| **QA-0** | qa | `vitest.config.ts` em dois projetos: `unit` (node, testes atuais) e `nuxt` (`@nuxt/test-utils`, `environment: 'nuxt'`, `layers/*/test/**/*.nuxt.test.ts`). Rede de segurança com mock backend e seed: Balcão (lançar visita por celular/teclado, valor, celular inválido → foco; validar resgate, código errado → casas limpas e foco no canhoto; entregar), check-in (QR, código digitado, link `?loja=`, cooldown, `unauthorized`), criar o clube (avançar com erro → foco no campo, criar, cartaz, aviso ao sair). Snapshot só do **texto** renderizado das telas do lote A com seed fixa (detecta texto alterado). Esqueleto de `layers/core/test/conventions.test.ts` com lista de exceções | — | código de `app/` |
| **T1** | dev-tipos | Criar `types/` em core/customer/merchant (+ `ui/types/{qr,tally,keypad,form,focus}.ts`); mover todas as declarações da seção 4 (exceto as de U1); derivações/duplicatas 1–7; `shared/utils/dateFormat.ts` (+ teste de saída idêntica) e troca dos 7 `Intl.DateTimeFormat`; `core/app/utils/units.ts`; `core/app/utils/errorCode.ts` (+ teste); ajustar imports e `tsconfig.test.json`; regra de tipos no `conventions.test.ts` | QA-0 | `.vue` além de linhas de import; componentes; props; `ui/types/{counter,customers,poster}.ts` (são de U1); lógica |
| **U1** | dev-ui | Mover `CounterLedger`, `LaunchReceipt`, `CheckInPoster`, `CustomerTable` e seus tipos para `merchant` (seção 1b), **mesmos props**; ajustar as tags nas páginas. Mover pastas preservando props: `setup/`→`club-setup/`, `campaign/`→`campaigns/`, componentes do cliente para `check-in/`, `sign-in/`, `wallet/`, `profile/`, `MerchantSignInAside` → `merchant-sign-in/Aside.vue`. Quebrar `RedemptionTicket` (`RedemptionTicketCode.vue`, `RedemptionTicketTimer.vue`; soletrar/agrupar → `ui/utils/ticketCode.ts`) e `ShopCard` (`ShopCardMedia.vue`, `ShopCardPreview.vue`; grade → `ui/utils/slotGrid.ts`). Tirar lógica de `PhoneDisplay` (`useInputCaret`, `describedBy` → `ui/utils/aria.ts`), `RedemptionStub` (`focusFirstInput`), `CardStack` (`ui/utils/cardStack.ts#stackPeeks`, com teste). Criar `useFocus.ts`, `useInputCaret.ts` (ui), `useLeaveGuard`, `usePrint`, `useHaptics`, `usePageTitle`, `useThemeChoiceLabels` (core) e `FieldErrorMessage`, `PanelRefreshAction`, `InlineStatus` (ui), com teste | QA-0 | páginas além da troca de tag; i18n; composables de tela; tipos fora dos que move |
| **S1** | dev-stores | `useMerchantSessionGuard` e `useCustomerSessionGuard` (+ testes de paridade: transição, precedência de `unauthorized`, `refreshShopStatus`). `core/stores/session.ts` SSR-safe (`import.meta.client` antes de ler `localStorage`; saída idêntica no SPA). **Nenhum store novo** | T1 | páginas (a fiação é do dev-nuxt); services |
| **N-A1** | dev-nuxt | `counter.vue` (seção 3 A1) | T1, U1, S1 | outras páginas; `layers/ui` |
| **N-A2** | dev-nuxt | `check-in.vue` (A2) | T1, U1, S1 | idem |
| **N-A3** | dev-nuxt | `club-setup.vue` (A3), `useProgramFieldOptions`, migração de `program/*` para `$t` e fiação mínima em `program.vue` | T1, U1, S1 | refatoração de `program.vue` (é o C1) |
| **N-B1…B4** | dev-nuxt | discover, campaigns, merchant-sign-in, customers | lote A integrado | — |
| **N-C1…C7** | dev-nuxt | program, sign-in, profile, rewards, reward-redemption, wallet, home (+ settings) | lote B integrado | — |
| **QA-n** | qa | Para cada página migrada: teste do composable de tela (ambiente `nuxt`) e dos componentes novos de `components/<tela>/`; teste de componente para as peças de domínio de `layers/ui`; remover a página da lista de exceções do `conventions.test.ts` | página correspondente | código de `app/` |

Revisão: `code-reviewer` em A1–A3, B3, B4, C2, C3, C5 e em S1; `revisor-ui`
no resto e em U1.

---

## 7. Riscos

| # | Risco | Mitigação |
| - | --- | --- |
| 1 | **Componente não resolvido em silêncio.** Renomear pasta muda o nome no template (`SetupSteps` → `ClubSetupSteps`, `Campaign*` → `Campaigns*`, `BirthdayForm` → `ProfileBirthdayForm`, os 4 que saem de `ui`); o Vue só avisa no console | `grep` de cada nome antigo no PR de U1; testes de página do QA-0 montam as telas e falham com componente desconhecido |
| 2 | **Auto-import global entre layers.** `composables/` e `utils/` de todas as layers caem no mesmo namespace | nomes de composable de tela com prefixo de superfície quando ambíguos; `types/` fica fora do auto-import; `unitsText`/datas saem de `utils/` de superfície para `core`/`shared` com import explícito |
| 3 | **Reatividade perdida** ao desestruturar o `reactive` do composable de tela | regra no `CLAUDE.md`; revisão |
| 4 | **Foco e acessibilidade no Balcão** (iPad, teclado físico, leitor de tela) | manter: `inputmode="none"` e campo real sobre o visor; teclas `tabindex="-1"` + `@mousedown.prevent`; foco no celular ao montar, depois de lançar e em celular inválido; Enter com valor vazio passa ao valor; Esc limpa (lançamento) / cancela (resgate); foco no canhoto após erro, **depois** de limpar as casas (`useFocusTarget` com `flush: 'post'`); contêineres `aria-live` sempre montados (o `v-if` vai dentro deles); região rolável da caderneta com `tabindex="0"`; alvos ≥ 44px. Coberto pelo QA-0 |
| 5 | **LGPD — celular.** O celular digitado vive só no estado local de `useCounterLaunch`/sign-in (não entra em store, URL, log, `focusRequest` nem snapshot de teste); listas recebem só `MaskedPhone` (tipo apertado na `CounterLedgerEntryModel`); `PhoneDisplay` não muda; guardas não logam. Testes usam os números falsos do `seed.example.ts` | `code-reviewer` obrigatório em A1, B3, B4, C2, C3 |
| 6 | **Paridade da guarda de sessão** (seção 1c) | testes do S1 reproduzem os cenários de cada página antes de trocar o `watch` |
| 7 | **SSR** (desligado, mas o código fica pronto) | composables de browser checam `import.meta.client`; `session.ts` deixa de ler `window` na criação; nenhum estado mutável de módulo (os `Intl.DateTimeFormat` de módulo são imutáveis; `let` só dentro de função); `useRequestURL` no lugar de `window.location`; nada de `useAsyncData` novo |
| 8 | **Texto alterado sem querer** ao trocar `labels` por `$t` (parâmetros de interpolação, plural) | mesmas chaves e mesmos parâmetros; snapshot de texto do QA-0; checagem "nenhuma chave i18n alterada" no PR |
| 9 | **Conflito entre PRs paralelos**: `program/*` é usado por A3 e C1; `counterModels.ts` por T1 e U1 | A3 faz a fiação mínima em `program.vue`; U1 é dono dos 3 arquivos de tipo que saem de `ui` e T1 não os toca |
| 10 | **Typecheck de teste** quebra ao mover tipos que usam `Ref` global | `import type { Ref } from 'vue'` nos `types/`; `tsconfig.test.json` atualizado no T1 |
| 11 | **Desvio do `responsibilities.md`**: `interface Props/Emits` locais ficam no SFC; uniões de erro ficam com o service; sem store novo | listado em "decisões para o CTO" |

---

## 8. Decisões que precisam do CTO / usuário

1. Trocar a frase do `CLAUDE.md` sobre i18n em dumb components (decisão a, texto na seção 5).
2. `interface Props`/`Emits` locais continuam no `.vue` (a checagem do `responsibilities.md` passa a ser `export (interface|type)` em `.vue`).
3. Uniões de erro da assinatura do service ficam no arquivo do service.
4. Nenhum store Pinia novo; `shopStatus` continua no `useSessionStore`.
5. Atualizar a faixa da loja em erro de loja fechada **só no Balcão** (paridade) ou em todo o painel (melhoria, muda comportamento).
6. Formatação de data em `shared/utils/dateFormat.ts` (e não em `core`).
7. Renomear `components/campaign/` → `campaigns/` (regra mecânica: pasta = arquivo da página) ou manter como exceção.

---

## 9. Decisão do CTO (2026-10-03)

**Veredito: aprovado com ajustes.** Lido antes de decidir: `counter.vue`,
`check-in.vue`, `club-setup.vue`, `core/stores/session.ts`,
`merchant/stores/clubSetup.ts`, `useCounterLaunch`, `useShopStatus`,
`ui/PhoneDisplay.vue`, `ui/types/counter.ts`, `nuxt.config.ts`,
`vitest.config.ts`, `tsconfig.test.json` e os usos de `window`/`navigator`/
`document` em `layers/`. O desenho preserva os fluxos críticos, não cria
dependência de `layers/ui` em domínio nem de componente em service, e aperta
o tipo do celular na caderneta. Os ajustes abaixo fecham as lacunas de
paridade, de conflito entre PRs paralelos e de LGPD em teste.

### Decisões consolidadas (seção 8)

| # | Decisão |
| - | --- |
| 1 | Componente de superfície (`customer`/`merchant`/`admin`) chama `$t()` com chave do próprio domínio e recebe códigos de erro; `layers/ui` continua sem i18n. `CLAUDE.md` → Componentes atualizado. |
| 2 | `interface Props`/`Emits` locais e não exportadas ficam no `.vue`. A checagem passa a buscar só `export (interface\|type)` fora de `types/`. `CLAUDE.md` → Tipagem e `responsibilities.md` §5 atualizados. |
| 3 | As uniões de erro da assinatura de cada service ficam no arquivo do service, junto da interface. |
| 4 | Nenhum store Pinia novo. `shopStatus` segue em `useSessionStore`; caderneta, lançamento e resgate do Balcão seguem em composable. |
| 5 | Erro de loja fechada (`shopPendingApproval`/`shopSuspended`) atualiza a situação da loja **só no Balcão**, como hoje. Estender ao painel inteiro é tarefa separada, fora deste refactor. |
| 6 | Datas em `shared/utils/dateFormat.ts` (recomendação do arquiteto). |
| 7 | `components/campaign/` → `campaigns/` (recomendação do arquiteto). |

### Ajustes obrigatórios

1. **Paridade da guarda no Balcão (S1).** Hoje o `watch` de `counter.vue`
   reavalia a cada mudança de qualquer um dos 4 estados. Um `computed<boolean>`
   agregado não dispara de novo quando a caderneta continua em
   `shopSuspended` e o lançamento falha com o mesmo código. A guarda deve
   observar o código de erro **de cada fonte separadamente** (dispara quando o
   código de uma fonte muda, inclusive `error → pending → error`), com
   `unauthorized` tendo precedência sobre loja fechada. Teste do S1 com duas
   fontes em erro ao mesmo tempo. No check-in, `unauthorized` mantém o
   retorno antecipado de hoje: sai sem limpar as casas nem mover o foco.
2. **Ordem de merge na onda 1.** T1 e U1 seguem em paralelo, mas U1 faz as
   movimentações (`git mv`, sem mudar conteúdo) num commit próprio e entra
   primeiro; T1 rebaseia e resolve os conflitos de import (`BirthdayForm.vue`
   muda de profundidade, `counterModels.ts`, `club-setup.vue` e `program.vue`
   são tocados pelos dois).
3. **`conventions.test.ts` (QA-0).** Exceções de I/O fora de composable são
   nomeadas e permanentes, separadas da lista transitória de páginas não
   migradas: `core/app/stores/session.ts`, `core/app/plugins/backend.ts`,
   `core/app/mock/**`. A lista transitória tem um caminho por linha, em ordem
   alfabética (N-A1/A2/A3 editam a mesma lista em paralelo).
4. **LGPD em teste e view-model.** Snapshot de texto do QA-0 só em estados sem
   celular digitado no visor (montagem, depois do lançamento, preview de
   resgate); nenhum teste loga o celular. `CounterRedemptionPreviewModel.customerLine`
   é montado só a partir de `preview.maskedPhone` (`MaskedPhone`), nunca do
   estado do lançamento. `focusRequest` carrega só alvo e id. As guardas não
   logam nada.
5. **`session.ts` (S1).** `import.meta.client` só evita ler `window` fora do
   navegador; não é suporte a SSR. Nenhuma leitura nova de `localStorage`
   entra no refactor, e `ssr` continua `false`. A sessão do backend real
   (cookie `httpOnly`) é decisão do ADR do backend, não deste PR.
6. **Câmera (N-A2).** O caminho `setVideo` → `useQrScanner` não roda em
   happy-dom. O PR do check-in registra teste manual em aparelho (Android
   Chrome e iOS Safari): QR lido, câmera negada → modo digitar, link
   `?loja=` (que continua tratado no setup, antes do primeiro render).

### Riscos aceitos

- Componentes de superfície passam a depender de `@nuxtjs/i18n`; seus testes
  rodam no ambiente `nuxt`, mais lento que `node`.
- Vue devtools continua mostrando o celular digitado no estado do composable
  (como hoje); `devtools` do Nuxt só existe em `pnpm dev`.
- Renomear pasta muda o nome do componente no template e o Vue só avisa no
  console; fora do lote A a rede é o teste de página do QA-n.
- `beforeunload` e `window.print` não têm teste automatizado além do
  composable; conferência manual no PR do A3/C1.
- Durante os 3 lotes convivem páginas no padrão antigo e no novo; a lista de
  exceções do `conventions.test.ts` é o controle.
