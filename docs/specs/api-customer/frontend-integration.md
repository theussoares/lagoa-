# Integração do front com a API do cliente

Checklist para trocar os mocks de `apps/web/layers/customer` por implementações `Http*Service` (o front
já isola isso atrás de interfaces; ver `CLAUDE.md`). Base: `/v1`, JSON, todas as rotas com
`Authorization: Bearer <access_token do Supabase>` (exceto `/health`). Contratos: `shared/schemas`.
Detalhe das rotas e dos erros: [`apps/api/README.md`](../../../apps/api/README.md).

## 1. Login: SMS primeiro, e-mail como alternativa

O `AuthService` do front já modela celular + código por SMS. O backend usa **Supabase Auth**; o código de SMS é gerado
pelo Supabase e entregue pela API (Send SMS Hook → Comtele, `POST /v1/auth/hooks/send-sms`).

1. `supabase.auth.signInWithOtp({ phone: '+55' + digits })` → o cliente recebe o SMS.
2. `supabase.auth.verifyOtp({ phone, token, type: 'sms' })` → sessão com `access_token` (o JWT leva o claim `phone`, já confirmado).
3. `GET /v1/customer/session`:
   - `200` → `CustomerSession`; se `isNewCustomer`, tela de termos e `POST /v1/customer/profile/terms`
     (a regra vem do servidor; ao mudar `TERMS_VERSION` o cliente volta para essa tela).
   - `404 notFound` (`entity: customer`) → primeiro acesso: `POST /v1/customer/registration` **sem corpo**. O celular vem do
     token (confirmado por SMS), então ninguém cadastra o número de outra pessoa. Devolve a mesma `CustomerSession`.
4. **Alternativa por e-mail** (quem não recebe SMS): `signInWithOtp({ email })` + `verifyOtp({ email, token, type: 'email' })`.
   No primeiro acesso o cadastro pede o celular e manda `{ phone }` (declarado, sem verificação).
5. Renovação de sessão e logout são do SDK do Supabase; `401 unauthorized` = sessão acabou.

Configuração (Supabase): Auth > Providers > Phone ligado, Auth > Hooks > Send SMS Hook apontando para a API, com o
segredo em `SEND_SMS_HOOK_SECRET`; `COMTELE_AUTH_KEY` e `COMTELE_SENDER` no env da API. Em dev use os *test OTPs* do Supabase.
O lojista (`signInMerchant`) segue outro caminho e é do Caio.

## 2. Mapa serviço → rota

| Interface do front | Rota | Observações |
|---|---|---|
| `ProfileService.getProfile` | `GET /customer/profile` | `maskedPhone` já vem mascarado. |
| `ProfileService.updateProfile` | `PUT /customer/profile` `{ firstName, birthday }` | `409 birthdayLocked { changeableAt }`. Tirar a data (`null`) vale sempre. |
| `ProfileService.setNotificationConsent` | `PUT /customer/profile/consent` `{ granted }` | |
| `ProfileService.acceptTerms` | `POST /customer/profile/terms` | Idempotente; o servidor grava a versão (`TERMS_VERSION`). |
| `DiscoverService.listShops` | `GET /discover/shops` | Só lojas aprovadas; `showcase.imageUrl` só se a loja tem logo. |
| `DiscoverService.listChallenges` | `GET /discover/challenges` | Sempre `[]` no MVP (desafios fora). |
| `WalletService.listCards` | `GET /wallet/cards` | Já ordenado por proximidade do prêmio; saldo e carimbos já com vencimento aplicado. |
| `WalletService.getCard` | `GET /wallet/cards/:shopId` | `404 notFound { entity: card }`. |
| `WalletService.listActivity(limit)` | `GET /wallet/activity?limit=` | `limit` de 1 a 50 (padrão 20). |
| `WalletService.listRewardHistory(limit)` | `GET /wallet/rewards?limit=` | Só resgates entregues. |
| `CheckInService.checkIn(code)` | `POST /check-in` `{ code }` | Ver "Check-in" abaixo. |
| `RewardRedemptionService.requestCode` | `POST /redemptions` `{ cardId }` | `200` (gera ou devolve o ativo); `409 rewardNotReady { remaining }`; `404 notFound`. |
| `RewardRedemptionService.getRedemption` | `GET /redemptions/:id` | Fazer polling enquanto a tela do código está aberta: `status` vira `redeemed` (lojista entregou) ou `expired`. |
| (novo) código de convite | `GET /referrals/me` | `{ referralCode }` para montar `/convite?ref=<código>&loja=<código da loja>`. |
| (novo) abrir um convite | `POST /referrals` `{ referralCode, shopCode }` | `204` sempre. Chamar depois do cadastro, com o `ref` e a `loja` guardados do link. Sem cadastro = `401`. |

## 3. Pontos que costumam dar errado

- **Check-in.** Gere um `Idempotency-Key` (16–64 caracteres `[A-Za-z0-9_-]`, ex.: UUID sem hífens) **por toque** e reenvie o
  **mesmo** se a resposta se perder: o servidor devolve o carimbo já gravado em vez de `checkInCooldown`. Toque novo =
  chave nova. O código vem do QR (`/check-in?loja=<código>`) ou digitado; o servidor normaliza (`nav-4k7` vale).
  Respostas: `404 invalidShopQr`, `403 checkInDisabled`, `429 checkInCooldown { availableAt }`.
- **429 tem dois sentidos.** `{ code: 'checkInCooldown', availableAt }` é regra de negócio; `{ code: 'rateLimited' }` é
  limite de requisições. Decida pelo `code`, nunca pelo status.
- **Caderneta (`activity`).** Mostra visita, valor, check-in e resgate. Bônus de boas-vindas e de indicação **não** são
  linha da caderneta: aparecem como carimbos do cartão (`stamps[].source`). Ampliar o `LedgerKind` do `shared` é a
  mudança certa quando o front tiver os textos.
- **Vencimento.** O saldo e os carimbos que a Carteira devolve já descontam o que venceu; não recalcule no front.
  `rewardExpiresAt` é até quando o prêmio pronto fica guardado.
- **Erros de validação** vêm como `400 { code: 'validation', issues: [{ path, code }] }` (sem o valor digitado).
  Códigos que o `pt-BR.json` ainda precisa ter: `phoneAlreadyUsed`, `emailAlreadyUsed` (já adicionados) e, para
  respostas HTTP genéricas, `rateLimited` e `internal`.
- **Termos são exigidos pelo servidor.** `POST /check-in`, `POST /redemptions` e `POST /referrals` devolvem
  `403 { code: 'termsNotAccepted' }` enquanto a versão atual não foi aceita: trate como "levar à tela de termos", não como erro genérico.
- **Celular** só aparece mascarado; o cadastro recebe o número digitado (`phoneDigits` aceita máscara e `+55`).
- **Ids** são UUID; a rota recusa o que não for (`400`).

## 4. Fora do escopo desta API (por enquanto)

Painel do lojista (Balcão, Programa, Clientes, Campanhas), planos e cobrança, admin da rede, verificação de celular
por SMS, upload de logo (o campo e o bucket existem). Aprovação de loja (`Shop.status`) é feita direto no banco.

## 5. Como validar a integração

1. Subir a API (`pnpm dev:api`) apontando para o projeto Supabase de dev e o app com `apiMode` http.
2. Login por e-mail → `GET /customer/session` → cadastro → termos.
3. Rodar o seed (`db:seed`, só em banco de dev) e percorrer: Descobrir → check-in pelo código `NAV4K7` (Barbearia
   Navalha) → Carteira → repetir o check-in (cooldown) → reenviar o mesmo `Idempotency-Key` (mesmo carimbo).
4. O CI da API já prova as regras contra Postgres; o que falta ao front é provar o **contrato** (os schemas do
   `shared` validam a resposta no repository do front, como manda o `CLAUDE.md`).
