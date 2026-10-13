# Design interno do app do cliente — Plano (Ondas 0 a 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Levar o visual novo do Entrar (cabeçalho com foto da cidade, card herói que sobe sobre a faixa) para as telas internas do cliente, começando por uma auditoria que prioriza o resto.

**Architecture:** A base visual já existe em `layers/ui` (`ScreenHeader` com `image`, `HeroCard`, `ShopCard`) e `Descobrir` já a usa; o trabalho é (1) auditar, (2) tirar a duplicação da foto da cidade para um composable e travar com testes o que o cabeçalho promete, (3) aplicar o cabeçalho com foto em Carteira, Prêmios, Perfil e Ranking. Nada muda em API, BFF, regras ou textos.

**Tech Stack:** Nuxt 4, Vue 3 `<script setup lang="ts">`, Nuxt UI v4, Tailwind v4 (tokens CSS), Vitest (projetos `node` e `nuxt`), Playwright (e2e de convidado).

**Spec:** [`docs/superpowers/specs/2026-10-12-customer-internal-design-design.md`](../specs/2026-10-12-customer-internal-design-design.md)

**Fora deste plano (plano seguinte, escrito depois da auditoria):** Check-in / Carimbo ganho, Resgate, Convite, Cartão da loja e as correções de UX/acessibilidade que a auditoria apontar. Motivo: o escopo dessas ondas depende dos achados da Task 1; escrevê-las agora seria chute.

## Global Constraints

- Código 100% em inglês; português só em texto de interface, em `layers/core/i18n/locales/pt-BR.json` via `$t()`/`useI18n()` com chave em inglês. Sem texto solto no template.
- Nada de hex solto em componente: só tokens (`text-primary`, `bg-default`, `var(--lagoa-header)`, `--color-lima-*`).
- Alvos de toque ≥ 44px; contraste 4.5:1 nos temas escuro e claro; elementos interativos reais; cor nunca é o único sinal.
- Foto só com função (a cidade no topo); nunca como papel de parede. Sem gradiente decorativo, glass, emoji.
- Página = rota + composição; componentes de `layers/ui` não conhecem i18n (recebem texto pronto).
- Tipos fora de `types/` só com `import type`; sem `any`; retorno explícito em funções exportadas de composables.
- `ssr: true` no cliente: nada de `window`/`document` em componente ou página; `watch` com `immediate` não roda no SSR.
- Comandos de teste rodam em `apps/web` (`pnpm vitest run <arquivo>`); a suíte inteira é `pnpm test` e `pnpm typecheck` na raiz.
- Commits em inglês, ao final com `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Foto não carrega** (bucket 404, offline): o cabeçalho continua legível na cor lisa `--lagoa-header`. Coberto pelo teste do `ScreenHeader` sem imagem (Task 3) e pela checagem visual da Task 5.
2. **Nome comprido na saudação** ("Olá, Maria Fernanda Albuquerque de Souza"): o título quebra em linhas, nunca corta. Teste na Task 3.
3. **Movimento reduzido**: toda classe que anima (`.rise`, `.pop-tilt`, `.live-dot`, `.slow-pan`, `.stamp-press`, `.ticket-char`) tem um desligamento em `prefers-reduced-motion`. Teste-guarda na Task 4, para que a próxima animação não esqueça.
4. **Texto branco sobre foto clara no tema claro**: contraste do título sobre o `--lagoa-scrim` não é testável em unidade; entra na checagem visual por onda (Task 5) e na auditoria (Task 1).
5. **Hidratação da Carteira** (estado "visto" mora no aparelho): mexer só no cabeçalho, sem tocar em `seen`/`onMounted`. Conferir que o HTML do servidor não muda (Task 5, Step 4).

---

## Task 1: Onda 0 — Auditoria das telas internas

**Files:**
- Create: `docs/superpowers/specs/2026-10-12-customer-internal-design-audit.md`
- Read: `apps/web/layers/customer/app/pages/*.vue`, `apps/web/layers/customer/app/components/**`, `apps/web/layers/ui/app/components/*.vue`, `design-system/lagoa/MASTER.md`, `design-system/lagoa/pages/customer.md`, `apps/web/layers/ui/app/assets/css/main.css`

**Interfaces:**
- Produces: o arquivo de auditoria, com uma tabela de achados `#`, `Tela`, `Regra`, `Severidade (crítico|alto|médio)`, `Onda de destino`. O plano seguinte parte dele.

- [ ] **Step 1: Varreduras objetivas**

Rode da raiz do worktree e cole a saída (ou "nenhuma ocorrência") na seção "Varreduras" do documento:

```bash
cd apps/web
# hex solto em componente de cliente ou ui
grep -rnE '#[0-9a-fA-F]{3,8}\b' layers/customer/app layers/ui/app/components --include=*.vue
# tamanhos de fonte fora da escala (text-[...px]) e alvos pequenos candidatos
grep -rnE 'text-\[[0-9.]+(px|rem)\]' layers/customer/app --include=*.vue
grep -rnE '\b(size|h|w)-(4|5|6|7|8|9|10)\b' layers/customer/app --include=*.vue
# páginas acima do limite de 30 linhas de script / 60 de template
awk 'FNR==1{f=FILENAME} /<script/{s=1} /<\/script>/{s=0} s{n[f]++} END{for(k in n) print n[k], k}' layers/customer/app/pages/*.vue | sort -rn
# onde PageTitle ainda é usado no lugar de ScreenHeader
grep -rn "<PageTitle\|<ScreenHeader" layers/customer/app --include=*.vue
```

- [ ] **Step 2: Leitura tela a tela**

Para cada tela (Carteira, Descobrir, Prêmios, Resgate, Check-in + passos, Perfil, Ranking, Convite, `layouts/customer.vue`, `AppTabBar`) confira o checklist abaixo e registre cada falha como uma linha da tabela. Não corrija nada nesta task.

| Grupo | Pergunta |
| --- | --- |
| Acessibilidade | Alvo ≥ 44px? Foco visível? Ícone sem texto tem `aria-label`? Um só `h1`, hierarquia sem pulo? Cor é o único sinal? |
| Estados | Tem carregando (skeleton), vazio (com ação), erro (com tentar de novo) e sucesso? |
| Layout | Margem lateral 20px? Conteúdo reserva a altura da tab bar? Sem rolagem horizontal em 375px? |
| Hierarquia | Um único destaque por tela? Ação primária única? |
| Consistência | Cabeçalho é `ScreenHeader` com foto ou `PageTitle` liso? Cards usam `--radius-card` e `--lagoa-shadow-card`? |
| Texto | Algum texto fora do `pt-BR.json`? |
| Movimento | Animação respeita `prefers-reduced-motion`? Nada anima `width/height/top/left`? |

- [ ] **Step 3: Linha de base visual**

Telas internas exigem sessão (o cliente não tem mock). Descubra se há como logar localmente: leia `apps/api/README.md` e `apps/web/.env.example` e verifique se existe celular de teste/Supabase de teste. Registre no documento, em "Como verificar", uma destas duas coisas:
- o passo a passo para abrir `/carteira` logado em `http://localhost:3000` e tirar capturas em 390×844 e 375×812, escuro e claro; ou
- "Sem sessão local disponível: verificação visual das telas internas depende de o time fornecer uma sessão de teste" — e **avise o usuário no chat**.

- [ ] **Step 4: Fechar o documento**

O documento termina com: tabela de achados ordenada por severidade, e a lista "Plano seguinte" (achados por onda). Cabeçalho do arquivo: título, data, escopo, link para o spec.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/specs/2026-10-12-customer-internal-design-audit.md
git commit -m "Audit: customer app internal screens against the design system

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

## Task 2: Foto da cidade num lugar só

`Descobrir` monta a URL da foto inline; Carteira, Perfil e Ranking vão precisar da mesma. A função pura já existe; falta travá-la com teste e dar a ela um composable.

**Files:**
- Create: `apps/web/layers/customer/test/cityHeaderImage.test.ts`
- Create: `apps/web/layers/customer/app/composables/useCityHeaderImage.ts`
- Modify: `apps/web/layers/customer/app/pages/discover.vue:41`

**Interfaces:**
- Consumes: `cityHeaderImageUrl(supabaseUrl: string): string` de `apps/web/layers/customer/app/utils/cityHeaderImage.ts` (já existe).
- Produces: `useCityHeaderImage(): string`, auto-importado em páginas do cliente.

- [ ] **Step 1: Teste de caracterização da função pura**

```ts
// apps/web/layers/customer/test/cityHeaderImage.test.ts
import { describe, expect, it } from 'vitest'
import { cityHeaderImageUrl } from '../app/utils/cityHeaderImage'

describe('cityHeaderImageUrl', () => {
  it('falls back to the local illustration without a Supabase URL', () => {
    expect(cityHeaderImageUrl('')).toBe('/example/city.svg')
  })

  it('points at the public shop-assets bucket', () => {
    expect(cityHeaderImageUrl('https://abc.supabase.co')).toBe(
      'https://abc.supabase.co/storage/v1/object/public/shop-assets/city/discover-header.webp',
    )
  })

  it('does not double the slash when the project URL ends with one', () => {
    expect(cityHeaderImageUrl('https://abc.supabase.co//')).toBe(
      'https://abc.supabase.co/storage/v1/object/public/shop-assets/city/discover-header.webp',
    )
  })
})
```

- [ ] **Step 2: Rodar**

Run: `cd apps/web && pnpm vitest run layers/customer/test/cityHeaderImage.test.ts`
Expected: PASS (3 testes). É teste de caracterização de código que já existe; se algum falhar, o comportamento atual difere do documentado: pare e reporte.

- [ ] **Step 3: Criar o composable**

```ts
// apps/web/layers/customer/app/composables/useCityHeaderImage.ts
import { cityHeaderImageUrl } from '../utils/cityHeaderImage'

export function useCityHeaderImage(): string {
  return cityHeaderImageUrl(useRuntimeConfig().public.supabaseUrl)
}
```

- [ ] **Step 4: Usar em `discover.vue`**

Em `apps/web/layers/customer/app/pages/discover.vue`, trocar a linha 41

```ts
const CITY_HEADER_IMAGE = cityHeaderImageUrl(useRuntimeConfig().public.supabaseUrl)
```

por

```ts
const cityHeaderImage = useCityHeaderImage()
```

trocar `:image="CITY_HEADER_IMAGE"` (linha 56) por `:image="cityHeaderImage"` e remover o `import { cityHeaderImageUrl } ...` que ficar sem uso.

- [ ] **Step 5: Verificar**

Run: `pnpm typecheck && pnpm test` (da raiz)
Expected: tudo verde.

- [ ] **Step 6: Commit**

```bash
git add apps/web/layers/customer
git commit -m "Customer: single useCityHeaderImage composable, pinned by tests

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

## Task 3: Teste do `ScreenHeader`

O cabeçalho vai ser usado em mais quatro telas; o que ele promete precisa estar travado antes.

**Files:**
- Create: `apps/web/layers/ui/test/ScreenHeader.nuxt.test.ts`

**Interfaces:**
- Consumes: `ScreenHeader.vue` com props `title: string`, `lead?: string`, `image?: string`, `headingId?: string`, slots `actions` e padrão.

- [ ] **Step 1: Escrever o teste**

```ts
import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ScreenHeader from '../app/components/ScreenHeader.vue'

describe('ScreenHeader', () => {
  it('renders the title as the single h1 with the lead below it', async () => {
    const wrapper = await mountSuspended(ScreenHeader, { props: { title: 'Olá, Ana', lead: 'Seus cartões' } })
    expect(wrapper.findAll('h1')).toHaveLength(1)
    expect(wrapper.get('h1').text()).toBe('Olá, Ana')
    expect(wrapper.text()).toContain('Seus cartões')
  })

  it('keeps a long title whole: it wraps instead of truncating', async () => {
    const title = 'Olá, Maria Fernanda Albuquerque de Souza Nascimento'
    const wrapper = await mountSuspended(ScreenHeader, { props: { title } })
    expect(wrapper.get('h1').text()).toBe(title)
    expect(wrapper.get('h1').classes()).not.toContain('truncate')
  })

  it('stays on the solid header color without a photo', async () => {
    const wrapper = await mountSuspended(ScreenHeader, { props: { title: 'Perfil' } })
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.get('header').classes()).toContain('bg-(--lagoa-header)')
  })

  it('draws the photo as decoration only', async () => {
    const wrapper = await mountSuspended(ScreenHeader, { props: { title: 'Perfil', image: '/example/city.svg' } })
    const image = wrapper.get('img')
    expect(image.attributes('alt')).toBe('')
    expect(image.attributes('src')).toBe('/example/city.svg')
  })

  it('renders the actions slot beside the title', async () => {
    const wrapper = await mountSuspended(ScreenHeader, {
      props: { title: 'Perfil' },
      slots: { actions: '<a href="/perfil" aria-label="Perfil">ir</a>' },
    })
    expect(wrapper.get('a[aria-label="Perfil"]').exists()).toBe(true)
  })
})
```

- [ ] **Step 2: Rodar**

Run: `cd apps/web && pnpm vitest run layers/ui/test/ScreenHeader.nuxt.test.ts`
Expected: PASS (5 testes), é caracterização do componente atual. Se `bg-(--lagoa-header)` não aparecer em `classes()` por causa de como o Tailwind arbitrário é serializado, troque a asserção por `expect(wrapper.get('header').attributes('class')).toContain('--lagoa-header')`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/layers/ui/test/ScreenHeader.nuxt.test.ts
git commit -m "UI: pin ScreenHeader behavior (single h1, long titles, photo is decoration)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

## Task 4: Teste-guarda de movimento reduzido

**Files:**
- Create: `apps/web/layers/ui/test/reducedMotion.test.ts`

**Interfaces:**
- Consumes: `apps/web/layers/ui/app/assets/css/main.css`. Regra: toda classe `.nome { ... animation: ... }` de nível superior aparece em algum seletor dentro de um `@media (prefers-reduced-motion: reduce) { ... }`.

- [ ] **Step 1: Escrever o teste**

```ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('../app/assets/css/main.css', import.meta.url), 'utf8')

const animatedClasses = [...css.matchAll(/^\.([\w-]+)\s*\{[^}]*\banimation:/gm)].map((match) => match[1])

const reducedMotionCss = [...css.matchAll(/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/g)]
  .map((match) => match[1])
  .join('\n')

describe('reduced motion', () => {
  it('finds the animated utility classes it is guarding', () => {
    expect(animatedClasses).toEqual(expect.arrayContaining(['stamp-press', 'ticket-char', 'rise', 'pop-tilt', 'live-dot', 'slow-pan']))
  })

  it.each(animatedClasses)('turns off .%s under prefers-reduced-motion', (name) => {
    expect(reducedMotionCss).toMatch(new RegExp(`\\.${name}\\b`))
  })
})
```

- [ ] **Step 2: Rodar**

Run: `cd apps/web && pnpm vitest run layers/ui/test/reducedMotion.test.ts`
Expected: PASS. Se o primeiro teste falhar por não achar as seis classes, o regex não casou com o CSS: ajuste o regex olhando `main.css` linhas 244 a 340 (as classes são seletores simples no começo da linha) e rode de novo.

- [ ] **Step 3: Provar que o guarda funciona**

Comente temporariamente a linha `.rise, .pop-tilt, .live-dot, .slow-pan {` do bloco `@media` (troque por `.pop-tilt, .live-dot, .slow-pan {`) e rode o teste.
Expected: FAIL em `turns off .rise under prefers-reduced-motion`. Desfaça a edição (`git checkout apps/web/layers/ui/app/assets/css/main.css`) e rode de novo: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/layers/ui/test/reducedMotion.test.ts
git commit -m "UI: guard test so every animation class has a reduced-motion switch

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

## Task 5: Carteira com cabeçalho de foto

A Carteira já usa `ScreenHeader` e `CardStack` sobe sobre a faixa (`-mt-10`), mas o cabeçalho está sem foto, ao contrário de Descobrir.

**Files:**
- Modify: `apps/web/layers/customer/app/pages/wallet.vue` (script: junto às outras `const`; template: linha do `<ScreenHeader`)

**Interfaces:**
- Consumes: `useCityHeaderImage(): string` (Task 2).

- [ ] **Step 1: Editar a página**

No `<script setup>`, logo depois de `const seenStamps = useSeenStamps()`, acrescentar:

```ts
const cityHeaderImage = useCityHeaderImage()
```

No template, trocar

```vue
<ScreenHeader :title="greeting" :lead="t('wallet.lead')">
```

por

```vue
<ScreenHeader :title="greeting" :lead="t('wallet.lead')" :image="cityHeaderImage">
```

Não tocar em `seen`, `onMounted` nem nos `watch`.

- [ ] **Step 2: Verificar tipos e testes**

Run: `pnpm typecheck && pnpm test` (da raiz)
Expected: verde.

- [ ] **Step 3: Verificar no navegador (390px e 375px, escuro e claro)**

Suba com `preview_start` `{name: "lagoa-dev"}` e abra `/carteira` com sessão (ver "Como verificar" da auditoria, Task 1). Confirme: foto aparece no topo; título e lead legíveis sobre o scrim (contraste ≥ 4.5:1 nos dois temas); o botão de perfil continua ≥ 44px; `CardStack` sobe sobre a faixa sem cortar; sem rolagem horizontal; com `prefers-reduced-motion` a foto não pana. Tire captura nos quatro casos. Se não houver sessão local, diga isso ao usuário em vez de declarar a tela verificada.

- [ ] **Step 4: Conferir que a hidratação não mudou**

Run: `pnpm dev` e, com `/carteira` aberta, `read_console_messages` filtrando `hydration`.
Expected: nenhum aviso de hydration mismatch.

- [ ] **Step 5: Commit**

```bash
git add apps/web/layers/customer/app/pages/wallet.vue
git commit -m "Customer wallet: city photo in the screen header

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

## Task 6: Prêmios, Perfil e Ranking com o mesmo cabeçalho

Regra de sobreposição: o primeiro elemento só sobe sobre a faixa quando é **um card único**. Perfil (card de telefone e avisos) sobe; Prêmios (abre com um `h2`) e Ranking (abre com lista ou estados) não sobem, o conteúdo começa abaixo da faixa. Texto escuro nunca pode ficar sobre a faixa escura.

**Files:**
- Modify: `apps/web/layers/customer/app/pages/rewards.vue` (template, `<PageTitle>` e raiz)
- Modify: `apps/web/layers/customer/app/pages/profile.vue` (template, `<PageTitle>` e primeiro bloco)
- Modify: `apps/web/layers/customer/app/pages/ranking.vue` (template, `<PageTitle>` e raiz)

**Interfaces:**
- Consumes: `useCityHeaderImage(): string` (Task 2); `ScreenHeader` props `title`, `lead?`, `image?`.

- [ ] **Step 1: Prêmios**

No `<script setup>` de `rewards.vue`, depois de `useHead(...)`, acrescentar `const cityHeaderImage = useCityHeaderImage()`. No template, trocar

```vue
<div class="flex flex-col gap-8">
  <PageTitle :title="t('rewards.title')" />
```

por

```vue
<div class="flex flex-col gap-8">
  <ScreenHeader :title="t('rewards.title')" :image="cityHeaderImage" />
```

O espaçamento entre cabeçalho e primeira seção vem do `gap-8` existente; o `pb-16` do cabeçalho já deixa respiro, então acrescente `class="-mb-4"` ao `ScreenHeader` se a captura da Step 5 mostrar vão grande demais (decida olhando, não por palpite).

- [ ] **Step 2: Ranking**

Em `ranking.vue`, depois de `useHead(...)`, acrescentar `const cityHeaderImage = useCityHeaderImage()`. Trocar

```vue
<PageTitle :title="t('ranking.title')" :lead="state.status === 'success' ? t('ranking.lead', { month: monthTitle(state.value.month) }) : undefined" />
```

por

```vue
<ScreenHeader
  :title="t('ranking.title')"
  :lead="state.status === 'success' ? t('ranking.lead', { month: monthTitle(state.value.month) }) : undefined"
  :image="cityHeaderImage"
/>
```

- [ ] **Step 3: Perfil (com sobreposição)**

Em `profile.vue`, depois de `useHead(...)`, acrescentar `const cityHeaderImage = useCityHeaderImage()`. No template, o bloco

```vue
<div class="flex flex-col gap-6">
  <PageTitle :title="t('profile.title')" />

  <USkeleton v-if="state.status === 'loading'" class="h-56 rounded-(--radius-card)" />
  <WalletProblem v-else-if="state.status === 'error'" ... />
  <dl v-else class="rounded-(--radius-card) bg-default px-5 shadow-(--lagoa-shadow-card)"> ... </dl>

  <section v-if="state.status === 'success'" ...>
```

passa a ser

```vue
<div>
  <ScreenHeader :title="t('profile.title')" :image="cityHeaderImage" />

  <div class="flex flex-col gap-6">
    <div class="relative -mt-10">
      <USkeleton v-if="state.status === 'loading'" class="h-56 rounded-(--radius-card)" />
      <WalletProblem v-else-if="state.status === 'error'" ... />
      <dl v-else class="rounded-(--radius-card) bg-default px-5 shadow-(--lagoa-shadow-card)"> ... </dl>
    </div>

    <section v-if="state.status === 'success'" ...>
    ...demais seções e botões, inalterados...
  </div>
</div>
```

Ou seja: a cadeia `v-if/v-else-if/v-else` (com seus atributos originais, sem mudar nada dentro) fica dentro de `<div class="relative -mt-10">`, e a raiz ganha um `<div>` externo para conter o cabeçalho sangrando. Fechar os `</div>` na ordem certa ao final do template.

- [ ] **Step 4: Verificar tipos e testes**

Run: `pnpm typecheck && pnpm test` (da raiz)
Expected: verde. Se `PageTitle` ficar sem nenhum uso em `layers/customer`, ele continua em uso em Check-in/Convite/Resgate; não remover.

- [ ] **Step 5: Verificar no navegador (390px e 375px, escuro e claro)**

Para `/premios`, `/perfil` e `/ranking` (com sessão; ver Task 1): foto no topo, título legível, nenhum texto escuro sobre a faixa, card de Perfil sobe sem cortar o conteúdo, estados de carregando/erro de Perfil também sobem (force erro derrubando a rede no `read_network_requests`/offline), tab bar não cobre o último elemento, sem rolagem horizontal. Capturas dos quatro casos por tela. Sem sessão local, diga isso ao usuário.

- [ ] **Step 6: Commit**

```bash
git add apps/web/layers/customer/app/pages
git commit -m "Customer rewards, profile and ranking: city photo screen header

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

## Task 7: Fechar a rodada

**Files:**
- Modify: `design-system/lagoa/pages/customer.md` (tabela "Telas e o que muda")
- Create: `docs/superpowers/plans/` o próximo plano, só depois da revisão

**Interfaces:**
- Consumes: documento de auditoria (Task 1).

- [ ] **Step 1: Atualizar a documentação de design**

Em `design-system/lagoa/pages/customer.md`, acrescentar após a tabela "Telas e o que muda" a regra:

```markdown
## Cabeçalho das telas internas

Carteira, Descobrir, Prêmios, Perfil e Ranking abrem com `ScreenHeader` + foto da
cidade (`useCityHeaderImage()`). O primeiro elemento só sobe sobre a faixa
(`relative -mt-10`) quando é **um card único** (Carteira: `CardStack`; Descobrir:
`HeroCard`; Perfil: card de telefone e avisos). Quando a tela abre com título de
seção ou lista, o conteúdo começa abaixo da faixa: texto escuro nunca fica sobre
a faixa escura.
```

- [ ] **Step 2: Suíte completa**

Run: `pnpm typecheck && pnpm test` (da raiz) e `cd apps/web && pnpm test:e2e` se o Playwright estiver instalado.
Expected: verde. Qualquer falha é reportada com a saída, não escondida.

- [ ] **Step 3: Commit e próximo passo**

```bash
git add design-system/lagoa/pages/customer.md
git commit -m "Design system: header rule for internal customer screens

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

Depois, abra o plano seguinte (Check-in, Resgate, Convite, Cartão da loja e achados da auditoria) a partir do documento da Task 1.
