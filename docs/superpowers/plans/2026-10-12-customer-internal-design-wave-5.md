# Onda 5 — Botões, hierarquia e nomenclatura Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar a escolha manual de `color`/`variant` do `UButton` por papéis de ação (`ActionButton`), dar foco visível por fundo e fixar um glossário de rótulos no app do cliente.

**Architecture:** `ActionButton` (`layers/ui`) lê um mapa constante papel → `{ color, variant, size }` e repassa tudo ao `UButton`; `HeaderIconLink` (`layers/ui`) concentra os ícones redondos do cabeçalho escuro. As telas do cliente migram arquivo por arquivo, protegidas por um teste de convenção com lista transitória que só encolhe. Os rótulos mudam em `pt-BR.json` com um teste que impede a volta dos antigos.

**Tech Stack:** Nuxt 4, Vue 3 `<script setup lang="ts">`, Nuxt UI v4, Tailwind v4, Vitest (`node` e `nuxt`), `mountSuspended`.

**Spec:** [2026-10-12-customer-wave-5-actions-design.md](../specs/2026-10-12-customer-wave-5-actions-design.md)

Todos os comandos rodam em `apps/web` (`pnpm vitest run --project nuxt <arquivo>` ou `--project node <arquivo>`). No macOS use `sed -i ''`.

## Global Constraints

- Código em inglês; texto visível só em `layers/core/i18n/locales/pt-BR.json`, chave em inglês. `layers/ui` não conhece i18n (recebe texto pronto).
- Tipos exportados só em `types/` (`layers/ui/app/types/action.ts`); em `.vue`/`utils/` só `import type`.
- Dumb components: script ≤ 40 linhas, sem `watch`, template ≤ 80. Página: script ≤ 30, template ≤ 60.
- Alvos de toque ≥ 44px; contraste de texto 4.5:1; foco 3:1 (WCAG 1.4.11).
- Um `primary` por tela (e por formulário próprio). `reward` e `primary` não competem na mesma região.
- `conventions.test.ts`: listas transitórias só encolhem, em ordem alfabética.
- Rótulos novos (exatos): "Ver carteira", "Voltar para a carteira", "Resgatar prêmio", "Tirar aniversário", "Manter a data", "Apagar minha conta", "Manter minha conta", "Digitar o código da visita".
- Fora do escopo: painel do lojista, animações e cards (Onda 6), escala de tamanho de texto.

## Review Focus

- Botão `loading`/`disabled` continua repassado ao `UButton` (envio duplo de Entrar, Ganhar, Apagar): testado na Task 1.
- Anel de foco branco precisa vencer o `outline-primary` do tema (tailwind-merge): testado na Task 1 pelas classes do botão renderizado.
- Rótulo longo ("Voltar para a carteira", "Digitar o código da visita") não pode ser cortado em 375px: conferir no navegador na Task 8.
- Ranking vira link: alvo ≥ 44px e continua um `<a>` real (Task 5).
- Rótulos trocados quebram testes que buscam texto: cada task atualiza esses testes no mesmo commit.

## Rulings já tomados no plano

- **Papel `inline`** (acrescentado ao spec, Task 1): `color=primary variant=link size=lg`, para o link "Trocar número" dentro de frase em Entrar. Sem ele a tela precisaria de `UButton` cru.
- **Salvar aniversário** é `primary` `size="lg"`: é o envio do próprio formulário. A regra "Perfil não tem primary" vale para ações da página.
- **Tentar de novo** de card/seção de erro (Carteira, histórico de Prêmios) é `primary` `size="lg"` (a ação única do card).
- **`redemption.back`** (nome acessível do ícone de voltar do Resgate) passa de "Carteira" para "Voltar para a carteira".
- "Ganhar" (envio do código da visita) fica: o verbo depende da unidade e está fora desta onda.

---

### Task 1: `ActionButton`, mapa de papéis, convenção e contraste

**Files:**
- Create: `layers/ui/app/types/action.ts`
- Create: `layers/ui/app/utils/actionRole.ts`
- Create: `layers/ui/app/components/ActionButton.vue`
- Create: `layers/ui/test/ActionButton.nuxt.test.ts`
- Create: `layers/ui/test/actionContrast.test.ts`
- Modify: `layers/core/test/conventions.test.ts`

**Interfaces:**
- Produces: `ActionRole = 'primary' | 'reward' | 'secondary' | 'quiet' | 'danger' | 'dangerConfirm' | 'inline'`; `ActionSurface = 'light' | 'dark'`; `ACTION_ROLES: Record<ActionRole, { color; variant; size }>`; componente `<ActionButton role surface? size? ...atributos do UButton>` (auto-importado como `ActionButton`).
- Produces: regra de convenção `customer screens use ActionButton` com lista transitória de 19 arquivos.

- [ ] **Step 1: Write the failing tests**

`layers/ui/test/ActionButton.nuxt.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ActionButton from '../app/components/ActionButton.vue'
import type { ActionRole } from '../app/types/action'

const CLASS_BY_ROLE: Record<ActionRole, string> = {
  primary: 'bg-primary',
  reward: 'bg-secondary',
  secondary: 'ring-accented',
  quiet: 'hover:bg-elevated',
  danger: 'ring-error',
  dangerConfirm: 'bg-error',
  inline: 'text-primary',
}

async function render(props: Record<string, unknown>) {
  return mountSuspended(ActionButton, { props: { label: 'Ação', ...props } })
}

describe('ActionButton', () => {
  it.each(Object.entries(CLASS_BY_ROLE))('role %s renders its look', async (role, token) => {
    const button = await render({ role })
    expect(button.get('button').classes().join(' ')).toContain(token)
  })

  it('is large by default and extra large for primary and reward', async () => {
    expect((await render({ role: 'secondary' })).get('button').classes()).toContain('min-h-12')
    expect((await render({ role: 'primary' })).get('button').classes()).toContain('min-h-14')
    expect((await render({ role: 'reward' })).get('button').classes()).toContain('min-h-14')
  })

  it('lets a screen raise the size of a secondary action', async () => {
    expect((await render({ role: 'secondary', size: 'xl' })).get('button').classes()).toContain('min-h-14')
  })

  it('uses a white focus ring on dark surfaces and keeps the theme ring otherwise', async () => {
    const dark = await render({ role: 'primary', surface: 'dark' })
    expect(dark.get('button').classes()).toContain('focus-visible:outline-white')
    expect(dark.get('button').classes()).not.toContain('focus-visible:outline-primary')
    const light = await render({ role: 'primary' })
    expect(light.get('button').classes()).not.toContain('focus-visible:outline-white')
  })

  it('passes loading and disabled to the button so it cannot be pressed twice', async () => {
    const loading = await render({ role: 'primary', loading: true })
    expect(loading.get('button').attributes('disabled')).toBeDefined()
    const disabled = await render({ role: 'quiet', disabled: true })
    expect(disabled.get('button').attributes('disabled')).toBeDefined()
  })

  it('renders a link when given a destination and emits click otherwise', async () => {
    const link = await render({ role: 'primary', to: '/carteira' })
    expect(link.get('a').attributes('href')).toBe('/carteira')
    const button = await render({ role: 'secondary' })
    await button.get('button').trigger('click')
    expect(button.emitted('click')).toHaveLength(1)
  })
})
```

`layers/ui/test/actionContrast.test.ts`:

```ts
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const css = readFileSync(fileURLToPath(new URL('../app/assets/css/main.css', import.meta.url)), 'utf8')

function hex(token: string): string {
  const match = new RegExp(`--color-${token}:\\s*(#[0-9A-Fa-f]{6})`).exec(css)
  if (match?.[1] === undefined) throw new Error(`token ${token} not found`)
  return match[1]
}

function luminance(color: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16) / 255)
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (light + 0.05) / (dark + 0.05)
}

describe('action contrast', () => {
  it('keeps white text readable on the solid primary and reward buttons (4.5:1)', () => {
    expect(contrast('#FFFFFF', hex('tinta-700'))).toBeGreaterThanOrEqual(4.5)
    expect(contrast('#FFFFFF', hex('carimbo-600'))).toBeGreaterThanOrEqual(4.5)
  })

  it('keeps the white focus ring visible on the dark header strip (3:1)', () => {
    expect(contrast('#FFFFFF', hex('tinta-800'))).toBeGreaterThanOrEqual(3)
  })
})
```

In `layers/core/test/conventions.test.ts`, after `TRANSITIONAL_PAGE_TEMPLATE`, add:

```ts
/** Tela do cliente com `<UButton>` cru: use `ActionButton` (papéis em layers/ui). */
const TRANSITIONAL_RAW_BUTTON: readonly string[] = [
  'layers/customer/app/components/check-in/CodeForm.vue',
  'layers/customer/app/components/check-in/EarnedStep.vue',
  'layers/customer/app/components/check-in/JoinedStep.vue',
  'layers/customer/app/components/check-in/Notice.vue',
  'layers/customer/app/components/check-in/ScanStep.vue',
  'layers/customer/app/components/discover/KnownShops.vue',
  'layers/customer/app/components/profile/BirthdayForm.vue',
  'layers/customer/app/components/profile/EraseAccount.vue',
  'layers/customer/app/components/profile/PrivacySection.vue',
  'layers/customer/app/components/ranking/JoinForm.vue',
  'layers/customer/app/components/rewards/HistorySection.vue',
  'layers/customer/app/components/sign-in/ProfileStep.vue',
  'layers/customer/app/components/wallet/Empty.vue',
  'layers/customer/app/components/wallet/Problem.vue',
  'layers/customer/app/pages/profile.vue',
  'layers/customer/app/pages/ranking.vue',
  'layers/customer/app/pages/reward-redemption.vue',
  'layers/customer/app/pages/sign-in.vue',
  'layers/customer/app/pages/wallet.vue',
]
```

and next to the other `describeRule(...)` calls:

```ts
function usesRawButton(path: string): boolean {
  return path.startsWith('layers/customer/app/') && /<UButton\b/.test(stripComments(read(path)))
}

describeRule('customer screens use ActionButton', TRANSITIONAL_RAW_BUTTON, usesRawButton, 'no <UButton> in layers/customer; pick an ActionButton role')
```

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm vitest run --project nuxt layers/ui/test/ActionButton.nuxt.test.ts` and `pnpm vitest run --project node layers/ui/test/actionContrast.test.ts layers/core/test/conventions.test.ts`
Expected: ActionButton test FAIL (module not found). Contrast test PASS or FAIL on the numbers: if white on `carimbo-600` or `tinta-700` is under 4.5:1, record a ledger Ruling and pick the next darker token for that role in Step 3 (`ACTION_ROLES` keeps Nuxt UI shades, so the fix is the shade in `main.css`). Conventions PASS (the list matches today's files); if it reports a stale or unsorted entry, fix the list.

- [ ] **Step 3: Implement**

`layers/ui/app/types/action.ts`:

```ts
export type ActionRole = 'primary' | 'reward' | 'secondary' | 'quiet' | 'danger' | 'dangerConfirm' | 'inline'
export type ActionSurface = 'light' | 'dark'
export type ActionSize = 'lg' | 'xl'

export interface ActionLook {
  readonly color: 'primary' | 'secondary' | 'neutral' | 'error'
  readonly variant: 'solid' | 'outline' | 'ghost' | 'link'
  readonly size: ActionSize
}
```

`layers/ui/app/utils/actionRole.ts`:

```ts
import type { ActionLook, ActionRole } from '../types/action'

export const ACTION_ROLES: Record<ActionRole, ActionLook> = {
  primary: { color: 'primary', variant: 'solid', size: 'xl' },
  reward: { color: 'secondary', variant: 'solid', size: 'xl' },
  secondary: { color: 'neutral', variant: 'outline', size: 'lg' },
  quiet: { color: 'neutral', variant: 'ghost', size: 'lg' },
  danger: { color: 'error', variant: 'outline', size: 'lg' },
  dangerConfirm: { color: 'error', variant: 'solid', size: 'lg' },
  inline: { color: 'primary', variant: 'link', size: 'lg' },
}
```

`layers/ui/app/components/ActionButton.vue`:

```vue
<script setup lang="ts">
import type { ActionRole, ActionSize, ActionSurface } from '../types/action'
import { ACTION_ROLES } from '../utils/actionRole'

interface Props {
  role: ActionRole
  surface?: ActionSurface
  size?: ActionSize
}

const props = withDefaults(defineProps<Props>(), { surface: 'light', size: undefined })
const look = computed(() => ACTION_ROLES[props.role])
</script>

<template>
  <UButton
    :color="look.color"
    :variant="look.variant"
    :size="size ?? look.size"
    :class="surface === 'dark' ? 'focus-visible:outline-white' : undefined"
  />
</template>
```

(Attributes — `label`, `icon`, `to`, `block`, `loading`, `disabled`, `type`, `@click` — fall through to the single root `UButton`.)

- [ ] **Step 4: Run to verify they pass**

Run: the three commands from Step 2.
Expected: PASS. If a class token in `CLASS_BY_ROLE` differs in this Nuxt UI version, print `button.html()` for that role, fix the token in the test (not the mapping) and note it in the ledger. If the dark test shows `focus-visible:outline-primary` still present, the `class` is not being merged: pass `:ui="{ base: 'focus-visible:outline-white' }"` instead and re-run.

- [ ] **Step 5: Commit**

```bash
git add apps/web/layers/ui apps/web/layers/core/test/conventions.test.ts
git commit -m "UI: ActionButton with semantic roles, contrast tests and a convention for customer screens

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: `HeaderIconLink` e foco branco num lugar só

**Files:**
- Create: `layers/ui/app/components/HeaderIconLink.vue`
- Create: `layers/ui/test/HeaderIconLink.nuxt.test.ts`
- Modify: `layers/customer/app/components/reward-redemption/BackLink.vue`
- Modify: `layers/customer/app/pages/wallet.vue` (link do perfil, linhas 12-21)
- Modify: `layers/customer/test/rewardRedemptionBackLink.nuxt.test.ts`
- Modify: `layers/core/test/conventions.test.ts` (regra do `outline-white`)

**Interfaces:**
- Consumes: nada da Task 1.
- Produces: `<HeaderIconLink to label icon iconSize?>` (`iconSize` `'md' | 'lg'`, padrão `'md'` = `size-6`, `'lg'` = `size-7`).

- [ ] **Step 1: Write the failing tests**

`layers/ui/test/HeaderIconLink.nuxt.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import HeaderIconLink from '../app/components/HeaderIconLink.vue'

const props = { to: '/carteira', label: 'Voltar para a carteira', icon: 'i-ph-arrow-left' }

describe('HeaderIconLink', () => {
  it('is a real link named by its label', async () => {
    const link = await mountSuspended(HeaderIconLink, { props })
    expect(link.get('a').attributes('href')).toBe('/carteira')
    expect(link.get('a').attributes('aria-label')).toBe('Voltar para a carteira')
  })

  it('keeps a touch target of at least 44px and a white focus ring on the dark strip', async () => {
    const classes = (await mountSuspended(HeaderIconLink, { props })).get('a').classes()
    expect(classes).toContain('size-11')
    expect(classes).toContain('focus-visible:outline-white')
  })

  it('hides the icon from assistive tech and sizes it', async () => {
    const large = await mountSuspended(HeaderIconLink, { props: { ...props, iconSize: 'lg' } })
    const icon = large.get('span, svg')
    expect(icon.attributes('aria-hidden')).toBe('true')
    expect(icon.classes()).toContain('size-7')
  })
})
```

In `rewardRedemptionBackLink.nuxt.test.ts`, change the expected accessible name from "Carteira" to "Voltar para a carteira" (read the file first; keep its other assertions).

In `conventions.test.ts` add (no transitional list; must be true from now on):

```ts
describe('white focus ring', () => {
  it('lives only in ActionButton and HeaderIconLink', () => {
    const offenders = appFiles().filter(
      (path) =>
        !['layers/ui/app/components/ActionButton.vue', 'layers/ui/app/components/HeaderIconLink.vue'].includes(path) &&
        /focus-visible:outline-white/.test(stripComments(read(path))),
    )
    expect(offenders, 'use ActionButton surface="dark" or HeaderIconLink').toEqual([])
  })
})
```

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm vitest run --project nuxt layers/ui/test/HeaderIconLink.nuxt.test.ts layers/customer/test/rewardRedemptionBackLink.nuxt.test.ts` and `pnpm vitest run --project node layers/core/test/conventions.test.ts`
Expected: FAIL (component missing; name still "Carteira"; conventions lists `BackLink.vue` and `wallet.vue` as offenders).

- [ ] **Step 3: Implement**

`layers/ui/app/components/HeaderIconLink.vue`:

```vue
<script setup lang="ts">
interface Props {
  to: string
  label: string
  icon: string
  iconSize?: 'md' | 'lg'
}

withDefaults(defineProps<Props>(), { iconSize: 'md' })
</script>

<template>
  <NuxtLink
    :to="to"
    class="grid size-11 shrink-0 place-items-center rounded-full bg-white/15 text-white ring-1 ring-white/50 transition-colors duration-(--lagoa-dur-fast) hover:bg-white/25 focus-visible:outline-white"
    :aria-label="label"
  >
    <UIcon :name="icon" :class="iconSize === 'lg' ? 'size-7' : 'size-6'" aria-hidden="true" />
  </NuxtLink>
</template>
```

`BackLink.vue` template becomes `<HeaderIconLink :to="to" :label="label" icon="i-ph-arrow-left" />` (keep its Props). In `wallet.vue`, replace the whole `<NuxtLink to="/perfil" …>…</NuxtLink>` with `<HeaderIconLink to="/perfil" :label="t('wallet.profileLink')" icon="i-ph-user-circle" icon-size="lg" />`. In `pt-BR.json` change `redemption.back` (line ~539) from "Carteira" to "Voltar para a carteira".

- [ ] **Step 4: Run to verify they pass**

Run: same commands as Step 2, plus `pnpm vitest run --project nuxt layers/customer/test/walletScreen.nuxt.test.ts`.
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/layers apps/web/layers/core/i18n/locales/pt-BR.json
git commit -m "UI: HeaderIconLink replaces three copies of the dark-strip icon link

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Glossário de rótulos em `pt-BR.json`

**Files:**
- Create: `layers/core/test/labelGlossary.test.ts`
- Modify: `layers/core/i18n/locales/pt-BR.json`
- Modify: testes que buscam os textos antigos (`layers/customer/test/birthdayForm.nuxt.test.ts` linhas 17 e 51; os demais saem do grep do Step 1)

**Interfaces:**
- Produces: os valores finais das chaves abaixo (as chaves não mudam).

| Chave | De | Para |
|---|---|---|
| `discover.openWallet` | Abrir a carteira | Ver carteira |
| `checkIn.joined.toWallet` | Ver na carteira | Ver carteira |
| `rewards.redeem` | Mostrar código no balcão | Resgatar prêmio |
| `profile.birthday.removeConfirm` | Tirar a data | Tirar aniversário |
| `profile.birthday.removeCancel` | Manter | Manter a data |
| `profile.eraseConfirm` | Sim, apagar tudo | Apagar minha conta |
| `checkIn.typeVisitCode` | Tenho o código da visita | Digitar o código da visita |

(`checkIn.typeShopCode` "Tenho o código do cartaz da loja" vira "Digitar o código do cartaz da loja" pelo mesmo verbo.)

- [ ] **Step 1: Write the failing test and find affected tests**

`layers/core/test/labelGlossary.test.ts`:

```ts
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const messages: unknown = JSON.parse(readFileSync(fileURLToPath(new URL('../i18n/locales/pt-BR.json', import.meta.url)), 'utf8'))

function pick(path: string): unknown {
  return path.split('.').reduce<unknown>((node, key) => (typeof node === 'object' && node !== null ? (node as Record<string, unknown>)[key] : undefined), messages)
}

function values(node: unknown): string[] {
  if (typeof node === 'string') return [node]
  if (typeof node === 'object' && node !== null) return Object.values(node).flatMap(values)
  return []
}

const EXPECTED: Record<string, string> = {
  'discover.openWallet': 'Ver carteira',
  'checkIn.toWallet': 'Ver carteira',
  'checkIn.joined.toWallet': 'Ver carteira',
  'redemption.backToWallet': 'Voltar para a carteira',
  'redemption.back': 'Voltar para a carteira',
  'wallet.redeem': 'Resgatar prêmio',
  'checkIn.earned.redeem': 'Resgatar prêmio',
  'rewards.redeem': 'Resgatar prêmio',
  'profile.birthday.remove': 'Tirar aniversário',
  'profile.birthday.removeConfirm': 'Tirar aniversário',
  'profile.birthday.removeCancel': 'Manter a data',
  'profile.eraseButton': 'Apagar minha conta',
  'profile.eraseConfirm': 'Apagar minha conta',
  'profile.eraseCancel': 'Manter minha conta',
  'checkIn.typeVisitCode': 'Digitar o código da visita',
  'checkIn.typeShopCode': 'Digitar o código do cartaz da loja',
}

const RETIRED = [
  'Ver na carteira',
  'Abrir a carteira',
  'Mostrar código no balcão',
  'Tirar a data',
  'Manter',
  'Sim, apagar tudo',
  'Tenho o código da visita',
  'Tenho o código do cartaz da loja',
]

describe('label glossary', () => {
  it.each(Object.entries(EXPECTED))('%s reads "%s"', (key, label) => {
    expect(pick(key)).toBe(label)
  })

  it('does not bring retired labels back', () => {
    const all = values(messages)
    expect(RETIRED.filter((label) => all.includes(label))).toEqual([])
  })
})
```

Then find the tests that hard-code the old texts: `grep -rn "Ver na carteira\|Abrir a carteira\|Mostrar código no balcão\|Tirar a data\|Tenho o código\|Sim, apagar tudo\|'Manter'" layers --include='*.ts'`.

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run --project node layers/core/test/labelGlossary.test.ts`
Expected: FAIL on the seven changed keys and on the retired list.

- [ ] **Step 3: Implement**

Apply the table in `pt-BR.json` (use Edit per key; the JSON keys stay). Update every test found in Step 1 to the new text (`birthdayForm.nuxt.test.ts`: `remove` stays "Tirar aniversário"? no — its fixture `remove: 'Tirar a data'` is a prop label passed in, so only change it to `'Tirar aniversário'` and line 51's expectation to match).

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run --project node layers/core/test/labelGlossary.test.ts` then `pnpm vitest run --project nuxt layers/customer` (whole customer suite).
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/layers
git commit -m "Customer copy: one label per destination and command (glossary)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Check-in e Entrar com papéis de ação

**Files (modify):** `layers/customer/app/components/check-in/{CodeForm,ScanStep,EarnedStep,JoinedStep,Notice}.vue`, `layers/customer/app/components/sign-in/ProfileStep.vue`, `layers/customer/app/pages/sign-in.vue`, `layers/core/test/conventions.test.ts` (tirar os 7 caminhos), testes `layers/customer/test/checkInComponents.nuxt.test.ts`, `customerSignIn.nuxt.test.ts` (asserções de papel).

**Interfaces:**
- Consumes: `ActionButton` (Task 1), rótulos (Task 3).

Mapa (todas as props de dados — `label`, `icon`, `to`, `block`, `loading`, `disabled`, `@click`, `type` — ficam como estão; só `color`/`variant`/`size` saem e entra `role`):

| Arquivo | Botão | Papel |
|---|---|---|
| `CodeForm` | enviar | `primary` |
| `CodeForm` | trocar de tipo de código | `secondary` |
| `CodeForm` | usar a câmera | `quiet` |
| `ScanStep` | digitar o código | `secondary` + `size="xl"` |
| `EarnedStep` | Resgatar prêmio (com prêmio) | `reward` |
| `EarnedStep` | Ver carteira | `secondary size="xl"` com prêmio; `primary` sem prêmio (dois `v-if`/`v-else`, sem `:variant`/`:color` dinâmicos) |
| `JoinedStep` | Ver carteira | `primary` |
| `Notice` | Ver carteira / refazer | `primary` |
| `Notice` | digitar o código | `secondary size="xl"` |
| `ProfileStep` | criar conta | `primary` |
| `sign-in.vue` | Receber código, Entrar | `primary` |
| `sign-in.vue` | Reenviar código | `quiet` |
| `sign-in.vue` | Trocar número | `inline` (mantém a classe de alvo `after:`; `class` passa por fallthrough) |

- [ ] **Step 1: Write the failing tests**

Em `checkInComponents.nuxt.test.ts` (leia o arquivo antes e siga o estilo de mount) acrescente, para `EarnedStep`: com `earned.rewardCardId` o botão "Resgatar prêmio" tem a classe `bg-secondary` e "Ver carteira" tem `ring-accented` (contornado); sem prêmio, "Ver carteira" tem `bg-primary` e não há `bg-secondary`. Para `Notice` com `recovery: 'retry'`: o botão de refazer tem `bg-primary` e o de digitar o código `ring-accented`. Para `CodeForm`: o envio tem `bg-primary`, o de trocar tem `ring-accented`, o de câmera tem `hover:bg-elevated`. Em `customerSignIn.nuxt.test.ts`: "Receber código" tem `bg-primary`; no passo do código "Reenviar código" tem `hover:bg-elevated`.

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm vitest run --project nuxt layers/customer/test/checkInComponents.nuxt.test.ts layers/customer/test/customerSignIn.nuxt.test.ts`
Expected: FAIL only on the new role assertions (some may already pass by accident, e.g. `bg-primary` on a default `UButton`; those are acceptable, but the `EarnedStep` and `CodeForm` ones must fail).

- [ ] **Step 3: Implement**

Troque `<UButton …>` por `<ActionButton role="…" …>` seguindo a tabela, removendo `color`, `variant` e (quando igual ao padrão do papel) `size`. Em `EarnedStep`:

```vue
<ActionButton v-if="earned.rewardCardId" role="reward" :to="`/premios/${earned.rewardCardId}`" block icon="i-ph-gift" :label="$t('checkIn.earned.redeem')" />
<ActionButton :role="earned.rewardCardId ? 'secondary' : 'primary'" size="xl" to="/carteira" block :label="$t('checkIn.toWallet')" />
```

(`:role` com ternário é aceito: a regra de convenção só proíbe `UButton`; a escolha continua um papel.) Remova os 7 caminhos migrados de `TRANSITIONAL_RAW_BUTTON`.

- [ ] **Step 4: Run to verify they pass**

Run: `pnpm vitest run --project nuxt layers/customer` e `pnpm vitest run --project node layers/core/test/conventions.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/layers
git commit -m "Customer check-in and sign-in: action roles on every button

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Perfil — hierarquia e Ranking como linha

**Files:**
- Create: `layers/customer/app/components/profile/RankingLink.vue`
- Create: `layers/customer/test/profileActions.nuxt.test.ts`
- Modify: `layers/customer/app/pages/profile.vue`, `components/profile/{PrivacySection,EraseAccount,BirthdayForm}.vue`
- Modify: `layers/core/test/conventions.test.ts` (tirar `profile.vue`, `PrivacySection`, `EraseAccount`, `BirthdayForm`)

**Interfaces:**
- Consumes: `ActionButton` (Task 1), rótulos (Task 3).
- Produces: `<ProfileRankingLink />` (sem props; texto `ranking.link`).

Mapa: `profile.vue` Sair → `quiet` (`icon="i-ph-sign-out"`, `block`); Ranking → `<ProfileRankingLink />`. `PrivacySection` baixar dados → `secondary`. `EraseAccount` gatilho → `danger`; confirmar → `dangerConfirm size="xl"`; cancelar → `secondary size="xl"`. `BirthdayForm` salvar → `primary size="lg"`; remover → `danger size="lg"`; confirmar remoção → `dangerConfirm size="xl"`; manter → `secondary size="xl"`.

- [ ] **Step 1: Write the failing tests**

`layers/customer/test/profileActions.nuxt.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import RankingLink from '../app/components/profile/RankingLink.vue'
import EraseAccount from '../app/components/profile/EraseAccount.vue'

describe('profile actions', () => {
  it('ranking is a real link with a touch target of at least 44px', async () => {
    const row = await mountSuspended(RankingLink)
    const link = row.get('a')
    expect(link.attributes('href')).toBe('/ranking')
    expect(link.text()).toBe('Ranking da cidade')
    expect(link.classes()).toContain('min-h-12')
  })

  it('erasing starts as an outlined danger action and confirms with a solid one', async () => {
    const labels = { button: 'Apagar minha conta', confirmTitle: 't', confirmDescription: 'd', confirm: 'Apagar minha conta', cancel: 'Manter minha conta' }
    const erase = await mountSuspended(EraseAccount, { props: { pending: false, labels } })
    const trigger = erase.get('button')
    expect(trigger.classes().join(' ')).toContain('ring-error')
    await trigger.trigger('click')
    const buttons = Array.from(document.body.querySelectorAll('button'))
    const confirm = buttons.find((b) => b.textContent?.includes('Apagar minha conta') && b.classList.contains('bg-error'))
    const cancel = buttons.find((b) => b.textContent?.includes('Manter minha conta'))
    expect(confirm).toBeDefined()
    expect(cancel?.className).toContain('ring-accented')
  })
})
```

(Se o `labels` real de `EraseAccount` tiver outro formato, copie o tipo de `types/profile.ts`.) Em `profileScreen.nuxt.test.ts` não muda nada; em `birthdayForm.nuxt.test.ts` acrescente: "Tirar aniversário" tem `ring-error` e o salvar tem `bg-primary`.

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm vitest run --project nuxt layers/customer/test/profileActions.nuxt.test.ts layers/customer/test/birthdayForm.nuxt.test.ts`
Expected: FAIL (componente inexistente; classes de papel ausentes).

- [ ] **Step 3: Implement**

`components/profile/RankingLink.vue`:

```vue
<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <NuxtLink
    to="/ranking"
    class="flex min-h-12 items-center gap-3 rounded-(--radius-card) bg-default px-4 text-highlighted shadow-(--lagoa-shadow-card) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
  >
    <UIcon name="i-ph-trophy" class="size-6 shrink-0 text-primary" aria-hidden="true" />
    <span class="flex-1 font-semibold">{{ t('ranking.link') }}</span>
    <UIcon name="i-ph-caret-right" class="size-5 shrink-0 text-muted" aria-hidden="true" />
  </NuxtLink>
</template>
```

Aplicar o mapa nos demais arquivos; em `profile.vue` troque as duas linhas de `UButton` por `<ProfileRankingLink />` e `<ActionButton role="quiet" block icon="i-ph-sign-out" :label="t('profile.signOut')" @click="screen.signOut" />`. Remova os 4 caminhos de `TRANSITIONAL_RAW_BUTTON`.

- [ ] **Step 4: Run to verify they pass**

Run: `pnpm vitest run --project nuxt layers/customer` e `pnpm vitest run --project node layers/core/test/conventions.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/layers
git commit -m "Customer profile: clear action hierarchy, ranking as a navigation row

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Carteira, Descobrir, Prêmios, Ranking e Resgate

**Files (modify):** `layers/customer/app/components/wallet/{Problem,Empty}.vue`, `pages/wallet.vue`, `components/discover/KnownShops.vue`, `components/rewards/HistorySection.vue`, `components/ranking/JoinForm.vue`, `pages/ranking.vue`, `pages/reward-redemption.vue`, `layers/core/test/conventions.test.ts` (tirar os 8 caminhos restantes: lista fica `[]`), testes `walletScreen.nuxt.test.ts`, `discoverScreen.nuxt.test.ts`, `rewardsScreen.nuxt.test.ts`.

**Interfaces:**
- Consumes: `ActionButton` (Task 1), rótulos (Task 3).

| Arquivo | Botão | Papel |
|---|---|---|
| `wallet/Problem` | Tentar de novo | `primary size="lg"` |
| `wallet/Empty` | Ver lojas da rede | `primary` |
| `wallet.vue` | Resgatar prêmio (`card.rewardReady`) | `reward icon="i-ph-gift"` |
| `KnownShops` | Ver carteira | `quiet`, `trailing-icon`, `class="self-start"` |
| `HistorySection` | Tentar de novo | `primary size="lg"` |
| `ranking/JoinForm` | enviar | `primary` |
| `ranking.vue` | Sair do ranking | `secondary` |
| `reward-redemption.vue` | Gerar novo código; Voltar para a carteira | `primary` |

- [ ] **Step 1: Write the failing tests**

Em `walletScreen.nuxt.test.ts`: o estado de erro mostra "Tentar de novo" com `bg-primary`; um cartão com prêmio liberado mostra "Resgatar prêmio" com `bg-secondary`. Em `discoverScreen.nuxt.test.ts`: "Ver carteira" (antes "Abrir a carteira") existe e tem `hover:bg-elevated`. Em `rewardsScreen.nuxt.test.ts`: o cupom mostra "Resgatar prêmio" e o erro do histórico mostra "Tentar de novo" com `bg-primary`. Use os helpers/fixtures já presentes em cada arquivo.

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm vitest run --project nuxt layers/customer/test/walletScreen.nuxt.test.ts layers/customer/test/discoverScreen.nuxt.test.ts layers/customer/test/rewardsScreen.nuxt.test.ts`
Expected: FAIL nas novas asserções de papel.

- [ ] **Step 3: Implement**

Aplicar a tabela. `Problem.vue` fica `<ActionButton role="primary" size="lg" :icon="actionIcon" :label="action" @click="emit('retry')" />`. Esvaziar `TRANSITIONAL_RAW_BUTTON` (`= []`).

- [ ] **Step 4: Run to verify they pass**

Run: `pnpm vitest run --project nuxt layers/customer` e `pnpm vitest run --project node layers/core/test/conventions.test.ts`
Expected: PASS. Confira também `grep -rn "<UButton" layers/customer/app` vazio.

- [ ] **Step 5: Commit**

```bash
git add apps/web/layers
git commit -m "Customer wallet, discover, rewards, ranking and redemption: action roles

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Documentação (MASTER e auditoria)

**Files:**
- Modify: `design-system/lagoa/MASTER.md` (seção de botões)
- Modify: `design-system/lagoa/pages/customer.md`
- Modify: `docs/superpowers/specs/2026-10-12-customer-wave-5-actions-design.md` (acrescentar o papel `inline` à tabela e a nota do "Salvar aniversário")
- Modify: `docs/superpowers/specs/2026-10-12-customer-internal-design-audit.md` (nota "Onda 5 feita")

- [ ] **Step 1:** Leia a seção de botões do MASTER e a de customer. Substitua a linha de botão por: tabela dos 7 papéis (look, uso), regra "um `primary` por tela ou formulário; `reward` não divide região com `primary`", regra de foco (`surface="dark"` / `HeaderIconLink`), proibição de `UButton` cru no cliente, e o glossário da seção 3 do spec. Em `customer.md` liste o papel de cada ação por tela (tabela do spec, seção 4, já fechada).
- [ ] **Step 2:** Spec: papel `inline` na tabela da seção 1 e a decisão do Salvar aniversário na seção 4. Auditoria: adicionar ao "Plano seguinte" a linha "Onda 5 (feita): botões, hierarquia e nomenclatura".
- [ ] **Step 3: Verify** — `grep -n "ActionButton\|dangerConfirm\|inline" design-system/lagoa/MASTER.md` mostra as três; nenhum teste a rodar.
- [ ] **Step 4: Commit**

```bash
git add design-system docs
git commit -m "Docs: action roles, focus rule and label glossary in the design system

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Verificação no navegador e suíte completa

**Files:** nenhum (só correções pontuais se aparecer defeito; cada correção com teste que falha antes).

- [ ] **Step 1:** Rode a suíte inteira do web: `pnpm test` (da raiz) ou `pnpm vitest run` em `apps/web`, e `pnpm typecheck`. Expected: tudo verde.
- [ ] **Step 2:** `preview_start {name:"lagoa-dev"}`, entre com o número de teste `67999990001` e o código `123456`, navegue sem recarregar (`window.useNuxtApp().$router.push(...)`). Em 390px e 375px confira: Carteira (cabeçalho, ícone do perfil com foco por Tab; erro com API parada: "Tentar de novo" preenchido), Perfil (Ranking como linha, Baixar meus dados contornado, Sair em texto, Apagar em vermelho contornado; abrir a confirmação de apagar e de tirar aniversário), Check-in (digitar código: botões e rótulo "Digitar o código da visita" sem cortar), Prêmios, Resgate (voltar com foco branco). Tema claro e escuro no Perfil. Câmera fica sem verificação (bloqueada no navegador).
- [ ] **Step 3:** Qualquer defeito: escreva o teste que falha, corrija, rode a suíte, commit. Sem defeito: nada a commitar.
