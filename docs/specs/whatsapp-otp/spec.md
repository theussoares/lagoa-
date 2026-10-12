# Login por WhatsApp — envio do código via Meta Cloud API

> Status: **implementado** · Escopo: **somente envio** · Código de login (OTP) via WhatsApp Cloud API (SMS/Comtele removidos).

## 1. Resumo

O código de login agora é entregue exclusivamente pelo WhatsApp (Meta Cloud API). O fluxo é:

```
Nuxt (BFF)  ──signInWithOtp──▶  Supabase Auth  (gera o código de 6 dígitos)
                                      │  Send SMS Hook (webhook assinado)
                                      ▼
            API Nest  POST /v1/auth/hooks/send-sms
              ├─ confere assinatura (Standard Webhooks)
              ├─ valida payload + normaliza celular
              ├─ OtpSendGate (limite: 3 envios / 60 min por celular)
              └─ WhatsAppOtpSender.send()  ──▶  Meta Cloud API (WhatsApp)
```

**O que NÃO muda:** o front (Nuxt), o BFF (`phoneLogin.ts` continua com `channel: 'sms'`),
o Supabase (ele continua gerando e conferindo o código), o hook assinado, o limite por celular.
Isso é possível porque o Supabase só "entrega" o código para o nosso hook; o canal real é escolha nossa.

> [!NOTE]
> O código **não está vazio**: a base (hook, `SmsSender`, gate, testes) já existe e é
> reaproveitada. Falta apenas um novo provedor e uns ajustes de contrato (seção 6).

## 2. Pré-requisitos na Meta (checklist — fora do código)

| # | Item | Observação |
|---|------|------------|
| 1 | Conta no **Meta Business Manager** verificada (*Business Verification*) | Sem verificação o limite de envio é muito baixo (250 conversas/24h). |
| 2 | **App** do tipo *Business* com o produto **WhatsApp** | Pega-se aqui o `App Secret` (só necessário se usarmos webhook de status). |
| 3 | **WhatsApp Business Account (WABA)** | Guardar o `WABA ID`. |
| 4 | **Número de telefone** adicionado e verificado (o chip que falta comprar) | Guardar o `Phone Number ID` (**não** é o número). |
| 5 | **Nome de exibição** aprovado e forma de pagamento cadastrada | Sem pagamento, os envios falham (erro `131042`). |
| 6 | **Template de autenticação** aprovado (seção 3) | Mensagem fora da janela de 24h só pode ser template. |
| 7 | **System User** com token **permanente** | Ver seção 4. Nunca usar o token temporário de 24 h do painel. |

Sobre o chip: precisa receber uma ligação/SMS de verificação uma vez; **não pode estar
registrado no app WhatsApp comum** (ou deve ser removido de lá antes). Depois de registrado na Cloud API,
o número fica dedicado à API. Durante o desenvolvimento, a Meta fornece um **número de teste**
(até 5 destinatários verificados) — dá para implementar e testar tudo antes do chip chegar.

## 3. Template de mensagem (categoria AUTHENTICATION)

Código de login **só** pode ser enviado como template da categoria *Authentication*,
com formato rígido definido pela Meta (sem links, mídia ou emoji; o texto do corpo é fixo).

Criação (Business Manager → *Message templates*, ou via API `POST /{WABA_ID}/message_templates`):

```json
{
  "name": "lagoa_login_code",
  "language": "pt_BR",
  "category": "AUTHENTICATION",
  "components": [
    { "type": "BODY", "add_security_recommendation": true },
    { "type": "FOOTER", "code_expiration_minutes": 5 },
    { "type": "BUTTONS", "buttons": [{ "type": "OTP", "otp_type": "COPY_CODE", "text": "Copiar código" }] }
  ]
}
```

- O corpo renderizado fica algo como: `*123456* é seu código de verificação. Por sua segurança, não o compartilhe.`
- `code_expiration_minutes` deve refletir a validade real do OTP configurada no Supabase
  (Auth → *Phone* → OTP expiry). Manter os dois alinhados.
- `COPY_CODE` funciona em qualquer celular. `ONE_TAP`/`ZERO_TAP` (autopreenchimento) só valem para
  app Android nativo — **não se aplica** ao nosso PWA/web.
- Aprovação costuma sair em minutos. Nome + idioma são a identidade do template: trocar o texto = criar novo template.
- Se o template for **reprovado/pausado**, todo login falha — monitorar (seção 10).

## 4. Autenticação com a Graph API

- Endpoint: `POST https://graph.facebook.com/{GRAPH_VERSION}/{PHONE_NUMBER_ID}/messages`
- Header: `Authorization: Bearer {ACCESS_TOKEN}` e `Content-Type: application/json`
- **Token permanente**: Business Settings → *System Users* → criar usuário (Admin) → atribuir o app e a WABA
  (controle total) → *Generate token* com as permissões `whatsapp_business_messaging` e
  `whatsapp_business_management` → expiração **Never**.
- O token é segredo de servidor: só vai em variável de ambiente da API. **Nunca** no front nem no BFF.
- `GRAPH_VERSION` (ex.: `v23.0`) é configurável; versões antigas são descontinuadas pela Meta. Revisar a cada ~6 meses.

## 5. Contrato da requisição de envio

```json
POST /v23.0/{PHONE_NUMBER_ID}/messages
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "5567991230374",
  "type": "template",
  "template": {
    "name": "lagoa_login_code",
    "language": { "code": "pt_BR" },
    "components": [
      { "type": "body", "parameters": [{ "type": "text", "text": "123456" }] },
      { "type": "button", "sub_type": "url", "index": "0", "parameters": [{ "type": "text", "text": "123456" }] }
    ]
  }
}
```

Pontos que costumam dar erro:

- O código vai **duas vezes**: no `body` e no `button` (`sub_type: "url"`, `index: "0"`) — exigência do botão de cópia.
  Se faltar o `button`, a Meta devolve erro de parâmetro (`132012`/`131008`).
- `to`: formato internacional **só dígitos**, sem `+`. Nosso `PhoneNumber` tem 11 dígitos nacionais, então `"55" + phone`
  (igual ao que `ComteleSmsSender` já faz). O código do OTP é `^\d{4,10}$`; template de autenticação aceita até 15 caracteres.
- `language.code` deve ser **exatamente** o do template aprovado (`pt_BR`).

**Resposta de sucesso (HTTP 200):**

```json
{
  "messaging_product": "whatsapp",
  "contacts": [{ "input": "5567991230374", "wa_id": "556791230374" }],
  "messages": [{ "id": "wamid.HBgM...", "message_status": "accepted" }]
}
```

Sucesso = HTTP 2xx **e** `messages[0].id` presente. Isso significa só "a Meta aceitou"; a entrega
real é informada depois por webhook (seção 9, opcional). O `wa_id` pode vir sem o 9º dígito
(números BR antigos) — é normal, não tratar como erro.

**Resposta de erro (HTTP 4xx/5xx):**

```json
{ "error": { "message": "...", "type": "OAuthException", "code": 131026, "error_data": { "details": "..." }, "fbtrace_id": "A..." } }
```

### Códigos de erro relevantes

| Código | Significado | Ação |
|--------|-------------|------|
| `131026` | Mensagem não entregável (número sem WhatsApp, versão antiga, etc.) | Falha para o usuário; considerar fallback SMS (seção 8) |
| `131030` | Destinatário fora da lista permitida (número de teste) | Só ocorre em dev; adicionar o número na lista |
| `131042` | Problema de pagamento da WABA | **Alerta crítico** — ninguém consegue logar |
| `131047` / `131049` | Janela de 24h / "ecosystem engagement" | Não deve ocorrer com template; logar |
| `131056` | Muitos envios para o mesmo par | Tratar como 429 para o usuário |
| `130429` / `80007` | Limite de taxa (throughput / WABA) | Falha temporária; alerta |
| `132000`–`132016` | Template inexistente, idioma errado, parâmetros diferentes | Erro de configuração; alerta |
| `190` / `102` | Token inválido/expirado | **Alerta crítico** |
| `100` | Parâmetro inválido | Bug de payload; alerta |
| `5xx` / timeout | Instabilidade da Meta | Falha para o usuário (ou fallback) |

## 6. O que o código precisa ter

Estrutura em `apps/api/src/auth/sms/` (o nome da pasta pode virar `otp/` depois; não é obrigatório agora).

### 6.1 Ajuste de contrato: de "mensagem" para "código"

`SmsSender.send(phone, message)` recebe o **texto pronto** (`Lagoa+: seu código é ...`).
Com WhatsApp-template **o texto é da Meta**; só enviamos o código. Por isso o contrato muda:

```ts
// apps/api/src/auth/sms/otp-sender.ts  (substitui/renomeia SmsSender)
export abstract class OtpSender {
  /** `true` só se o provedor aceitou o envio. Nunca loga celular nem código. */
  abstract send(phone: PhoneNumber, code: string): Promise<boolean>
}
```

- `ComteleSmsSender` passa a montar a frase internamente: `Lagoa+: seu código é ${code}. Não compartilhe com ninguém.`
  (a frase hoje está no controller — mover para lá, para o controller não conhecer canal nenhum).
- O controller passa a chamar `this.otp.send(phone.value, payload.data.sms.otp)`.
- Atualizar `send-sms-hook.http.test.ts` (`RecordingSmsSender` → recebe `code`) e `comtele-sms-sender.test.ts`.

### 6.2 `WhatsAppOtpSender` (novo)

Arquivo `whatsapp-otp-sender.ts`, `@Injectable()`, `extends OtpSender`. Segue o mesmo padrão do Comtele:

```ts
const SEND_TIMEOUT_MS = 4_000 // ver nota abaixo

async send(phone: PhoneNumber, code: string): Promise<boolean> {
  const { WHATSAPP_ACCESS_TOKEN: token, WHATSAPP_PHONE_NUMBER_ID: id } = this.env
  if (token === undefined || id === undefined) return false
  try {
    const response = await fetch(`https://graph.facebook.com/${this.env.WHATSAPP_GRAPH_VERSION}/${id}/messages`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ /* payload da seção 5 */ }),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    })
    if (!response.ok) { /* logar só error.code + fbtrace_id, ver 6.5 */ return false }
    const body: unknown = await response.json().catch(() => null)
    return hasMessageId(body) // messages[0].id é string não vazia (validar com zod)
  } catch { return false }
}
```

Regras:

- **Timeout:** o Supabase espera a resposta do hook em poucos segundos (limite de ~5 s para Send SMS Hook).
  A Comtele usa 8 s, que já estoura. Para WhatsApp usar **≤ 4 s** e **sem retry** automático dentro do hook
  (um retry dobraria o tempo e poderia mandar dois códigos). Se falhar, o usuário pede reenvio.
- **Nunca logar** celular, código ou o corpo da requisição (regra já seguida em `SmsSender`). Pode logar:
  `error.code`, `error.type`, `fbtrace_id`, HTTP status.
- Validar a resposta com zod (`messages: [{ id: string }]`) em vez de `as`.
- Sem `retry`/biblioteca extra: `fetch` nativo, como a Comtele.

### 6.3 Variáveis de ambiente (`apps/api/src/config/env.ts` e `.env.example`)

| Variável | Obrigatória em prod | Exemplo / nota |
|----------|--------------------|----------------|
| `OTP_CHANNEL` | não (default `sms`) | `sms` \| `whatsapp` \| `whatsapp_then_sms` — liga a troca sem deploy de código |
| `WHATSAPP_ACCESS_TOKEN` | sim, se canal usa WhatsApp | token do System User |
| `WHATSAPP_PHONE_NUMBER_ID` | idem | ID numérico do número |
| `WHATSAPP_TEMPLATE_NAME` | não (default `lagoa_login_code`) | |
| `WHATSAPP_TEMPLATE_LANGUAGE` | não (default `pt_BR`) | |
| `WHATSAPP_GRAPH_VERSION` | não (default `v23.0`) | formato `v\d+\.\d+` |
| `WHATSAPP_APP_SECRET` | só com webhook de status | para validar `X-Hub-Signature-256` |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | só com webhook de status | string aleatória nossa |

No `EnvSchema`, em `superRefine` (produção): exigir `WHATSAPP_ACCESS_TOKEN` e `WHATSAPP_PHONE_NUMBER_ID`
quando `OTP_CHANNEL !== 'sms'`, e `COMTELE_AUTH_KEY` quando `OTP_CHANNEL !== 'whatsapp'`
(hoje `COMTELE_AUTH_KEY` é incondicional — passa a ser condicional). Atualizar `env.test.ts`.

### 6.4 Seleção do canal (`sms.module.ts`)

Trocar o `useClass` fixo por um `useFactory` que olha `OTP_CHANNEL`:

```ts
{
  provide: OtpSender,
  inject: [ENV, ComteleSmsSender, WhatsAppOtpSender],
  useFactory: (env, sms, whatsapp) => {
    switch (env.OTP_CHANNEL) {
      case 'whatsapp': return whatsapp
      case 'whatsapp_then_sms': return new FallbackOtpSender(whatsapp, sms)
      default: return sms
    }
  },
}
```

`FallbackOtpSender` (pequeno decorator): tenta o primário; se devolver `false`, tenta o secundário.
Ver seção 8 sobre os limites desse fallback.

### 6.5 Observabilidade

- Usar o `Logger` do Nest (confirmar o padrão do projeto) com eventos como
  `otp.whatsapp.rejected { code, fbtraceId }`. **Sem PII.**
- Contagem por canal (`whatsapp` vs `sms` vs `fallback`) ajuda a medir o custo e a taxa de falha.

### 6.6 Limite de envio (`SmsSendGate`)

Continua valendo (3 por 60 min por celular) e protege **custo** (cada template de autenticação é cobrado)
e abuso. Não mexer. Opcional: renomear para `OtpSendGate`/`otp_sends` numa migração futura — não é necessário agora
(a tabela `sms_sends` guarda só hash do celular + horário, serve para qualquer canal).

## 7. Mudanças fora da API

| Onde | O quê |
|------|-------|
| Supabase Dashboard | Nada a mudar: o **Send SMS Hook** continua apontando para `/v1/auth/hooks/send-sms`. Revisar *OTP expiry* (alinhar com o template). |
| `apps/web` (BFF) | Nada a mudar no código (`channel: 'sms'` continua o certo para o Supabase). |
| Textos de UI (i18n) | `signIn.smsDelayHint` e afins dizem "SMS": trocar por "Enviamos o código para seu WhatsApp" (ou texto neutro "por mensagem") quando `OTP_CHANNEL` for WhatsApp. Se houver fallback, usar texto neutro. |
| Termos/Privacidade | Informar que o celular é compartilhado com a Meta/WhatsApp para entrega do código (LGPD). |
| `CLAUDE.md`, `docs/database-model.md` | Trocar menções a "SMS/Comtele" pelo canal real após a virada. |

## 8. Decisão tomada: SMS removido sem fallback

O SMS foi **completamente removido** da aplicação:
- `ComteleSmsSender` e suas variáveis de ambiente (`COMTELE_*`) foram excluídos.
- O canal de entrega é unicamente a WhatsApp Cloud API (`WhatsAppOtpSender`).
- O contrato de envio `OtpSender.send` retorna `'sent' | 'throttled' | 'failed'`, permitindo mapear limite da Meta (`131056`) diretamente para `429` (muitas requisições) sem passar por fallback.
- Se o usuário não possuir WhatsApp ou se houver indisponibilidade da Meta, a alternativa de recuperação é o login por e-mail.

## 9. Webhook de status (opcional — fase 2)

Não é necessário para enviar. Só vale a pena para: ver `delivered`/`failed`, descobrir template pausado e medir entrega.

- Rota `GET /v1/whatsapp/webhook` (handshake `hub.mode=subscribe`, `hub.verify_token`, devolve `hub.challenge`)
  e `POST /v1/whatsapp/webhook` (eventos).
- Validar **`X-Hub-Signature-256`** = `sha256=` + HMAC-SHA256 do **corpo bruto** com o `App Secret`
  (comparação em tempo constante). O app já usa `rawBody` para o hook do Supabase, então a infraestrutura existe.
- Assinar apenas o campo `messages` da WABA (é nele que vêm os `statuses`); **ignorar** mensagens recebidas — não processamos entrada.
- Eventos `statuses[].status`: `sent`, `delivered`, `read`, `failed` (com `errors[].code`). Só contar/logar; sem guardar texto nem celular em claro.
- Também assinar `message_template_status_update` para ser avisado de template pausado/reprovado.
- Resposta sempre HTTP 200 rápido; a Meta reenvia em caso de erro.

## 10. Segurança e privacidade

- Token e App Secret só em env de servidor; rotacionar se vazar (System User → revogar token).
- O hook continua protegido pela assinatura do Supabase — **não** abrir endpoint novo de envio sem autenticação.
- O código OTP só trafega Supabase → API → Meta → usuário; **nunca** em log.
- Celular enviado à Meta = tratamento por operador/terceiro: atualizar política de privacidade.
- Manter o gate de 3 envios/60 min (evita pumping de custo e spam).
- Meta faz *opt-in* implícito para templates de autenticação iniciados pelo usuário (ele mesmo pediu o código), então não precisa de consentimento separado de marketing.

## 11. Custos e limites da Meta

- Cobrança **por mensagem de template** (categoria *Authentication*, preço por país — conferir a tabela atual de preços da Meta para o Brasil).
  Em geral é bem mais barato que SMS nacional. Não há mais "conversas de 24 h": a cobrança é por mensagem entregue.
- **Messaging limits**: contas novas começam em 250 destinatários únicos/24 h; sobem para 1 k, 10 k, 100 k conforme volume e qualidade.
  Business Verification e boa qualidade (poucos bloqueios) aceleram. Isso é teto de **usuários únicos por dia** — importante no lançamento.
- Throughput padrão: 80 mensagens/s por número (sobra).
- Qualidade do número: muitos "bloqueios/denúncias" reduzem o limite — por isso o gate de reenvio importa.

## 12. Plano de implementação

| Fase | Entrega |
|------|---------|
| **0 — Meta** | Itens 1–7 da seção 2 (com número de teste enquanto o chip não chega). |
| **1 — Contrato** | `OtpSender(phone, code)`; mover a frase do SMS para `ComteleSmsSender`; ajustar controller e testes existentes (sem mudança de comportamento). |
| **2 — Provedor** | `WhatsAppOtpSender` + testes unitários (mock de `fetch`, mesmo estilo do `comtele-sms-sender.test.ts`). |
| **3 — Config** | Novas variáveis em `env.ts`/`.env.example`/`env.test.ts`; factory por `OTP_CHANNEL`; `FallbackOtpSender`. |
| **4 — Teste real** | Número de teste da Meta → `OTP_CHANNEL=whatsapp` em dev; fluxo completo pelo Nuxt. |
| **5 — Produção** | Chip real, número verificado, template aprovado, token permanente; `whatsapp_then_sms`; ajustar textos da UI e termos. |
| **6 — Opcional** | Webhook de status (seção 9) e alertas. |

## 13. Testes necessários

**`whatsapp-otp-sender.test.ts`** (unitário, `fetch` mockado):
- envia URL correta (`graph.facebook.com/{versão}/{phoneNumberId}/messages`), header `Bearer`, `to` = `55`+11 dígitos;
- payload tem `template.name`, `language.code`, código no `body` **e** no `button` `url`/`index "0"`;
- `true` com 200 + `messages[0].id`; `false` com 200 sem `messages`, com 400/401/500 e corpo de erro, com `fetch` rejeitado (timeout);
- `false` sem token/phone number id;
- erro **não vaza** celular/código (spy no logger).

**`fallback-otp-sender.test.ts`**: primário ok → secundário não chamado; primário falha → secundário chamado; ambos falham → `false`.

**`send-sms-hook.http.test.ts`** (já existe): ajustar para `code`; continuam valendo 401 sem assinatura, 429 do gate, 502 quando o provedor falha.

**`env.test.ts`**: produção exige as variáveis conforme `OTP_CHANNEL`; `OTP_CHANNEL` inválido falha; defaults aplicados.

**Manual (staging):** número de teste na lista permitida → pedir código no app → chegou no WhatsApp com botão "Copiar código" → login conclui. Testar também: número sem WhatsApp (fallback), 4 pedidos seguidos (gate), template com idioma errado (alerta de config).

## 14. Riscos e pontos de atenção

| Risco | Mitigação |
|-------|-----------|
| Template reprovado ou pausado ⇒ ninguém loga | Fallback SMS; webhook `message_template_status_update`; manter texto padrão da Meta |
| Token expirado/revogado | System User com token permanente; alerta em `190` |
| Pagamento da WABA suspenso (`131042`) | Alerta + fallback SMS |
| Usuário sem WhatsApp | Fallback SMS síncrono; UI com "reenviar" |
| Timeout do hook (≈5 s) | Timeout de 4 s, sem retry interno |
| Limite de 250 usuários únicos/24 h no início | Fazer Business Verification antes do lançamento |
| Falha silenciosa (aceito mas não entregue) | Webhook de status (fase 2) |
| Número BR com/sem 9º dígito | Enviar 55+11 dígitos; aceitar `wa_id` diferente na resposta |

## 15. Referências

- Cloud API — enviar mensagens: <https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages>
- Templates de autenticação: <https://developers.facebook.com/docs/whatsapp/business-management-api/authentication-templates>
- Códigos de erro: <https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes>
- Webhooks da Cloud API: <https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks>
- Supabase Send SMS Hook: <https://supabase.com/docs/guides/auth/auth-hooks/send-sms-hook>

> [!IMPORTANT]
> A Meta muda versões, preços e nomes de campos com frequência. Antes de implementar, conferir
> os detalhes marcados (versão da Graph API, formato do `button` do template, tabela de preços e limites)
> na documentação oficial acima.
