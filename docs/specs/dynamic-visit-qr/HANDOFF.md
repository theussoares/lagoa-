# QR da visita — handoff

Estado em 2026-10-06 (atualizado após P-15, teste de SSR e correção de comentário). Spec: [spec.md](./spec.md). Desenho: [solution-design.md](./solution-design.md)
(seção R = ajustes do CTO).

## Decisão de produto

- QR fixo da loja (`?loja=`) **só entra no clube** (`POST /v1/shop-join`, cartão zerado, não rende).
- Ganhar (carimbo/ponto) é **só** pelo QR da visita que o lojista gera na venda: uso único, 5 min, valor preso
  no modo pontos por real. Cliente escaneia (`POST /v1/check-in` com token) ou digita o código curto de 5
  caracteres (`POST /v1/check-in/code`).
- Token no **fragmento** (`/check-in#visita=<token>`), nunca em query (não chega ao servidor, `Referer` nem `?para=`).
- Balcão não recebe mais celular. Antifraude (janela por cliente/loja) continua e a recusa não consome o QR.
- Boas-vindas caem na 1ª visita pelo QR da visita, não ao entrar no clube.

## O que está feito

- **shared/:** `domain/visitQr.ts`, `schemas/visitQr.ts`, constantes e erros novos.
- **API:** tabela `visit_qrs` (migrations 0014/0015), módulo `customer/shop-join`, `claimVisitQr` em
  `customer/check-in` (via `LedgerStore`), apagar conta zera `claimed_by`, script `visit-qr:dev`
  (`ALLOW_DEV_VISIT_QR=1`).
- **Contador de rate limit compartilhado:** Postgres, migration 0016, [ADR-0002](../../adr/0002-contador-de-limite-no-postgres.md).
  `check-in/code` falha fechado; as demais rotas falham abertas.
- **BFF:** `shop-join.post.ts`, `check-in.post.ts`, `check-in/code.post.ts` (+ `server/utils/checkInCalls.ts`).
- **Cliente:** tela de check-in (`#visita=`, entrar no clube, código curto), login preserva só `#visita=`
  válido, carteira com dica de 1ª visita.
- **Lojista (só mock do navegador):** `VisitQrService`, painel do QR no Balcão (gerar, mostrar, imprimir,
  código curto, consulta a cada 3 s, cancelar). `registerVisit`/`registerAmount` removidos.
- Revisão do `code-reviewer` feita; achados importantes corrigidos.

## Verificações no momento do commit

`pnpm typecheck` e `pnpm test` (868) ok; `pnpm typecheck:api` ok; `pnpm test:api` 317 passam, **122 de
integração ignorados (sem Postgres)**.

## Pendências

1. **Rodar os testes de integração** com `TEST_DATABASE_URL` (Postgres): corrida do CA-13, `EXPLAIN` dos
   índices, replay, apagar conta, RLS de `visit_qrs`/`rate_limits`, contador compartilhado. O SQL da `0016`
   (tabela `UNLOGGED`, editada à mão) nunca foi executado. **Bloqueado em 2026-10-06:** sem Postgres local nem
   Docker; o único banco configurado é o Supabase real, e os testes escrevem e apagam dados nele.
2. **Termo de uso (P-17):** revisar se cobre o vínculo com a loja sem compra; se não, subir `TERMS_VERSION`.
   O texto não está no repositório; decisão jurídica do dono.
3. **API do lojista (`merchant/*`) não existe:** o Balcão emite QR só no mock. Sem ela o piloto não vai ao ar.
   Ponto de encaixe: seção 7.6 do solution-design; o contrato `visitQrService.contract.ts` serve para a futura
   `HttpVisitQrService`. Limite de QRs ativos por loja (P-05) entra junto. **Bloqueado:** não existe auth de lojista nem vínculo
   lojista↔loja na API; precisa de spec (`product-owner`) e solution-design (`arquiteto`) antes de código.
4. ~~P-15~~ feito: aviso no Início (`PosterReprintNotice`), imprime o cartaz ali mesmo; mock com `posterReprinted`. Sem teste do composable e sem verificação no navegador.
5. **BFF `/check-in`** ainda aceita o corpo legado `{ code }` (a API responde `shopQrJoinOnly`); decidir se
   restringe só a token.
6. **Não verificado no navegador:** Balcão, tela de check-in, impressão do QR. Falta e2e (Playwright) provando
   que o navegador reaplica o `#visita=` no redirect do login.
7. ~~`DomainEntity` sem `'visitQr'`~~ feito: o mock já responde `entity: 'visitQr'`.
8. ~~Teste de "nada é enviado no SSR"~~ feito (`checkInLinkSsr.nuxt.test.ts`).
9. Telas novas (painel do QR, estado "entrou no clube") foram feitas sem design dedicado; passar pelo
   `design-system/lagoa/MASTER.md`.
10. Riscos aceitos: janela fixa no contador (pico até 2× na virada); respostas distintas no código curto
    revelam que um código existiu; latência de 1 query extra por requisição limitada.
11. O link de referência do design (artefato claude.ai) não foi consultado.
