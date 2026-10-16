import type { OtpChannel } from '#shared/schemas/session'

/** Guarda o canal escolhido por celular (só o hash). Uma escolha por celular: a mais recente vale. */
export abstract class OtpChannelStore {
  abstract save(phoneHash: Buffer, channel: OtpChannel, now: Date): Promise<void>
  /** Escolha feita depois de `notBefore`; `null` se não houver (ou já expirou). Erro de infra sobe como exceção. */
  abstract find(phoneHash: Buffer, notBefore: Date): Promise<OtpChannel | null>
}
