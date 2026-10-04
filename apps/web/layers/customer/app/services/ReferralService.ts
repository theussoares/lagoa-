import type { ReferralCapture, ReferralInvite } from '#shared/schemas/referral'
import type { TransportError } from '#shared/types/errors'
import type { Result } from '#shared/types/result'

export interface ReferralService {
  /** O servidor responde igual para qualquer convite (valendo ou não); só termos não aceitos e rede aparecem. */
  capture(invite: ReferralCapture): Promise<Result<void, TransportError>>
  getInvite(): Promise<Result<ReferralInvite, TransportError>>
}
