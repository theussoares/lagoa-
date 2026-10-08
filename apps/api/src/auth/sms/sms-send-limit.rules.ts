import { SMS_SEND_WINDOW_MINUTES } from '#shared/constants/domain'

const MS_PER_MINUTE = 60_000

/** Só os envios depois deste instante contam para o limite do celular. */
export function smsWindowStart(now: Date): Date {
  return new Date(now.getTime() - SMS_SEND_WINDOW_MINUTES * MS_PER_MINUTE)
}
