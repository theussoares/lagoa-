import { z } from 'zod'
import { REFERRAL_CODE_LENGTH } from '../constants/domain'
import { readableCodeSchema } from './common'

/** Código opaco do indicador (vai no link do convite): nunca o id do cliente, que viraria dado rastreável. */
export const ReferralCodeSchema = readableCodeSchema(REFERRAL_CODE_LENGTH).brand<'ReferralCode'>()
export type ReferralCode = z.infer<typeof ReferralCodeSchema>

/** O que o app guarda do link `/convite?ref=<código>&loja=<código da loja>` até a primeira visita. */
export const ReferralCaptureSchema = z.object({
  referralCode: z.string().max(32),
  shopCode: z.string().max(32),
})
export type ReferralCapture = z.infer<typeof ReferralCaptureSchema>

export const ReferralInviteSchema = z.object({ referralCode: ReferralCodeSchema })
export type ReferralInvite = z.infer<typeof ReferralInviteSchema>
