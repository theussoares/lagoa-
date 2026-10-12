# Design interno do app do cliente — Onda 4 (Perfil, Convite e telas-composição) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar a auditoria do app do cliente: o Perfil e as telas ainda fora do padrão "página = rota + composição" passam a ter um composable de tela, o formulário de aniversário liga a mensagem de ajuda ao campo, e o Convite ganha o visual do resto do app.

**Architecture:** Refatoração sem mudança de comportamento (cada extração é movida palavra por palavra para `use<Tela>Screen`, coberta por teste antes de mexer), seguida de duas melhorias visuais pequenas (Convite com `ScreenHeader`, formulário de aniversário acessível). A lista transitória de `layers/core/test/conventions.test.ts` encolhe a cada tela extraída; nenhuma entrada nova entra nela.

**Tech Stack:** Nuxt 4, Vue 3, Nuxt UI v4, Tailwind v4, Vitest (`node` e `nuxt`), `@nuxt/test-utils`.

**Spec:** `docs/superpowers/specs/2026-10-12-customer-internal-design-design.md` (Onda 4) · Auditoria: `docs/superpowers/specs/2026-10-12-customer-internal-design-audit.md` (achados 10, 11, 14) · Ondas anteriores: `docs/superpowers/plans/2026-10-12-customer-internal-design.md`, `...-wave-3.md`.

## Global Constraints

- Código em inglês; texto de interface só em `layers/core/i18n/locales/pt-BR.json`, chave em inglês. Esta onda quase não cria texto (no máximo uma chave de apoio no Convite, Task 3).
- Sem mudança de comportamento nas Tasks 1, 4, 5 e 6: os testes existentes passam sem edição, e o HTML renderizado de cada tela não muda.
- Página = rota + composição: script ≤ 30 linhas, template ≤ 60, uma chamada `use<Tela>Screen()`, **sem desestruturar o retorno** (é um `reactive`, use `const screen = ...` e `screen.x` no template). Composable de tela ≤ 150 linhas; acima disso, sub-composable por bloco.
- Browser API só em composable dedicado; tipos exportados só em `types/`; retorno explícito em funções exportadas.
- SSR: `watch` com `immediate` não roda no servidor; estado derivado de dado assíncrono é `computed`. O "visto" da Carteira (`useSeenStamps`) mora no aparelho: não mudar a ordem de montagem (`onMounted` continua guardando o snapshot).
- Segurança (`docs/security/SECURITY_RULES.md`): celular só mascarado, nunca em log/URL; o Convite não coloca `ref` nem código da loja em log, título ou texto da tela. Esta onda não toca API, BFF nem auth.
- Ratchet: ao terminar cada tela, remova-a de `TRANSITIONAL_PAGE_SCRIPT` / `TRANSITIONAL_PAGE_TEMPLATE` em `layers/core/test/conventions.test.ts` (o teste falha se a tela já cumpre e continua na lista). Nunca adicione entrada.
- Verificação: `pnpm typecheck && pnpm test` da raiz; Perfil e Convite conferidos no navegador (390px, claro e escuro) com o Supabase local (ver "Como verificar").

## Como verificar (ambiente local)

Igual à Onda 3: `pnpm supabase:local:start`, `apps/api/.env` e `apps/web/.env` locais, `pnpm dev:api` e `preview_start {name: "lagoa-dev"}`. Entrar com `67999990001` / `123456`; recarregar a página por inteiro derruba a sessão (cookie `path=/api`), então navegue com `$router.push`. Para o Convite sem sessão válida de teste, abra `/convite?ref=<código>&loja=<código da loja>` já logado.

## Review Focus

- **Perfil com a API parada ou 401**: `unauthorized` ainda dispara `signOut`; erro mostra `WalletProblem` com "Tentar de novo" (Task 1, teste do composable).
- **Aniversário travado** (`birthdayChangeableAt` no futuro): o formulário fica congelado, a data de liberação continua legível e o botão "Tirar a data" permanece (Task 2).
- **Data parcial** (só dia ou só mês): a mensagem de ajuda precisa estar ligada ao campo para leitor de tela, e o botão Salvar continua desligado (Task 2).
- **Convite com link quebrado** (sem `ref` ou `loja` válidos): vai para a Carteira sem passar pelo Check-in; **rede fora** não trava o amigo (segue ao Check-in mesmo se `referral.capture` falhar) (Task 3).
- **Carteira**: o "visto" não pode mudar no HTML do servidor; a primeira renderização no cliente é idêntica à do servidor (Task 4).

---

### Task 1: Perfil — `useProfileScreen`

**Files:**
- Create: `apps/web/layers/customer/app/composables/useProfileScreen.ts`, `apps/web/layers/customer/app/composables/useBirthdayEditing.ts`, `apps/web/layers/customer/app/components/profile/AccountCard.vue`
- Modify: `apps/web/layers/customer/app/pages/profile.vue`, `apps/web/layers/customer/app/types/profile.ts`, `apps/web/layers/core/test/conventions.test.ts`
- Test: `apps/web/layers/customer/test/profileScreen.nuxt.test.ts`

**Interfaces:**
- Consumes: `useCustomerProfile()`, `useCustomerServices()`, `useCustomerSession()`, `useDataExport()`, `useThemePreference()`, `formatBirthday`, `formatChangeableAt`.
- Produces: `useBirthdayEditing(profile: Ref<AsyncState<CustomerProfile, TransportError>>, onSaved: (profile: CustomerProfile) => void, reload: () => void): { pending: Ref<BirthdayAction | null>; lockedUntil: ComputedRef<string | null>; labels: ComputedRef<BirthdayFormLabels>; save: (birthday: Birthday | null, action: BirthdayAction) => Promise<void> }` e `useProfileScreen(): ProfileScreen` (tipo em `types/profile.ts`, `reactive` com `state`, `reload`, `theme`, `themeLabels`, `consentSaving`, `birthday` (o retorno de `useBirthdayEditing`), `exporter`, `erasing`, `changeConsent(granted)`, `downloadData()`, `eraseAccount()`, `signOut`).

- [ ] **Step 1: Write the failing test.** `profileScreen.nuxt.test.ts`, no mesmo molde de `checkInScreen.nuxt.test.ts` (mock de `useCustomerServices` com `profile`, `account`, `dataExport`; leia esse arquivo para copiar o helper de montagem). Casos: (a) estado `error` com código `unauthorized` chama `signOut` uma vez; (b) `changeConsent(true)` chama `profile.setNotificationConsent(true)`, guarda o resultado em `state` e põe toast de sucesso, e com falha põe toast de erro sem mudar `state`; (c) `birthday.save` com `birthdayLocked` recarrega (`reload`) e não troca `state`; (d) `birthday.lockedUntil` é `null` sem `birthdayChangeableAt` e uma data formatada com ele; (e) `eraseAccount` ok chama `signOut`; (f) `downloadData` com falha `unauthorized` chama `signOut` e não mostra toast.
- [ ] **Step 2: Run to verify it fails.** Run: `cd apps/web && pnpm vitest run --project nuxt layers/customer/test/profileScreen`. Expected: FAIL, `useProfileScreen` não existe.
- [ ] **Step 3: Implement.** Mova de `profile.vue` para os composables **sem alterar a lógica**: `useBirthdayEditing` leva `birthdayPending`, `birthdayLockedUntil`, `birthdayLabels` e `saveBirthday`; `useProfileScreen` leva o restante (`savingConsent` → `consentSaving`, `onConsentChange` → `changeConsent`, `downloadData`, `eraseAccount`, o `watch` de `unauthorized`, `theme`/`themeLabels`) e devolve `reactive({...})` com o tipo `ProfileScreen`. Crie `components/profile/AccountCard.vue` (props `phone: string`, `consent: boolean`, `saving: boolean`; emit `change: [granted: boolean]`; os textos vêm de `useI18n` como em `PrivacySection.vue`) com o `<dl>` atual (telefone + `USwitch`). Reduza a página a: `definePageMeta`, `useHead`, `const screen = useProfileScreen()`, `const cityHeaderImage = useCityHeaderImage()`, e o template que usa `screen.*`.
- [ ] **Step 4: Run to verify it passes.** Run: `pnpm vitest run --project nuxt layers/customer/test/profileScreen`. Expected: PASS.
- [ ] **Step 5: Ratchet and suite.** Remova `layers/customer/app/pages/profile.vue` de `TRANSITIONAL_PAGE_SCRIPT`. Run: `pnpm vitest run layers/core/test/conventions.test.ts && pnpm typecheck`. Expected: PASS, e a página tem script ≤ 30 e template ≤ 60.
- [ ] **Step 6: Commit.**

```bash
git add apps/web/layers
git commit -m "Customer profile: screen composable and account card

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Formulário de aniversário — ajuda ligada ao campo

**Files:**
- Modify: `apps/web/layers/customer/app/components/profile/BirthdayForm.vue`
- Test: `apps/web/layers/customer/test/birthdayForm.nuxt.test.ts` (crie se não existir; procure antes com `ls layers/customer/test | grep -i birthday`)

**Interfaces:**
- Consumes: `BirthdayFormLabels` (`help`, `partial`, `locked`).
- Produces: o `fieldset` passa a ter `aria-describedby` apontando para os ids dos parágrafos de ajuda e (quando visível) de aviso (`birthday-help`, `birthday-notice`); o aviso de data parcial vira `role="status"`.

- [ ] **Step 1: Write the failing test.** Montar `BirthdayForm` com `labels` completos e `birthday: null`. Casos: (a) o `fieldset` tem `aria-describedby` contendo `birthday-help` e o `<p id="birthday-help">` tem o texto de `labels.help`; (b) escolhendo só o mês (`setValue` no `USelect` do mês, como outros testes de formulário do repo) aparece `#birthday-notice` com `labels.partial` e o `fieldset` o referencia; sem data parcial `#birthday-notice` não existe e `aria-describedby` só tem o de ajuda; (c) com `labels.locked` definido, `#birthday-notice` mostra a data de liberação e o botão Salvar não existe, "Tirar a data" existe quando `birthday !== null`.
- [ ] **Step 2: Run to verify it fails.** Run: `pnpm vitest run --project nuxt layers/customer/test/birthdayForm`. Expected: FAIL nos casos (a) e (b).
- [ ] **Step 3: Implement.** Em `BirthdayForm.vue`: `<p id="birthday-help" ...>`; unifique o aviso em um único `<p v-if="labels.locked || partial" id="birthday-notice" role="status" ...>` (cadeado só quando travado) e `:aria-describedby="notice ? 'birthday-help birthday-notice' : 'birthday-help'"` no `fieldset`, com `const notice = computed(() => labels.locked !== null || partial.value)`. Não mude estilos nem textos.
- [ ] **Step 4: Run to verify it passes.** Run: `pnpm vitest run --project nuxt layers/customer/test/birthdayForm layers/customer/test/profileScreen`. Expected: PASS.
- [ ] **Step 5: Commit.**

```bash
git add apps/web/layers/customer
git commit -m "Birthday form: help and notice are linked to the fieldset

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Convite — visual do app e comportamento travado por teste

**Files:**
- Create: `apps/web/layers/customer/app/components/invite/Opening.vue`
- Modify: `apps/web/layers/customer/app/pages/invite.vue`, `apps/web/layers/core/i18n/locales/pt-BR.json` (só a chave `invite.lead`)
- Test: `apps/web/layers/customer/test/inviteScreen.nuxt.test.ts`

**Interfaces:**
- Consumes: `useInviteScreen()` (inalterado), `ScreenHeader` (`overlap: false`), `useCityHeaderImage()`.
- Produces: `InviteOpening` (props `title: string`, `lead: string`, `image: string`, `message: string`): `ScreenHeader` com foto e o texto `opening` em `aria-live="polite"` dentro de um card, sem texto escuro sobre a faixa (`overlap` desligado).

Ruling de partida (registre no ledger): o achado 14 pedia "estado de erro", mas o fluxo **não deve** mostrar erro: link quebrado vai para a Carteira e falha de rede segue ao Check-in. Portanto a onda só dá o visual e trava o comportamento por teste.

- [ ] **Step 1: Write the failing test.** `inviteScreen.nuxt.test.ts`: (a) link válido (`ref` e `loja` aceitos por `ReferralCaptureSchema`) chama `referral.capture` com `{ referralCode, shopCode }` e navega com `replace` para `/check-in?loja=<código>`; (b) `referral.capture` que devolve `{ ok: false }` ou lança ainda navega ao Check-in; (c) sem `ref` navega para `HOME_PATH` e **não** chama `capture`; (d) `InviteOpening` renderiza um único `h1`, o texto `message` em `[aria-live=polite]`, foto com `alt=""` e `header` com `pb-6`. Use o mesmo mock de `useCustomerServices` e de `navigateTo` dos outros testes de tela (leia `checkInScreen.nuxt.test.ts`).
- [ ] **Step 2: Run to verify it fails.** Run: `pnpm vitest run --project nuxt layers/customer/test/inviteScreen`. Expected: FAIL em (d) (componente não existe); (a)–(c) já passam: se algum falhar, é bug real do composable, trate com systematic-debugging antes de seguir.
- [ ] **Step 3: Implement.** Chave nova `invite.lead`: "Estamos levando você até a loja." (uma frase, mesmo tom de `invite.opening`). Componente e página:

```vue
<!-- components/invite/Opening.vue -->
<script setup lang="ts">
interface Props {
  title: string
  lead: string
  image: string
  message: string
}

defineProps<Props>()
</script>

<template>
  <div>
    <ScreenHeader :title="title" :lead="lead" :image="image" :overlap="false" />
    <p class="text-center text-base text-muted" aria-live="polite">{{ message }}</p>
  </div>
</template>
```

```vue
<!-- pages/invite.vue -->
<script setup lang="ts">
definePageMeta({ path: '/convite', layout: 'customer', middleware: 'customer-auth' })

usePageTitle('invite.pageTitle')
useInviteScreen()
const cityHeaderImage = useCityHeaderImage()
</script>

<template>
  <InviteOpening :title="$t('invite.pageTitle')" :lead="$t('invite.lead')" :image="cityHeaderImage" :message="$t('invite.opening')" />
</template>
```

- [ ] **Step 4: Run to verify it passes.** Run: `pnpm vitest run --project nuxt layers/customer/test/inviteScreen`. Expected: PASS. Depois confira `pt-BR.json` com `pnpm vitest run layers/core` (testes de i18n/chaves).
- [ ] **Step 5: Commit.**

```bash
git add apps/web/layers
git commit -m "Customer invite: city photo header and behaviour pinned by tests

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Carteira — `useWalletScreen`

**Files:**
- Create: `apps/web/layers/customer/app/composables/useWalletScreen.ts`
- Modify: `apps/web/layers/customer/app/pages/wallet.vue`, `apps/web/layers/customer/app/types/wallet.ts`, `apps/web/layers/core/test/conventions.test.ts`
- Test: `apps/web/layers/customer/test/walletScreen.nuxt.test.ts`

**Interfaces:**
- Consumes: `useWalletCards`, `useWalletActivity`, `useCustomerProfile`, `useSeenStamps`, `useCityHeaderImage`, `toStampCardModel`, `toLedgerEntryModel`, `categoryIcon`, `useCustomerSession`.
- Produces: `useWalletScreen(): WalletScreen` (tipo em `types/wallet.ts`): `reactive` com `cardsState`, `reloadCards`, `activityState`, `cards`, `activeId` (get/set), `greeting`, `ledger`, `cityHeaderImage`.

- [ ] **Step 1: Write the failing test.** `walletScreen.nuxt.test.ts`: (a) antes de `onMounted`, `cards` usa o próprio saldo como "visto" (nada novo na primeira renderização) e, depois de montar, usa o snapshot de `useSeenStamps`; (b) `activeId` devolve o primeiro cartão e passa a devolver o escolhido ao `set`; (c) `greeting` usa `wallet.greeting` com o primeiro nome quando o perfil carregou e `wallet.greetingAnonymous` caso contrário; (d) qualquer um dos três estados com `unauthorized` chama `signOut` uma vez; (e) `ledger` é `[]` até a atividade carregar e usa o ícone da categoria da loja do cartão. Mocke os três `use*` de consulta como os testes existentes de tela.
- [ ] **Step 2: Run to verify it fails.** Run: `pnpm vitest run --project nuxt layers/customer/test/walletScreen`. Expected: FAIL, composable inexistente.
- [ ] **Step 3: Implement.** Mova o script de `wallet.vue` **sem alterar a lógica nem a ordem** (`seen` + `onMounted` + `watch` do `remember`) para `useWalletScreen`; devolva `reactive({...})`. A página fica: `definePageMeta`, `useHead`, `const screen = useWalletScreen()` e o template com `screen.*` (o `t('wallet.lead')` etc. continuam no template via `useI18n`).
- [ ] **Step 4: Run to verify it passes.** Run: `pnpm vitest run --project nuxt layers/customer/test/walletScreen layers/customer`. Expected: PASS (inclui os testes existentes da Carteira, sem edição).
- [ ] **Step 5: Ratchet and commit.** Remova `wallet.vue` de `TRANSITIONAL_PAGE_SCRIPT`; `pnpm vitest run layers/core/test/conventions.test.ts && pnpm typecheck`. Expected: PASS.

```bash
git add apps/web/layers
git commit -m "Customer wallet: screen composable

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Descobrir — `useDiscoverScreen` e template por bloco

**Files:**
- Create: `apps/web/layers/customer/app/composables/useDiscoverScreen.ts`; um ou mais componentes em `apps/web/layers/customer/app/components/discover/` (nomes pelo bloco que sair do template: leia `discover.vue` e `ls components/discover`, reaproveite os existentes antes de criar)
- Modify: `apps/web/layers/customer/app/pages/discover.vue`, `apps/web/layers/customer/app/types/discover.ts`, `apps/web/layers/core/test/conventions.test.ts`
- Test: `apps/web/layers/customer/test/discoverScreen.nuxt.test.ts`

**Interfaces:**
- Consumes: `useDiscoverShops`, `useDiscoverChallenges`, `useWalletCards`, `filterShops`, `groupShops`, `sortByDistance`, `pendingChallengeShopIds`, `toShopTeaserModel`, `toKnownShopModel`, `toChallengeModel`, `shopsMapUrl`, `useCityHeaderImage`.
- Produces: `useDiscoverScreen(): DiscoverScreen`: `reactive` com `query` (v-model), `loading`, `searching`, `fresh`, `known`, `heroChallenge`, `otherChallenges`, `shopsState`, `reloadShops`, `cityHeaderImage`, `mapUrl`.

- [ ] **Step 1: Write the failing test.** `discoverScreen.nuxt.test.ts`: (a) `loading` é verdadeiro enquanto lojas **ou** cartões carregam (a lista espera a carteira); (b) lojas da carteira vão para `known` e as outras para `fresh`, e `fresh` vem ordenada por distância; (c) `heroChallenge` é o primeiro desafio não concluído e `otherChallenges` não o repete; (d) `searching` fica verdadeiro só com `query` não vazia (espaços não contam); (e) `unauthorized` em qualquer dos três estados chama `signOut` uma vez.
- [ ] **Step 2: Run to verify it fails.** Run: `pnpm vitest run --project nuxt layers/customer/test/discoverScreen`. Expected: FAIL, composable inexistente.
- [ ] **Step 3: Implement.** Mova o script de `discover.vue` para o composable sem alterar a lógica; quebre o template em componentes por bloco até caber em 60 linhas (props/emits, sem `signOut` nem store).
- [ ] **Step 4: Run to verify it passes.** Run: `pnpm vitest run --project nuxt layers/customer`. Expected: PASS, testes existentes sem edição.
- [ ] **Step 5: Ratchet and commit.** Remova `discover.vue` de `TRANSITIONAL_PAGE_SCRIPT` **e** de `TRANSITIONAL_PAGE_TEMPLATE`; rode conventions e typecheck. Expected: PASS.

```bash
git add apps/web/layers
git commit -m "Customer discover: screen composable and template split by block

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Prêmios e Resgate — composables de tela

**Files:**
- Create: `apps/web/layers/customer/app/composables/useRewardsScreen.ts`; componentes em `components/rewards/` conforme o template pedir
- Modify: `apps/web/layers/customer/app/pages/rewards.vue`, `apps/web/layers/customer/app/pages/reward-redemption.vue`, `apps/web/layers/customer/app/composables/useRewardRedemption.ts` (só se faltar a parte de tela), `apps/web/layers/core/test/conventions.test.ts`
- Test: `apps/web/layers/customer/test/rewardsScreen.nuxt.test.ts`; reaproveite os testes existentes do Resgate

**Interfaces:**
- Consumes: `useWalletCards`, `useRewardHistory`, `groupRewards`, `toReadyRewardModel`, `toUpcomingRewardModel`, `closestRewardLine`, `toLedgerEntryModel`, `useRewardRedemption`.
- Produces: `useRewardsScreen(): RewardsScreen` (`reactive`: `ready`, `upcoming`, `closest`, `hasCards`, `history`, `cardsState`, `historyState`, `reloadCards`, `reloadHistory`, `cityHeaderImage`); para o Resgate, `useRewardRedemptionScreen()` com o que hoje está no script da página (`watch(state)` → `signOut`, `request()`, `announcement`, `canRetry`, `back`).

- [ ] **Step 1: Write the failing test.** `rewardsScreen.nuxt.test.ts`: (a) `ready`/`upcoming` vazios enquanto os cartões não carregam, `hasCards` falso; (b) `closest` é `null` sem cartões em andamento e a linha do primeiro cartão de `upcoming` com ele; (c) `history` é `[]` até carregar; (d) `unauthorized` em cartões ou histórico chama `signOut`. Para o Resgate, escreva antes da extração os casos que hoje só existem na página: `state` com `unauthorized` chama `signOut`; `canRetry` só em erro que admite nova tentativa; o `announcement` muda com o estado (leia `reward-redemption.vue` para os valores reais).
- [ ] **Step 2: Run to verify it fails.** Run: `pnpm vitest run --project nuxt layers/customer/test/rewardsScreen`. Expected: FAIL, composable inexistente.
- [ ] **Step 3: Implement.** Mova os scripts das duas páginas sem alterar a lógica; quebre o template de Prêmios por bloco (≤ 60 linhas) e deixe a página só com `definePageMeta`, `useHead`, `const screen = ...`. A página do Resgate continua com `RewardRedemptionBackLink` e `aria-live`, apenas lendo `screen.*`.
- [ ] **Step 4: Run to verify it passes.** Run: `cd apps/web && pnpm vitest run --project nuxt layers/customer`. Expected: PASS, testes existentes sem edição.
- [ ] **Step 5: Ratchet, full suite and commit.** Remova `rewards.vue` de `TRANSITIONAL_PAGE_TEMPLATE` e `reward-redemption.vue` de `TRANSITIONAL_PAGE_SCRIPT`; rode `cd ../.. && pnpm typecheck && pnpm test`. Expected: PASS. Atualize a tabela da auditoria (achados 10, 11 e 14 como feitos; `sign-in.vue` fica de fora, é a tela de login) e o ledger.

```bash
git add apps/web/layers docs/superpowers/specs/2026-10-12-customer-internal-design-audit.md
git commit -m "Customer rewards and redemption: screen composables; audit closed

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

## Fora desta onda (registrado)

- `sign-in.vue` (script e template acima do limite): é a tela de login e já tem o visual novo; extração fica para uma onda de refatoração própria.
- Ranking com `lead` que aparece só depois do carregamento; Perfil com esqueleto não capturado; câmera, aviso de antifraude e "prêmio liberado" no navegador (precisam de aparelho real).
- Cookie `lagoa_at`/`lagoa_rt` com `path=/api` que derruba a sessão ao recarregar a página por inteiro (SSR) e o parser JSON da API: tratados como achados à parte, fora do design.
- Token de tamanho de título de seção (achado 12) e a barra em 375px (achado 13), pendentes da auditoria.
