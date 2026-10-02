export const REDEMPTION_CODE_LENGTH = 6
export const REDEMPTION_CODE_TTL_MINUTES = 10
/** Sem 0/O e 1/I: o código é lido em voz alta no balcão. */
export const REDEMPTION_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const REWARD_HOLD_DAYS = 30
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
