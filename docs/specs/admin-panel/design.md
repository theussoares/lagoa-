# Painel de admin da rede — design

Estado em 2026-10-19. Saiu da mesma conversa do [Hits](../hits-showcase/design.md). Próximo passo no fluxo do time:
spec do PO e `solution-design.md` do Arquiteto; CTO aprova (é deploy novo e superfície de alto risco).

## Por quê

Hoje a rede aprova loja, suspende e troca plano **por script** (`shop_status_events.actor` é um apelido de
operador). Com o Hits chegam mais duas filas: **aprovar produto** e **lançar destaque pago**. O dono do produto quer
isso num painel visual, próprio da rede.

## Decisões do dono do produto (2026-10-19)

- **Projeto novo na Vercel, com domínio próprio** (DNS ajustado para ele).
- **Login por e-mail e senha, com captcha.**
- **Cada pessoa tem um perfil** (conta própria).
- **Todo mundo pode tudo** (um papel só).

## Decisões do desenho (minhas, revisáveis)

- **App próprio `apps/admin`** no monorepo (Nuxt, herda `apps/web/layers/ui` como `apps/site` já faz), SPA
  (`ssr: false`), deploy separado. Domínio proposto: `admin.lagoamais.com.br`.
- **BFF próprio** no `apps/admin/server`, no mesmo padrão do `apps/web` (cookie httpOnly host-only, handler explícito
  por rota, `Origin` conferido, headers de segurança/CSP). Cookie do admin nunca é o mesmo do app nem do Balcão.
- **Mesmo projeto do Supabase** do cliente e do lojista. **O captcha (Cloudflare Turnstile) é conferido no BFF
  do admin** (siteverify no servidor) antes de chamar o Supabase, e **não** ligado no Supabase Auth (lá ele vale
  para o projeto inteiro e alcançaria o SMS do cliente). Um JWT de admin é **recusado** nas rotas de cliente e
  lojista (guard confere `admin_users`), e vice-versa.
- **Auth: Supabase Auth com e-mail e senha** + Turnstile no login e no
  "esqueci a senha" + **TOTP obrigatório** (MFA do Supabase; minha recomendação de segurança: quem aprova loja e
  mexe em plano não fica só na senha).
- **Conta de admin é separada:** tabela `admin_users` (`id` = `auth.users.id`, `name`, `email`, `created_at`,
  `disabled_at`, `invited_by`). A API só aceita rota `admin/*` se o JWT for de um `admin_users` ativo **com AAL2**
  (MFA feito). Um e-mail de admin não vira cliente nem lojista e vice-versa.
- **Sem cadastro aberto:** admin entra por convite de outro admin (e-mail do Supabase com link). O primeiro admin
  nasce por script.
- **Desativar** admin em vez de apagar (os registros de auditoria apontam para ele). Desativado pode ser
  **reativado** por outro admin.
- **Perdeu o autenticador:** outro admin **reseta o MFA** (a API usa a chave `service_role` só nessa rota e na de
  convite/reativação), com evento de auditoria. Ninguém reseta o próprio.
- **O que o admin vê do lojista (decisão do dono, 2026-10-19):** **contato do dono completo** (celular e e-mail,
  para ligar na aprovação), só no detalhe da loja, nunca em lista, log ou URL. Números da loja só **agregados**
  (clientes, visitas no mês). **Dado de cliente nunca.**
- **Vagas de destaque:** criar destaque em período lotado é recusado; a tela de Destaques mostra a agenda de vagas
  livres (regra no [design do Hits](../hits-showcase/design.md)).
- **Fase A** do lançamento (vai antes do app do cliente).

## Telas

1. **Entrar** (e-mail, senha, captcha) → **código do autenticador** (e, no primeiro acesso, cadastrar o TOTP).
2. **Lojas:** fila de `pending` em primeiro; lista com busca por nome; detalhe com dados da loja, programa, plano,
   histórico (`shop_status_events`). Ações: aprovar, suspender (motivo obrigatório), reativar, trocar plano.
3. **Hits:** fila de produtos `pending` (foto grande, título, preço, botão efetivo com o link visível, loja). Ações:
   aprovar, recusar (motivo obrigatório, que o lojista vê). Aba de aprovados com "tirar do ar" (vira `rejected` com
   motivo).
4. **Destaques:** lista de `featured_placements` (vigentes, futuros, encerrados); criar (loja, superfície, item quando
   `hitsBanner`, período, nota); cancelar. Mostra quem está no carrossel por ser Pro.
5. **Equipe:** lista de admins, convidar, desativar.
6. **Minha conta:** nome, trocar senha, refazer TOTP.

Métricas agregadas da rede e cobrança automática ficam para depois (ver "Não metas").

## Metas, não metas, antimetas

- **Metas:** tudo que hoje é script de loja vira tela; filas de produto e destaque; trilha de quem fez o quê.
- **Não metas:** cobrança/gateway, métricas da rede, papéis diferentes, edição do conteúdo da loja pelo admin,
  impersonar lojista.
- **Antimetas:**
  - admin ver celular de cliente ou qualquer dado pessoal de cliente (só agregados, regra do `CLAUDE.md`);
  - rota `admin/*` passar sem MFA, ou com JWT de cliente/lojista;
  - login sem captcha ou sem limite por conta/IP (`@FailClosedThrottle()`);
  - ação sem registro de autor;
  - apagar histórico.

## API (`apps/api/src/admin/*`)

Módulo novo `admin` no mesmo app NestJS, no padrão do projeto. Guard `AdminGuard` (JWT válido + `admin_users` ativo +
`aal2`). Toda escrita que muda situação grava o evento na mesma transação, com `actor_admin_id`.

- `admin/shops`: listar, detalhar, aprovar, suspender, reativar, trocar plano. `shop_status_events` ganha
  `actor_admin_id` (o `actor` texto continua para o histórico dos scripts).
- `admin/hits`: fila, aprovar, recusar, tirar do ar.
- `admin/featured`: listar, criar, cancelar.
- `admin/team`: listar, convidar, desativar.

## Infra

- Projeto Vercel novo para `apps/admin`, domínio `admin.lagoamais.com.br` (DNS onde o domínio já está), envs:
  `NUXT_API_BASE_URL`, chaves públicas do Supabase, chave do Turnstile, `NUXT_ALLOWED_ORIGINS`.
- Turnstile configurado no Supabase Auth (é por projeto: o captcha passa a valer para **todo** login por senha do
  projeto, o que não afeta o SMS do cliente — confirmar no `solution-design`).
- `robots: noindex`, `frame-ancestors 'none'`.
- Criar projeto e mexer no DNS só com confirmação explícita do dono, depois do design aprovado.

## Glossário (entra no `CLAUDE.md`)

| Domínio (pt-BR) | Código (en) |
| --- | --- |
| Admin da rede (pessoa) | `adminUser` |
| Convite de admin | `adminInvite` |
| Equipe do admin | `adminTeam` |

## Deixado ao builder

- Layout das telas (desktop 1280px, design system do painel do lojista).
- Paginação e busca das listas.
- Texto dos e-mails de convite e redefinição de senha.
