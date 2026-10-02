export const REDEMPTION_CODE_LENGTH = 6
export const REDEMPTION_CODE_TTL_MINUTES = 10
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
/** Código impresso embaixo do QR da loja, para quem prefere digitar. */
export const CHECK_IN_CODE_LENGTH = 6
/** O QR da loja é um link `/check-in?loja=<código>`: a câmera do celular já abre o app no check-in. */
export const CHECK_IN_LINK_PARAM = 'loja'
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
export const LOGIN_CODE_RESEND_SECONDS = 30
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
