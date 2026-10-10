import { describe, expect, it } from 'vitest'
import { RedemptionCodeSchema } from '#shared/schemas/redemption'
import type { CounterService } from '../app/services/CounterService'

/**
 * Contrato do Balcão. Toda implementação (mock hoje, HTTP amanhã) roda estes
 * mesmos testes (Liskov). `setup` devolve um Balcão logado numa loja de
 * carimbos; `earnVisit` faz um cliente ganhar uma visita nela (QR da visita) e devolve o celular mascarado dele.
 */
export function describeCounterServiceContract(
  name: string,
  setup: () => { counter: CounterService; signedOut: CounterService; earnVisit: () => Promise<string> },
): void {
  describe(`CounterService contract: ${name}`, () => {
    it('lists the visits earned today first, with the masked phone only', async () => {
      const { counter, earnVisit } = setup()
      const before = await counter.listTodayEntries()
      if (!before.ok) throw new Error(before.error.code)
      const maskedPhone = await earnVisit()
      const today = await counter.listTodayEntries()
      if (!today.ok) throw new Error(today.error.code)
      expect(today.value.truncated).toBe(false)
      expect(today.value.entries).toHaveLength(before.value.entries.length + 1)
      expect(today.value.entries[0]?.maskedPhone).toBe(maskedPhone)
      expect(JSON.stringify(today.value.entries)).not.toMatch(/\d{10,}/)
    })

    it('answers an unknown redemption code as invalid', async () => {
      const { counter } = setup()
      const code = RedemptionCodeSchema.parse('XXXXXX')
      expect(await counter.validateRedemption(code)).toEqual({ ok: false, error: { code: 'redemptionInvalid' } })
    })

    it('requires a merchant session', async () => {
      const { signedOut } = setup()
      expect(await signedOut.listTodayEntries()).toEqual({ ok: false, error: { code: 'unauthorized' } })
    })
  })
}
