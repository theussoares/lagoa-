# Onda 6 — Animações e cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Execução nativa, TDD, comandos em `apps/web` (`pnpm vitest run --project unit|nuxt <arquivo>`).

**Goal:** Tokens de movimento por função, movimento reduzido que comunica e três níveis de card definidos uma vez.

**Architecture:** Só CSS (`layers/ui/app/assets/css/main.css`) e troca de classes nos componentes; testes de arquivo (`unit`) guardam as regras.

**Spec:** [2026-10-12-customer-wave-6-motion-cards-design.md](../specs/2026-10-12-customer-wave-6-motion-cards-design.md)

## Global Constraints

- Sem duração literal em ms fora dos tokens; todo `animation:` coberto por `prefers-reduced-motion` no mesmo arquivo.
- Cards: `card`, `card-tap`, `card-raised`; a receita `rounded-(--radius-card) bg-default shadow-(--lagoa-shadow-card)` não se repete em `layers/ui` nem `layers/customer`.
- Fora: painel do lojista.

## Review Focus

- Lista longa (Ranking com 50 linhas) não pode atrasar a última linha mais que 6 passos × 50ms.
- Sob movimento reduzido nada some: `.rise`/`.pop-tilt` dissolvem em vez de ficar invisíveis.
- Dark mode: `--lagoa-shadow-raised` definido nos dois temas.

### Task 1: Tokens de movimento e movimento reduzido
**Files:** `layers/ui/app/assets/css/main.css`, `layers/ui/app/components/CardStack.vue`, `layers/ui/test/motionTokens.test.ts` (novo), `layers/ui/test/reducedMotion.test.ts`
- [ ] Teste `motionTokens.test.ts` (tokens `--lagoa-dur-enter`, `--lagoa-dur-exit`, `--lagoa-stagger`, `--lagoa-stagger-steps` existem; `.rise`/`.pop-tilt` usam `min(var(--i`; sem `\d+ms` literal em `duration-[`/`transition:`/`animation-delay` nos `.vue`/`.css` de ui e customer, exceto a linha de definição dos tokens; todo arquivo com `animation:` ou `@keyframes` tem `prefers-reduced-motion`). Caso novo em `reducedMotion.test.ts`: o bloco reduzido define `rise-fade`. Rodar: FAIL.
- [ ] Implementar tokens, `.rise`/`.pop-tilt` com teto, `rise-fade`, `CardStack` com `--lagoa-dur-exit`. Rodar: PASS. Commit.

### Task 2: Cards em três níveis
**Files:** `main.css`, 25 componentes/páginas de `layers/ui` e `layers/customer`, `layers/ui/test/cardSurface.test.ts` (novo), `layers/ui/test/CardLevels.nuxt.test.ts` (novo)
- [ ] Testes: `cardSurface.test.ts` (utilitários e `--lagoa-shadow-raised` nos dois temas; receita não repetida) e `CardLevels.nuxt.test.ts` (`ShopTile`/`RewardCoupon` com `card-tap`, `HeroCard` com `card-raised`). Rodar: FAIL.
- [ ] Definir `@utility card|card-tap|card-raised`; substituir a receita por script (os três tokens na mesma `class`), aplicar `card-tap` e `card-raised` conforme o spec. Suíte inteira + typecheck: PASS. Commit.

### Task 3: Documentação e navegador
- [ ] MASTER: tokens de movimento, regra de movimento reduzido, níveis de card. Conferir Descobrir, Prêmios e Perfil no navegador (390px, claro e escuro). Commit.
