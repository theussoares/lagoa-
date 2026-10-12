# Design interno do app do cliente — spec

Data: 2026-10-12 · Superfície: app do cliente (mobile 390px) · Status: aguardando revisão

## Objetivo

Levar o visual novo do Entrar (foto da cidade no topo, um card herói por tela,
cards de loja com foto, cantos maiores) para as telas de dentro do app do
cliente, e aproveitar a passada para corrigir hierarquia, estados e
acessibilidade. A identidade "Carimbo e Caderneta" não muda
([MASTER](../../../design-system/lagoa/MASTER.md)).

## Escopo

Dentro: Carteira, Descobrir, Prêmios, Resgate, Check-in (e Carimbo ganho),
Cartão da loja, Perfil, Ranking, Convite, layout `customer` e `AppTabBar`.

Fora: painel do lojista, admin, regras de negócio, API/BFF, textos de produto
(só chaves novas quando a tela exigir).

## Critérios de sucesso

1. Toda tela interna usa o mesmo vocabulário visual do Entrar: `ScreenHeader`
   com foto, um card herói, cards de loja com foto.
2. Toda tela tem os quatro estados desenhados: carregando (skeleton), vazio
   (com ação), erro (com retry) e sucesso.
3. Acessibilidade: alvos ≥ 44px, contraste 4.5:1 nos temas escuro e claro,
   foco visível, `prefers-reduced-motion` respeitado, nenhuma informação só
   por cor.
4. Sem hex solto, sem texto solto no template, sem regressão nos testes.
5. Verificado no navegador em 390px (e 375px) nos dois temas, por onda.

## Abordagem: auditoria primeiro, depois ondas

### Onda 0 — Auditoria (sem código de produto)

Cada tela é lida contra o MASTER, `design-system/lagoa/pages/customer.md` e o
checklist de UX (acessibilidade, toque, layout, tipografia/cor, animação,
formulários, navegação). Saída: `docs/superpowers/specs/…-customer-audit.md`
com achados priorizados (crítico / alto / médio), tela e onda de destino.
Capturas de tela atuais em 390px, escuro e claro, como linha de base.

### Onda 1 — Base compartilhada

Em `layers/ui` (sem domínio de superfície; recebe texto pronto por props):
`ScreenHeader` com variante de foto, `HeroCard`, `ShopCard` com foto,
estados `Empty`/`Problem`/`Skeleton` padronizados, tokens de raio/sombra/
espaçamento que faltarem. Testes de componente e, onde houver, story/página de
verificação.

### Onda 2 — Carteira e Descobrir

As duas telas mais vistas. Carteira: header com foto, `CardStack` como herói,
caderneta abaixo. Descobrir: vitrine com `ShopCard` com foto, desafios,
destaque Pro (`discoverFeatured`).

### Onda 3 — Prêmios, Resgate, Check-in

Fluxos de momento crítico (balcão, código com validade, câmera). Prioridade:
clareza do código, contagem, estados de erro/antifraude, feedback da batida.

### Onda 4 — Perfil, Cartão da loja, Ranking, Convite

Consentimentos legíveis, formulários com rótulo/erro/ajuda, aniversário
travado explicado, sair/excluir conta separados e com confirmação.

Cada onda é um PR revisável; dá para parar em qualquer uma.

## Arquitetura e regras de código

Segue o CLAUDE.md: página = rota + composição (`use<Tela>Screen`), componentes
dumb com props/emits, `layers/ui` sem i18n, textos no `pt-BR.json` com chave em
inglês, tipos em `types/`, Browser API só em composable dedicado. Dados de tela
do cliente continuam em `useAsyncQuery` (SSR). Nenhuma mudança de contrato
com a API.

## Testes e verificação

- Vitest/componente para cada peça nova em `layers/ui` e para mapeadores puros.
- `pnpm typecheck` e `pnpm test` verdes a cada onda.
- Verificação visual no navegador (390/375px, escuro/claro, reduced motion)
  antes de fechar cada onda, com capturas no PR.

## Riscos

- SSR e hidratação: estado "visto" da Carteira mora no aparelho; não mudar a
  ordem de montagem ao mexer no layout.
- Foto: só com função, peso controlado (`image-dimension`, lazy abaixo da
  dobra) para não piorar LCP/CLS.
- Escopo crescer: achados fora da lista da auditoria entram como nova onda,
  não como carona.
