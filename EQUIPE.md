# Equipe de Desenvolvimento IA — Lagoa+

Cada papel abaixo existe como subagent em [`.claude/agents/`](./.claude/agents/),
com o modelo fixado no frontmatter (`opus` / `sonnet`, que resolvem para a
versão mais recente de cada família). O contexto do produto, glossário e
regras de LGPD ficam no [`CLAUDE.md`](./CLAUDE.md) — todos os agentes leem.

## Fluxo de uma feature

```
pedido → Product Owner (spec.md)
       → Arquiteto (solution-design.md) → CTO aprova
       → Engenheiro quebra em subtarefas → Devs/QA em paralelo (worktrees)
       → Engenheiro integra → Code Reviewer → merge
```

---

## Claude Opus (Decisões de Alto Impacto)

Reservado para raciocínio estratégico, ambiguidade de regra de negócio e
revisão de risco. Não usar em tarefas mecânicas ou de execução direta.

- **Product Owner** (`product-owner`) Interpreta o pedido e valida se a
  solução cobre a regra do clube de fidelidade: modos de programa (carimbo,
  pontos por real, pontos por visita), regras bônus, antifraude, expiração,
  resgate com código de uso único, Descobrir e o ciclo do lojista (onboarding,
  aprovação Fundador, cobrança). Pensa nas três pontas — cliente, lojista e
  admin da rede. Produz: `docs/specs/<feature>/spec.md` com critérios de
  aceite mensuráveis e casos de borda.

- **Arquiteto de Software** (`arquiteto`) Decide em qual layer Nuxt 4 cada
  coisa mora (`layers/cliente`, `layers/lojista`, `layers/admin`, `layers/ui`,
  `layers/core`) e o que vai para `shared/` (tipos e schemas Zod comuns a front
  e servidor). Garante que composables não dupliquem lógica entre superfícies e
  que stores sigam `use<Dominio>Store`. Valida impacto em SSR/hidratação e
  define os contratos da camada de API mockável enquanto o backend não existe.
  Produz: `docs/specs/<feature>/solution-design.md` com mapa de arquivos e
  contratos entre layers.

- **CTO** (`cto`) Aprova a arquitetura global, mitiga riscos e lê o código
  antes de decidir. Valida o `solution-design.md` do Arquiteto. **Dono da
  decisão de backend:** conduz o ADR (`docs/adr/`) comparando opções contra os
  requisitos reais do Lagoa+ (auth por celular, consistência do Balcão,
  antifraude, LGPD, cobrança recorrente, custo de piloto).

- **Engenheiro de Software** (`engenheiro`) Quebra o escopo em subtarefas
  atômicas, distribui para os Devs com contexto completo (caminhos, interfaces
  esperadas, telas do design de referência), roda Devs em worktrees isolados,
  integra o resultado e gerencia escalações.

- **Code Reviewer Sênior** (`code-reviewer`) Revisão de risco em toda
  mudança: vazamento de estado entre layers, `useAsyncData`/`useFetch` mal
  usados no SSR (chaves, dados compartilhados entre requests), mutação de store
  fora de action, e **LGPD** (celular exposto em log, URL, payload de analytics
  ou tela do admin). Revisão aprofundada obrigatória em: autenticação/sessão,
  Balcão (lançar visita e validar resgate), resgate do cliente, consentimento e
  cobrança.

---

## Claude Sonnet (Execução Especializada — Paralela)

Subagents paralelos com contexto especializado. Cada um recebe só o contexto
da sua especialidade.

- **Dev Vue/Nuxt** (`dev-nuxt`, 1 a 3 em paralelo) Implementa páginas e
  componentes Vue 3 com `<script setup lang="ts">`, componentes burros sempre
  que possível, seguindo a estrutura `app/` do Nuxt 4 dentro de cada layer.
  Usa os tokens e componentes de `layers/ui`; não cria CSS inline nem cor
  solta. Cada Dev roda em worktree isolado.

- **Dev de Design System & Acessibilidade** (`dev-ui`) Dono de `layers/ui`:
  traduz o design de referência em tokens (tipografia Geologica, paleta,
  raios, sombras) e componentes base (botões, inputs, cartão com anel de
  carimbos, navegação inferior, sidebar do painel). Garante alvos ≥ 44px,
  contraste e foco visível.

- **Dev de Stores Pinia** (`dev-stores`) Estado global por domínio (sessão,
  carteira, balcão, programa, rede). Conhece as stores existentes para não
  duplicar; garante `storeToRefs()` nos consumidores e estado SSR-safe.

- **Dev de Tipos & Contratos** (`dev-tipos`) Mantém os tipos de domínio e os
  schemas Zod em `shared/` coesos, e a camada de API tipada + mocks em
  `layers/core`. É quem vai plugar o backend real quando o ADR sair.

- **QA / Test Engineer** (`qa`, 1 ou 2 em paralelo) Vitest +
  `@nuxt/test-utils` (ambiente `nuxt`/happy-dom) para composables, stores e
  componentes; Playwright para os fluxos críticos ponta a ponta (check-in,
  lançar visita, resgate). Testes junto de cada layer em `layers/*/test/`.

- **Revisor de UI** (`revisor-ui`) Revisa mudanças só de UI e composables
  simples: fidelidade ao design, tokens, acessibilidade, tipagem. Qualquer
  coisa que toque dado pessoal, sessão, Balcão, resgate ou cobrança sobe para
  o `code-reviewer`.

> **Fora por enquanto:** i18n (o MVP é só pt-BR) e tracking/analytics (ainda
> sem ferramenta escolhida). Quando entrarem, viram um agente cada.
> **Dev Backend** entra depois do ADR do CTO, com o perfil da stack escolhida.

---

## Regras de uso dos modelos

| Situação                                                                 | Modelo |
| ------------------------------------------------------------------------ | ------ |
| Ambiguidade de regra de negócio, decisão de arquitetura entre layers      | Opus   |
| Escolha de backend e qualquer ADR                                        | Opus   |
| Revisão de auth, Balcão, resgate, consentimento, cobrança, dados pessoais | Opus   |
| Implementação, testes, tipos, design system, stores                       | Sonnet |
| Code review de componentes de UI e composables simples                    | Sonnet |
