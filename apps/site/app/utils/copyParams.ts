import { LAPSED_AFTER_DAYS, REDEMPTION_CODE_LENGTH, REDEMPTION_CODE_TTL_MINUTES, REWARD_HOLD_DAYS, VISIT_QR_TTL_MINUTES } from '#shared/constants/domain'

export const FOUNDER_SPOTS = 10

/** Números de domínio que aparecem na copy: vêm das constantes, nunca digitados no JSON. */
export const COPY_PARAMS = {
  minutes: VISIT_QR_TTL_MINUTES,
  redeemMinutes: REDEMPTION_CODE_TTL_MINUTES,
  redeemLength: REDEMPTION_CODE_LENGTH,
  lapsedDays: LAPSED_AFTER_DAYS,
  holdDays: REWARD_HOLD_DAYS,
  founderSpots: FOUNDER_SPOTS,
} as const
