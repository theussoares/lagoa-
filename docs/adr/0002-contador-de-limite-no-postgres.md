# ADR-0002 — Contador de limite de uso compartilhado no Postgres

- **Status:** aceito
- **Data:** 2026-10-06
- **Escopo:** `apps/api` (`@nestjs/throttler`)

## Contexto

A API roda serverless (`build:vercel`). O `ThrottlerModule` guardava o contador em memória: cada instância tinha o seu,
então os limites não valiam de verdade. O caso crítico é `POST /v1/check-in/code` (5 tentativas a cada 10 min por conta,
60/min por IP): a segurança do código curto de 5 caracteres depende desse teto. Os demais (padrão 120/min, IP 600/min,
`shop-join`, check-in por token) sofriam do mesmo problema.

## Decisão

`PostgresThrottlerStorage` (`apps/api/src/throttling`) implementa o `ThrottlerStorage` sobre a tabela `rate_limits`
(migration `0016`), sem infraestrutura nova.

- **Atômico, uma ida ao banco por requisição:** `INSERT ... ON CONFLICT DO UPDATE` conta, reabre a janela vencida e marca o
  bloqueio (`blocked_until`) na mesma instrução; o `ON CONFLICT` trava a linha, então instâncias concorrentes não perdem
  contagem. O tempo é o `now()` do banco, não o relógio da instância. Janela fixa (a memória usava janela deslizante).
- **Chave sem dado pessoal:** a que o guard já monta é um sha256 de classe + rota + limite + `user.id` (ou IP). Nunca
  celular nem e-mail.
- **Tabela `UNLOGGED`** (sem WAL, escrita mais barata): o contador é descartável e as janelas são curtas. Depois de uma
  queda do Postgres ela volta vazia e os limites recomeçam, o que aceitamos. RLS ligado, sem policy (como as demais).
- **Limpeza oportunista:** ~2% das requisições também apagam em lote (200, `FOR UPDATE SKIP LOCKED`, índice em `expires_at`)
  as linhas vencidas e sem bloqueio. Sem cron e sem N+1; a falha da limpeza é ignorada.
- **Se o contador falhar** (erro ou mais de 1,5 s): rota com `@FailClosedThrottle()` recusa com 429 `rateLimited`
  (hoje só `POST /check-in/code`); as demais **deixam passar** e registram aviso. Limite é proteção de volume, e derrubar
  o app inteiro junto com o banco não protege nada. O limite de SMS por celular continua no `sms_sends` (ver 9d80976), fail-open.

## Consequências

- Custo: uma consulta extra por requisição limitada (duas por rota com `default` e `ip`; o guard roda os dois) e mais uma
  conexão ocupada por instante no pooler. O pool do Supabase em modo transação (`prepare: false`) comporta o padrão.
- Os testes HTTP seguem com o storage em memória; o de integração (`TestDatabase`) prova o contador compartilhado.
- Se a carga crescer a ponto de o contador pesar, a saída natural é trocar a implementação do storage por Redis/Upstash
  sem mexer em controllers (a interface é a do Throttler).
