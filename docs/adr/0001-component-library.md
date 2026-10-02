# ADR-0001 — Lib de componentes: Nuxt UI v4

- **Status:** aceito
- **Data:** 2026-10-01
- **Decisores:** Matheus Soares (produto/front)
- **Escopo:** `layers/ui` e todas as superfícies (cliente, lojista, admin)

## Contexto

O front do Lagoa+ é Nuxt 4 (Vue 3, Pinia), com três superfícies: app do
cliente (PWA mobile, 390px), painel do lojista e admin (desktop, 1280px).
Precisamos de uma base de componentes acessível que:

1. seja nativa do Nuxt 4 e não brigue com SSR/hidratação;
2. aceite um design system próprio por tokens, sem herdar uma cara pronta;
3. entregue acessibilidade de verdade (foco, teclado, ARIA) para cumprir as
   regras do `CLAUDE.md` (alvo ≥ 44px, contraste 4.5:1, elementos reais);
4. cubra o painel desktop (sidebar, tabelas, formulários) e o mobile
   (drawer/bottom sheet, toast, input de código);
5. valide formulários com os schemas Zod que já vão morar em `shared/`.

O design de referência deixa de ser identidade visual (ver `PRODUCT.md`): o
mundo visual será definido no design system. Por isso a lib precisa ser
fortemente tematizável.

## Opções consideradas

| Opção | Prós | Contras |
| --- | --- | --- |
| **Nuxt UI v4** | Módulo oficial do Nuxt; Reka UI (primitivos acessíveis) + Tailwind CSS v4; tema por CSS variables e `app.config.ts`; `UForm` aceita Zod (Standard Schema); componentes de dashboard (sidebar, painel, tabela TanStack) e mobile (`UDrawer`, `UPinInput`, `UToast`); locale pt-BR; ícones Iconify; color mode integrado; MIT. | Visual padrão reconhecível se não for tematizado; acopla o styling ao Tailwind v4. |
| PrimeVue (styled/unstyled) | Catálogo enorme, tabelas fortes. | Cara de "admin" no modo styled; modo unstyled exige refazer todo o CSS; integração Nuxt menos direta. |
| shadcn-vue | Código copiado para o repo, controle total. | O time mantém cada componente (manutenção, a11y e upgrades por nossa conta); mais trabalho para um piloto. |
| Componentes próprios do zero | Identidade total. | Custo alto de acessibilidade e estados; reinventa primitivos que o Reka UI já resolve. |

## Decisão

Usar **Nuxt UI v4** como base de componentes em todas as superfícies.

Regras que acompanham a decisão:

1. **Nunca no estado padrão.** Cores, raios, tipografia, sombras e motion vêm
   dos tokens do design system (`layers/ui`), aplicados por CSS variables
   (`--ui-*`) e pelo `app.config.ts` (`ui.colors` e `ui.<component>.slots`/
   `variants`). Nenhuma página sobrescreve estilo de componente da lib com
   classe solta.
2. **`layers/ui` é dono do tema e dos componentes de domínio.** Ele expõe:
   - o tema da lib (tokens + overrides de variantes);
   - componentes de domínio que nenhuma lib tem: cartão de clube com
     progresso de carimbos, código de resgate, teclado numérico do Balcão,
     navegação inferior do app;
   - wrappers finos só quando a lib não cobre um requisito (ex.: alvo de toque
     de 44px em um tamanho específico). Wrapper não existe "por padrão".
3. **Componentes da lib são dumb por natureza** e podem ser usados direto nos
   componentes e páginas das layers de superfície; as regras de smart/dumb do
   `CLAUDE.md` continuam valendo para os nossos componentes.
4. **Formulários** usam `UForm` com o schema Zod de `shared/`; a mensagem de
   erro exibida vem do `pt-BR.json`.
5. **i18n:** `UApp` recebe o locale `pt_br` da lib; textos nossos continuam via
   `@nuxtjs/i18n`.
6. **Ícones:** um único set via Iconify (definido no design system), com
   `strokeWidth` consistente. Sem SVG desenhado à mão para ícone.
7. **Color mode:** claro e escuro desde o MVP, seguindo o sistema
   (`@nuxtjs/color-mode`, já integrado ao Nuxt UI).

## Consequências

- **Positivas:** acessibilidade de base resolvida pelo Reka UI; menos código
  próprio; `dev-ui` foca em tema e componentes de domínio; validação Zod ponta
  a ponta; troca de tema centralizada.
- **Negativas:** dependemos do ritmo de releases do Nuxt UI e do Tailwind v4;
  overrides profundos de um componente da lib custam mais que CSS próprio. Se
  um componente exigir override em mais da metade dos slots, ele vira
  componente de domínio em `layers/ui` construído sobre o primitivo do Reka UI.
- **Time:** o papel do `dev-ui` muda de "criar botões e inputs" para "tematizar
  a lib e construir os componentes de domínio" (atualizar `EQUIPE.md` e
  `.claude/agents/dev-ui.md`).

## Referências

- Nuxt UI: https://ui.nuxt.com
- Reka UI: https://reka-ui.com
- `PRODUCT.md` e o design system em `design-system/`
