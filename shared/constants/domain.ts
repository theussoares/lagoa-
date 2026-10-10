export const REDEMPTION_CODE_LENGTH = 6
export const REDEMPTION_CODE_TTL_MINUTES = 10
/** O Balcão só explica "já usado" / "vencido" para um código com até essa idade; mais velho vira `redemptionInvalid` (o código é reaproveitado). */
export const REDEMPTION_LOOKUP_WINDOW_HOURS = 24
/**
 * O código é lido em voz alta no balcão e copiado de cartaz: fica de fora quem tem sósia
 * (0/O, 1/I, 8/B, 5/S, 2/Z, U/V).
 */
export const READABLE_CODE_ALPHABET = 'ACDEFGHJKLMNPQRTVWXY23456789'
export const REWARD_HOLD_DAYS = 30
/**
 * Aniversário dobra o carimbo: trocar a data à vontade viraria dobro todo dia.
 * Depois de salvo, só troca de novo após este prazo (tirar a data vale a qualquer hora).
 */
export const BIRTHDAY_CHANGE_COOLDOWN_DAYS = 365
/** Cidade do piloto: completa o endereço da loja na busca do mapa. */
export const PILOT_CITY = 'Três Lagoas, MS'
export const LAPSED_AFTER_DAYS = 30
/** Código impresso embaixo do QR da loja (entrar no clube), para quem prefere digitar. */
export const CHECK_IN_CODE_LENGTH = 6
/** Folga para espaços e hífens de quem digita o código impresso embaixo do QR. */
export const CHECK_IN_CODE_INPUT_MAX_LENGTH = 32
/** O QR da loja é um link `/check-in?loja=<código>`: a câmera do celular já abre o app para entrar no clube. */
export const CHECK_IN_LINK_PARAM = 'loja'
/** QR da visita: uso único, gerado na hora da venda. */
export const VISIT_QR_TTL_MINUTES = 5
/** QRs da visita ativos ao mesmo tempo numa loja: sem teto, um lojista (ou um bug) enche o índice parcial e o código curto. */
export const VISIT_QR_ACTIVE_MAX_PER_SHOP = 20
/** O Balcão consulta o QR da visita nesse intervalo enquanto ele está ativo (aguardando o cliente). */
export const VISIT_QR_STATUS_POLL_MS = 3000
/**
 * O QR da visita é um link `/check-in#visita=<token>`: a câmera do celular já abre o app no ganho. Fragmento, nunca
 * query: o token não chega ao servidor no GET da página nem entra em log de acesso (P-19).
 */
export const VISIT_QR_LINK_PARAM = 'visita'
/** 32 bytes (256 bits) em base64url, sem padding: 43 caracteres. */
export const VISIT_TOKEN_BYTES = 32
export const VISIT_TOKEN_LENGTH = 43
/** Folga antes do parse (o servidor responde `invalidVisitQr` ao que não tiver o formato). */
export const VISIT_TOKEN_INPUT_MAX_LENGTH = 64
/** Código curto da visita, digitado. Diferente de CHECK_IN_CODE_LENGTH para o app saber qual dos dois é. P-03. */
export const VISIT_CODE_LENGTH = 5
/** Tentativas de código curto por conta (rota própria): 28⁵ combinações só ficam fora de alcance com teto baixo. */
export const VISIT_CODE_ATTEMPTS_LIMIT = 5
export const VISIT_CODE_ATTEMPTS_WINDOW_MINUTES = 10
export const VISIT_CODE_INPUT_MAX_LENGTH = 32
/** Teto da vitrine do Descobrir: o piloto é uma cidade; lista sempre limitada. */
export const DISCOVER_SHOPS_LIMIT = 200
/** Versão dos termos de uso/LGPD que o app mostra; vai para o aceite (auditoria). Muda quando o texto muda. */
export const TERMS_VERSION = '2026-10'
/** A carteira de uma pessoa cabe em dezenas de cartões; a lista é limitada de qualquer jeito. */
export const WALLET_CARDS_LIMIT = 100
export const WALLET_ACTIVITY_DEFAULT_LIMIT = 20
export const WALLET_ACTIVITY_MAX_LIMIT = 50
/** Código do convite de indicação do cliente, no link `/convite?ref=`. */
export const REFERRAL_CODE_LENGTH = 8
/** Ranking da cidade: quantos aparecem na lista e o tamanho do apelido (nunca nome completo nem celular). */
export const RANKING_TOP_SIZE = 10
export const RANKING_NAME_MIN_LENGTH = 2
export const RANKING_NAME_MAX_LENGTH = 20
/** Teto de linhas por lista na exportação de dados do cliente. */
export const DATA_EXPORT_LIST_LIMIT = 5000
/** Indicações pagas por indicador em cada loja: quem fabrica contas para si não acumula carimbo sem fim. */
export const REFERRAL_REWARDS_MAX_PER_SHOP = 10
export const PHONE_INPUT_MAX_LENGTH = 32
export const CUSTOMER_FIRST_NAME_MAX_LENGTH = 40
/** Limite do endereço de e-mail (RFC 5321). */
export const EMAIL_MAX_LENGTH = 254
export const LOGIN_CODE_LENGTH = 6
export const LOGIN_CODE_TTL_MINUTES = 5
export const FOUNDER_PLAN_PRICE_CENTS = 7900

export const PROGRAM_TARGET_MIN = 3
export const PROGRAM_TARGET_MAX = 1000
/** Acima disso o cartão de carimbos não cabe na tela; vira programa de pontos. */
export const STAMPS_TARGET_MAX = 20
export const POINTS_RATE_MAX = 100
export const BONUS_UNITS_MAX = 10
export const CHECK_IN_COOLDOWN_MAX_HOURS = 168
export const EXPIRATION_MAX_MONTHS = 24
export const REWARD_TITLE_MAX_LENGTH = 60
export const AMOUNT_MAX_CENTS = 10_000_00
/** Espera antes de liberar "Reenviar código" no login. */
export const LOGIN_CODE_RESEND_SECONDS = 60
/** Teto de SMS de login por celular na janela: cada envio custa, e número sem entrega vira fila de códigos. */
export const SMS_SENDS_MAX_PER_WINDOW = 3
export const SMS_SEND_WINDOW_MINUTES = 60
/** Ticket médio de referência para estimar quanto uma visita rende em pontos por real. */
export const REFERENCE_TICKET_REAIS = 20
export const REMINDER_MESSAGE_MAX_LENGTH = 140
export const REMINDER_BONUS_MIN_UNITS = 0
/** Presente sugerido no lembrete, em visitas: 1 carimbo, ou os pontos de uma visita. */
export const REMINDER_BONUS_SUGGESTED_VISITS = 1
export const CAMPAIGN_HISTORY_LIMIT = 10
/** Janela da caderneta do Início: hoje e os 6 dias anteriores, no fuso do piloto. */
export const WEEK_SUMMARY_DAYS = 7
export const HOME_LAPSED_PREVIEW_LIMIT = 5
export const SHOP_NAME_MAX_LENGTH = 60
export const SHOP_NEIGHBORHOOD_MAX_LENGTH = 40
export const SHOP_ADDRESS_MAX_LENGTH = 100
/** Tempo para terminar o "Criar o clube" depois de confirmar o celular. */
export const SIGN_UP_TICKET_TTL_MINUTES = 60
