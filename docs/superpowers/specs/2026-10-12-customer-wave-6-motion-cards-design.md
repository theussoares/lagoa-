# Onda 6 — Animações e cards (app do cliente)

Data: 2026-10-12 · Escopo: `layers/ui` e `layers/customer` (mobile 390px) · Fora: painel do lojista · Depende da [Onda 5](./2026-10-12-customer-wave-5-actions-design.md)

> Aprovação: o dono do projeto pediu para seguir da Onda 5 até o merge sem paradas intermediárias; este spec e o plano foram escritos sem a revisão intermediária e entram na revisão do PR.

## Objetivo

O movimento do app foi feito peça a peça: durações soltas (480ms, 130ms, 1s), entrada escalonada de 70ms sem teto (um ranking longo leva segundos para aparecer) e `prefers-reduced-motion` que só desliga, sem trocar o movimento por algo que ainda comunique. Os cards repetem à mão a mesma receita (`rounded-(--radius-card) bg-default shadow-(--lagoa-shadow-card)`) em 25 lugares e não distinguem card de leitura, card tocável e card de destaque.

## Referências validadas

- Material 3, tokens de duração e easing: curtas 50–200ms (feedback), médias 250–400ms, longas 450–600ms; easing padrão `cubic-bezier(0.2,0,0,1)`. https://m3.material.io/styles/motion/easing-and-duration/tokens-specs
- Apple HIG, movimento: movimento com propósito; decorativo pode parar; com "Reduzir Movimento", o movimento significativo vira dissolução/realce. https://developer.apple.com/design/human-interface-guidelines/motion e https://developer.apple.com/help/app-store-connect/manage-app-accessibility/reduced-motion-evaluation-criteria/
- NN/g, cards: tudo que é card tem o mesmo tratamento; card inteiro tocável quando leva a algo; uma ação principal por card. https://www.nngroup.com/articles/cards-component/
- WCAG 2.3.3 (animação por interação) e 2.2.2 (pausar o que se move sem parar): movimento contínuo precisa parar sob a preferência do sistema.

## Design

### 1. Tokens de movimento por função (`main.css`)

Mantêm-se `--lagoa-dur-fast` (120ms, feedback de toque), `--lagoa-dur-base` (200ms, mudança de estado), `--lagoa-dur-stamp` (420ms) e `--lagoa-dur-rise` (520ms, entrada de bloco). Entram:

| Token | Valor | Função |
|---|---|---|
| `--lagoa-dur-enter` | 400ms | entrada de ícone/selo (era 480ms solto no `pop-tilt`) |
| `--lagoa-dur-exit` | 130ms | saída (≈ 1/3 da entrada; era 130ms solto no `CardStack`) |
| `--lagoa-stagger` | 50ms | passo da entrada escalonada (era 70ms) |
| `--lagoa-stagger-steps` | 6 | teto de passos: o 7º item e os seguintes entram junto do 6º |

`.rise` e `.pop-tilt` usam `calc(min(var(--i, 0), var(--lagoa-stagger-steps)) * var(--lagoa-stagger))`.

### 2. Movimento reduzido que ainda comunica

Sob `prefers-reduced-motion: reduce`: `.rise` e `.pop-tilt` viram uma dissolução curta (`opacity`, `--lagoa-dur-base`, sem deslocamento nem atraso); `.stamp-press` fica estático na inclinação final; os contínuos e decorativos (`live-dot`, `slow-pan`, `ticket-char`) param. Hoje todos só desligam.

### 3. Cards: três níveis, uma definição

Utilitários Tailwind em `main.css` (`@utility`):

| Classe | O quê | Uso |
|---|---|---|
| `card` | raio, fundo e sombra de repouso | todo card de leitura |
| `card-tap` | `card` + realce de sombra ao tocar e `active:scale-[0.98]` em `--lagoa-dur-fast` | card inteiro que é link (`ShopTile`, `RewardCoupon`, linha de Ranking) |
| `card-raised` | `card` com `--lagoa-shadow-raised` | card de destaque que sobe sobre a faixa (`HeroCard`, hero do Entrar) |

Entra `--lagoa-shadow-raised` (claro e escuro). As ~25 repetições da receita em `layers/ui` e `layers/customer` viram `card`/`card-tap`/`card-raised`. Fora: `QrViewfinder` (fundo próprio), logo circular do `ShopCard`, `CardStack`/skeleton com `rounded-b`, e o painel do lojista.

### 4. Garantias (testes)

- `motionTokens.test.ts`: todo `@keyframes` e toda `animation:` em `.vue` ou `.css` de `layers/ui` e `layers/customer` fica coberto por um bloco `prefers-reduced-motion` no mesmo arquivo; nenhuma duração literal em ms (`duration-[..ms]`, `transition: ... 130ms`) fora dos tokens; os tokens novos existem.
- `reducedMotion.test.ts` (existente) segue valendo; ganha o caso "dissolve em vez de sumir" (`rise` sob a media query define `rise-fade`).
- `cardSurface.test.ts`: `card`, `card-tap`, `card-raised` existem em `main.css`; nenhum arquivo de `layers/ui` ou `layers/customer` repete a receita `rounded-(--radius-card) bg-default shadow-(--lagoa-shadow-card)`.
- Teste de componente: `ShopTile`, `RewardCoupon` têm `card-tap`; `HeroCard` tem `card-raised`.

## Riscos

- `@utility` do Tailwind v4 compõe com variantes (`active:`); se a versão não aceitar `@apply` entre utilitários, as classes repetem as propriedades.
- Trocar 70ms por 50ms muda o ritmo de todas as listas: conferir Descobrir e Prêmios no navegador.
