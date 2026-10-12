# Design interno do app do cliente — Onda 3 (Resgate, Check-in, Ganhou/Entrou) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Levar o cabeçalho com foto da cidade (`ScreenHeader`) para as telas de momento crítico: Resgate, Check-in (escanear, digitar, aviso) e os passos Carimbo ganho / Entrou no clube, e fechar os estados de Prêmios, Ranking e Perfil.

**Architecture:** `ScreenHeader` ganha `focusable` + `focus()` para substituir o `PageTitle` nos passos que movem o foco. Cada página/passo passa a foto como prop vinda da página (`useCityHeaderImage`), a regra de sobreposição da Onda 2 se mantém (só sobe sobre a faixa quando o primeiro elemento é um card único). Nenhuma mudança de API, texto de produto ou regra de negócio.

**Tech Stack:** Nuxt 4, Vue 3, Nuxt UI v4, Tailwind v4, Vitest (`node` e `nuxt`), `@nuxt/test-utils`.

**Spec:** `docs/superpowers/specs/2026-10-12-customer-internal-design-design.md` (Onda 3) · Auditoria: `docs/superpowers/specs/2026-10-12-customer-internal-design-audit.md` (achados 8, 9 e 15) · Onda anterior: `docs/superpowers/plans/2026-10-12-customer-internal-design.md`.

## Global Constraints

- Código em inglês; texto de interface só em `layers/core/i18n/locales/pt-BR.json` com chave em inglês; nenhuma string nova solta no template (esta onda não cria texto novo).
- Sem hex solto; alvos de toque ≥ 44px; contraste 4.5:1; elementos interativos reais com nome acessível.
- Página = rota + composição (script ≤ 30 linhas). Componentes dumb: dados por props, sem store/service/rota; `layers/ui` não conhece i18n.
- Texto escuro nunca fica sobre a faixa escura do cabeçalho: só sobe sobre a faixa um **card único**.
- Um só `h1` por tela. A foto é decoração (`alt=""`).
- Segurança (`docs/security/SECURITY_RULES.md`): nada de celular, token ou código de visita/resgate em log, URL ou analytics; o token da visita continua só no fragmento (`#visita=`). Esta onda não toca auth, API nem BFF.
- Verificação: `pnpm typecheck && pnpm test` da raiz; telas conferidas no navegador com o Supabase local (ver "Como verificar").

## Como verificar (ambiente local)

`pnpm supabase:local:start`; `apps/api/.env` e `apps/web/.env` do worktree apontam para `127.0.0.1:54321/54322` (ver `apps/api/README.md`, seção "Supabase local"); `pnpm dev:api` e `preview_start {name: "lagoa-dev"}`. Entrar com o celular `67999990001` e código `123456`. Recarregar a página por inteiro derruba a sessão (cookie com `path=/api`, achado fora de escopo): entre pela tela de Entrar e navegue sem recarregar (`$router.push`). A foto do cabeçalho vem do bucket `shop-assets` local: suba `apps/web/layers/customer/public/city/tres-lagoas.jpg` como `city/discover-header.webp` (`curl` com a service key que `supabase start` imprime). Para ter uma visita: `ALLOW_DEV_VISIT_QR=1` e `pnpm --filter @lagoa/api visit-qr:dev <código da loja>`.

## Review Focus

- **Título longo no passo Ganhou** (nome de loja grande no `lead` e título em duas linhas) com o carimbo grande ao lado: o título não pode ser cortado nem o carimbo cobrir o texto. Teste: `ScreenHeader` com `title` longo e slot `actions` mantém o `h1` inteiro (Task 1).
- **Foco ao trocar de etapa** (leitor de tela): o `h1` do passo recebe foco só para o pedido certo; sem `focusable` não entra na ordem de tab. Testes nas Tasks 1 e 3.
- **Passo sem cartão** (`card: null`): nada sobe sobre a faixa, senão o texto escuro do rodapé cairia sobre ela. Teste: `overlap` desligado quando não há card (Task 3).
- **Resgate em erro ou carregando**: o card de erro e o esqueleto também sobem sem texto escuro na faixa (Task 2, conferido no navegador forçando erro com a API parada).
- **Check-in digitando o código**: a primeira coisa é um rótulo de campo em texto escuro, então não sobe sobre a faixa (Task 2).

---

### Task 1: `ScreenHeader` aceita foco (`focusable` + `focus()`)

**Files:**
- Modify: `apps/web/layers/ui/app/components/ScreenHeader.vue`
- Modify: `apps/web/layers/ui/test/ScreenHeader.nuxt.test.ts`

**Interfaces:**
- Consumes: `ScreenHeader.vue` atual (props `title`, `lead?`, `image?`, `headingId?`, `overlap?`; slots `actions` e padrão).
- Produces: nova prop `focusable?: boolean` e `defineExpose({ focus(): void })`, o mesmo contrato do `PageTitle`, para as Tasks 3 e 4.

- [ ] **Step 1: Escrever os testes que falham**

Acrescentar, dentro do `describe('ScreenHeader', ...)` de `ScreenHeader.nuxt.test.ts`:

```ts
  it('takes the focus on its heading when it is focusable', async () => {
    const wrapper = await mountSuspended(ScreenHeader, {
      props: { title: 'Carimbo ganho!', focusable: true },
      attachTo: document.body,
    })
    wrapper.vm.focus()
    expect(document.activeElement).toBe(wrapper.get('h1').element)
    expect(wrapper.get('h1').attributes('tabindex')).toBe('-1')
    wrapper.unmount()
  })

  it('keeps the heading out of the tab order when it is not focusable', async () => {
    const wrapper = await mountSuspended(ScreenHeader, { props: { title: 'Perfil' } })
    expect(wrapper.get('h1').attributes('tabindex')).toBeUndefined()
  })

  it('keeps a long title whole next to an actions slot', async () => {
    const title = 'Carimbo ganho na Barbearia Navalha do Centro'
    const wrapper = await mountSuspended(ScreenHeader, {
      props: { title },
      slots: { actions: '<span data-test="stamp">carimbo</span>' },
    })
    expect(wrapper.get('h1').text()).toBe(title)
    expect(wrapper.get('[data-test="stamp"]').exists()).toBe(true)
  })
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd apps/web && pnpm vitest run layers/ui/test/ScreenHeader.nuxt.test.ts`
Expected: FAIL nos dois primeiros testes novos (`focus is not a function` e `tabindex` ausente); o terceiro já passa.

- [ ] **Step 3: Implementar**

Em `ScreenHeader.vue`, trocar o bloco `<script setup>` por:

```ts
interface Props {
  title: string
  lead?: string
  /** Foto da cidade; sem ela a faixa fica na cor lisa e a tela segue legível. */
  image?: string
  headingId?: string
  /** Deixa 40px na base para um card herói subir sobre a faixa; sem card, passe false. */
  overlap?: boolean
  /** Passo a passo move o foco para o título ao trocar de etapa (`focus()` exposto). */
  focusable?: boolean
}

withDefaults(defineProps<Props>(), { overlap: true })

const heading = useTemplateRef<HTMLHeadingElement>('heading')

defineExpose({ focus: (): void => heading.value?.focus() })
```

e a linha do `h1` por:

```vue
          <h1 :id="headingId" ref="heading" class="font-display text-[2.25rem] leading-none font-bold text-balance focus:outline-none" :tabindex="focusable ? -1 : undefined">{{ title }}</h1>
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd apps/web && pnpm vitest run layers/ui/test/ScreenHeader.nuxt.test.ts`
Expected: PASS (10 testes).

- [ ] **Step 5: Commit**

```bash
git add apps/web/layers/ui
git commit -m "UI: ScreenHeader can take focus on its heading (focusable + focus())

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Resgate e Check-in com `ScreenHeader`

**Files:**
- Modify: `apps/web/layers/customer/app/pages/reward-redemption.vue`
- Modify: `apps/web/layers/customer/app/pages/check-in.vue`
- Modify: `apps/web/layers/customer/test/checkInPage.nuxt.test.ts`

**Interfaces:**
- Consumes: `useCityHeaderImage(): string`; `ScreenHeader` com `overlap`, `image`, slot `actions`.
- Produces: a página `check-in.vue` passa `image` (string) para `CheckInEarnedStep` e `CheckInJoinedStep` (props criadas na Task 3). Nesta task a página só declara `const cityHeaderImage = useCityHeaderImage()` e usa no próprio cabeçalho.

- [ ] **Step 1: Teste de um só `h1` no Check-in (rede de segurança antes de trocar o cabeçalho)**

Em `checkInPage.nuxt.test.ts`, no `describe` que já monta a página, acrescentar (o helper de montagem do arquivo é `mountCheckIn()`):

```ts
  it('shows exactly one h1 while scanning', async () => {
    const page = await mountCheckIn()
    expect(page.findAll('h1')).toHaveLength(1)
  })
```

Run: `cd apps/web && pnpm vitest run layers/customer/test/checkInPage.nuxt.test.ts`
Expected: PASS (caracterização; hoje `PageTitle` já é um `h1`). Os snapshots de texto continuam como estão.

- [ ] **Step 2: Check-in**

Em `check-in.vue`, no `<script setup>` depois de `const screen = useCheckInScreen()` acrescentar:

```ts
const cityHeaderImage = useCityHeaderImage()
```

No template, trocar o `<PageTitle ... />` do ramo `<template v-else>` por:

```vue
      <ScreenHeader
        :title="$t('checkIn.title')"
        :lead="screen.view === 'notice' ? undefined : $t(screen.view === 'scan' ? 'checkIn.leadScan' : 'checkIn.leadType', { length: screen.codeLength })"
        :image="cityHeaderImage"
        :overlap="screen.view !== 'type'"
      />
```

Regra: no aviso (card) e na câmera (caixa única do visor) o primeiro elemento sobe sobre a faixa; no formulário de código o primeiro elemento é o rótulo do campo em texto escuro, então não sobe.

Como o primeiro elemento de cada visão agora tem que subir sozinho, envolva a visão que sobe num bloco com a margem. Trocar

```vue
      <CheckInNotice v-if="screen.notice" ... />
      <CheckInScanStep v-else-if="screen.view === 'scan'" ... />
```

mantendo os atributos, por um contêiner único para as duas:

```vue
      <div v-if="screen.notice || screen.view === 'scan'" class="relative -mt-10 flex flex-col gap-6">
        <CheckInNotice v-if="screen.notice" :notice="screen.notice" @recover="screen.recover" @type-code="screen.typeCode" />
        <CheckInScanStep v-else :status="screen.viewfinderStatus" @video="screen.setVideo" @type-code="screen.typeCode" />
      </div>
```

e o `<CheckInCodeForm v-else ... />` continua como está, logo depois (agora com `v-else` ligado ao `div`).

- [ ] **Step 3: Resgate**

Em `reward-redemption.vue`, depois de `useHead(...)` acrescentar `const cityHeaderImage = useCityHeaderImage()`. Trocar

```vue
    <div class="-mb-3 flex flex-col items-start">
      <UButton :to="back.to" variant="ghost" color="neutral" icon="i-ph-arrow-left" :label="back.label" class="-ml-2.5" />
    </div>
    <PageTitle :title="title" />
```

por

```vue
    <ScreenHeader :title="title" :image="cityHeaderImage">
      <template #actions>
        <NuxtLink
          :to="back.to"
          class="grid size-11 shrink-0 place-items-center rounded-full bg-white/15 text-white ring-1 ring-white/50 transition-colors duration-(--lagoa-dur-fast) hover:bg-white/25"
          :aria-label="back.label"
        >
          <UIcon name="i-ph-arrow-left" class="size-6" aria-hidden="true" />
        </NuxtLink>
      </template>
    </ScreenHeader>
```

e mudar a raiz de `<div class="flex flex-col gap-6">` para `<div>` com um filho `<div class="relative -mt-10 flex flex-col gap-6">` envolvendo o resto do conteúdo (a região `aria-live`, o `WalletProblem`, o esqueleto e o `RedemptionTicket` já são cards, então o primeiro sobe sozinho). Fechar os `</div>` na ordem certa.

- [ ] **Step 4: Tipos e testes**

Run: `pnpm typecheck && pnpm test` (da raiz)
Expected: verde (snapshots de texto de `checkInPage` inalterados).

- [ ] **Step 5: Conferir no navegador (390px e 375px; claro e escuro)**

Com o ambiente de "Como verificar": `/check-in` (câmera: o navegador do app bloqueia a câmera, então o fluxo cai em "digitar código", que também precisa ser conferido), o aviso de erro (digite um código inválido), e `/premios/<cartão>` (para ter cartão, junte carimbos até liberar prêmio com `visit-qr:dev`). Para o erro do Resgate, pare a API (`pkill -f "src/main.ts"`) e navegue pelo app. Confirmar: foto no topo, botão voltar com ≥ 44px e nome acessível, nenhum texto escuro sobre a faixa, a tab bar não cobre o último elemento, sem rolagem horizontal (`document.documentElement.scrollWidth === innerWidth`), um só `h1`. Registrar o que viu no documento de auditoria (Task 5).

- [ ] **Step 6: Commit**

```bash
git add apps/web/layers/customer
git commit -m "Customer redemption and check-in: city photo screen header

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Passos Carimbo ganho e Entrou no clube

**Files:**
- Modify: `apps/web/layers/customer/app/components/check-in/EarnedStep.vue`
- Modify: `apps/web/layers/customer/app/components/check-in/JoinedStep.vue`
- Modify: `apps/web/layers/customer/app/pages/check-in.vue`
- Modify: `apps/web/layers/customer/test/checkInComponents.nuxt.test.ts`

**Interfaces:**
- Consumes: `ScreenHeader` com `focusable` e `focus()` (Task 1); `const cityHeaderImage` já declarada em `check-in.vue` (Task 2).
- Produces: `EarnedStep` e `JoinedStep` ganham a prop `image: string`.

- [ ] **Step 1: Atualizar os testes (RED)**

Em `checkInComponents.nuxt.test.ts`, nos dois `describe` (`JoinedStep` e `EarnedStep`), passar `image: '/example/city.svg'` em todas as chamadas `mountIt(...)` (o tipo de props exige) e acrescentar:

```ts
  it('draws the city photo as decoration behind the title', async () => {
    const page = await mountIt(JoinedStep, { joined: joined(), image: '/example/city.svg', focusRequest: null })
    expect(page.findAll('h1')).toHaveLength(1)
    expect(page.get('header img').attributes('alt')).toBe('')
  })

  it('does not let the card climb onto the strip when there is no card', async () => {
    const page = await mountIt(JoinedStep, { joined: joined(), image: '/example/city.svg', focusRequest: null })
    expect(page.get('header').classes()).toContain('pb-6')
  })
```

(os mesmos dois testes, com `EarnedStep` e `earned()`, no `describe` de `EarnedStep`). O caso **com** cartão fica no teste de página, que já ganha uma visita de verdade no mock: em `checkInPage.nuxt.test.ts`, no teste `shows the earned stamp and moves the focus to the title for a valid visit code`, depois do `waitFor` do foco, acrescentar `expect(page.get('header').classes()).toContain('pb-16')` (a visita ganha devolve o cartão, então o cabeçalho reserva o espaço da sobreposição).

Run: `cd apps/web && pnpm vitest run layers/customer/test/checkInComponents.nuxt.test.ts`
Expected: FAIL (sem `header img`, sem `pb-6`).

- [ ] **Step 2: Implementar `JoinedStep`**

Em `JoinedStep.vue`: acrescentar `image: string` em `Props`; trocar o `PageTitle` e envolver o cartão:

```vue
  <section aria-labelledby="joined-title">
    <ScreenHeader
      ref="heading"
      heading-id="joined-title"
      :title="joined.text.title"
      :lead="joined.text.lead"
      :image="image"
      :overlap="Boolean(joined.card)"
      focusable
    />

    <div class="flex flex-col gap-6" :class="{ 'relative -mt-10': joined.card }">
      <StampCard v-if="joined.card" :card="joined.card" />

      <div class="flex flex-col gap-2 text-base text-muted">
        <p v-if="joined.text.welcome">{{ joined.text.welcome }}</p>
        <p>{{ joined.text.next }}</p>
      </div>

      <UButton to="/carteira" size="xl" block :label="$t('checkIn.joined.toWallet')" />
    </div>
  </section>
```

(sem cartão, o contêiner abaixo do cabeçalho começa com `gap-6` e sem `-mt-10`, então o texto escuro nunca cai sobre a faixa; o `pt-6` do cabeçalho sem overlap já dá o respiro.)

- [ ] **Step 3: Implementar `EarnedStep`**

Em `EarnedStep.vue`: acrescentar `image: string` em `Props` e usar:

```vue
  <section aria-labelledby="earned-title">
    <ScreenHeader
      ref="heading"
      heading-id="earned-title"
      :title="earned.text.title"
      :lead="earned.text.lead"
      :image="image"
      :overlap="Boolean(earned.card)"
      focusable
    >
      <template #actions>
        <!-- A batida grande: o carimbo cai na faixa antes de passar para o cartão. -->
        <span class="relative z-10 size-24 shrink-0">
          <StampImpression :icon="earned.heroStamp.icon" :tilt="earned.heroStamp.tilt" :tone="earned.heroStamp.tone" pressed />
        </span>
      </template>
      <p
        v-if="earned.text.cheer"
        class="letreiro stamp-press self-start rounded-[6px] px-2.5 py-1 text-xl text-white ring-2 ring-current [--stamp-tilt:-2deg]"
        :style="{ animationDelay: `${CHEER_DELAY_MS}ms` }"
      >
        {{ earned.text.cheer }}
      </p>
    </ScreenHeader>

    <div class="flex flex-col gap-6" :class="{ 'relative -mt-10': earned.card }">
      <StampCard v-if="earned.card" :card="earned.card" />
      <p class="text-base text-muted">{{ earned.text.next }}</p>
      <div class="flex flex-col gap-3"> ...os dois botões, inalterados... </div>
    </div>
  </section>
```

A frase de ânimo passa de `text-primary` para `text-white`: sobre a faixa escura o `primary` do tema claro some.

- [ ] **Step 4: Passar a foto na página**

Em `check-in.vue`, nas duas linhas dos passos:

```vue
    <CheckInEarnedStep v-if="screen.earned" :earned="screen.earned" :image="cityHeaderImage" :focus-request="screen.focusRequest" />
    <CheckInJoinedStep v-else-if="screen.joined" :joined="screen.joined" :image="cityHeaderImage" :focus-request="screen.focusRequest" />
```

- [ ] **Step 5: Rodar**

Run: `pnpm typecheck && pnpm test` (da raiz)
Expected: tudo verde, incluindo os testes de foco (`focus()` agora vem do `ScreenHeader`) e o de `p.letreiro`.

- [ ] **Step 6: Conferir no navegador**

Ganhar uma visita com `visit-qr:dev` pelo código curto digitado (passo Ganhou, com e sem prêmio liberado) e entrar numa loja pelo QR da loja (passo Entrou). Confirmar: carimbo grande ao lado do título sem cobri-lo em 375px, a frase de ânimo legível sobre a foto nos dois temas, o cartão subindo sobre a faixa, o botão de resgate/carteira ≥ 44px, sem rolagem horizontal.

- [ ] **Step 7: Commit**

```bash
git add apps/web/layers/customer
git commit -m "Customer check-in steps: stamp earned and joined use the city photo header

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Estados de Prêmios, Ranking e Perfil (achado 15)

**Files:**
- Modify: `docs/superpowers/specs/2026-10-12-customer-internal-design-audit.md`
- Modify (só se um estado estiver faltando): a página correspondente em `apps/web/layers/customer/app/pages/`

**Interfaces:**
- Consumes: telas das Ondas 2 e 3 já no navegador.
- Produces: achado 15 da auditoria marcado como conferido, com uma linha por tela e por estado.

- [ ] **Step 1: Forçar cada estado e olhar**

Para `/premios`, `/ranking` e `/perfil` (em 390px): (a) carregando: `await new Promise(...)` não serve; use a primeira pintura logo após `$router.push` e uma captura imediata; (b) erro: pare a API (`pkill -f "src/main.ts"`), navegue de uma tela para outra e confirme o `WalletProblem` com "Tentar de novo"; suba a API de novo (`pnpm dev:api`) e confirme que "Tentar de novo" recupera; (c) vazio: já visto (Prêmios e Ranking vazios na conta de teste); (d) sucesso: conta com dados (visitas via `visit-qr:dev`). Em cada um: o erro/esqueleto de Prêmios e Ranking começam abaixo da faixa (sem overlap), o de Perfil sobe sobre ela.

- [ ] **Step 2: Registrar**

No documento de auditoria, trocar a linha 15 por uma tabela curta (`Tela × carregando | vazio | erro | sucesso`, cada célula "ok" ou o defeito encontrado) e atualizar "Plano seguinte" com o que sobrar. Se algum estado estiver ausente ou quebrado, abrir a correção como nova task no plano da Onda 4 (não corrigir aqui).

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-10-12-customer-internal-design-audit.md
git commit -m "Audit: states of rewards, ranking and profile checked in the browser

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Fechar a rodada

**Files:**
- Modify: `design-system/lagoa/pages/customer.md`

**Interfaces:**
- Consumes: Tasks 1 a 4.

- [ ] **Step 1: Atualizar a regra do design system**

Na seção "Cabeçalho das telas internas" de `design-system/lagoa/pages/customer.md`, trocar a primeira frase por:

```markdown
Carteira, Descobrir, Prêmios, Perfil, Ranking, Resgate, Check-in e os passos
Carimbo ganho e Entrou no clube abrem com `ScreenHeader` + foto da cidade
(`useCityHeaderImage()`; nos passos a página passa a foto por prop).
```

e acrescentar ao fim da seção:

```markdown
Nos passos que trocam de etapa (Ganhou, Entrou) o `ScreenHeader` é `focusable`
e o foco vai para o `h1`. Sem cartão para subir (`card: null`) o cabeçalho usa
`overlap=false`. O botão voltar do Resgate é ícone de 44px no slot `actions`,
com `aria-label`.
```

- [ ] **Step 2: Suíte completa**

Run: `pnpm typecheck && pnpm test` (da raiz) e `cd apps/web && pnpm test:e2e`
Expected: verde (e2e: 3 testes de visitante).

- [ ] **Step 3: Commit**

```bash
git add design-system/lagoa/pages/customer.md
git commit -m "Design system: header rule covers redemption, check-in and its steps

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

Depois, abrir o PR da Onda 3 e escrever o plano da Onda 4 (Perfil: página de 91 linhas de script, Convite, formulários e o que a Task 4 achar).
