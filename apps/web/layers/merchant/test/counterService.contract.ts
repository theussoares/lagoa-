import { describe, expect, it } from 'vitest'
import { PhoneNumberSchema } from '#shared/schemas/phone'
import { RedemptionCodeSchema } from '#shared/schemas/redemption'
import type { CounterService } from '../app/services/CounterService'

/**
 * Contrato do Balcão. Toda implementação (mock hoje, HTTP amanhã) roda estes
 * mesmos testes (Liskov). `setup` devolve um Balcão logado numa loja de
 * carimbos com boas-vindas de 2 e alvo 10.
 */
export function describeCounterServiceContract(
  name: string,
  setup: () => { counter: CounterService; signedOut: CounterService },
): void {
  describe(`CounterService contract: ${name}`, () => {
    const newPhone = PhoneNumberSchema.parse('67900000099')

    it('creates the card on the spot for a new customer, with welcome stamps', async () => {
      const { counter } = setup()
      const result = await counter.registerVisit(newPhone)
      if (!result.ok) throw new Error(result.error.code)
      expect(result.value.entry.isNewCustomer).toBe(true)
      expect(result.value.welcomeUnits).toBe(2)
      expect(result.value.unitsEarned).toBe(1)
      expect(result.value.card).toMatchObject({ balance: 3, target: 10, unit: 'stamp', rewardReady: false })
    })

    it('only ever exposes the masked phone', async () => {
      const { counter } = setup()
      const result = await counter.registerVisit(newPhone)
      if (!result.ok) throw new Error(result.error.code)
      expect(result.value.entry.maskedPhone).toBe('(67) 9••••-0099')
      expect(JSON.stringify(result.value)).not.toContain(newPhone)
      const today = await counter.listTodayEntries()
      expect(JSON.stringify(today)).not.toContain(newPhone)
    })

    it('adds one stamp on a returning visit and lists it first in today’s ledger', async () => {
      const { counter } = setup()
      await counter.registerVisit(newPhone)
      const second = await counter.registerVisit(newPhone)
      if (!second.ok) throw new Error(second.error.code)
      expect(second.value.entry.isNewCustomer).toBe(false)
      expect(second.value.card.balance).toBe(4)
      const today = await counter.listTodayEntries()
      expect(today.ok && today.value[0]?.id).toBe(second.value.entry.id)
    })

    it('refuses amounts on a stamps program', async () => {
      const { counter } = setup()
      expect(await counter.registerAmount(newPhone, 5000)).toEqual({ ok: false, error: { code: 'amountNotAccepted' } })
    })

    it('answers an unknown redemption code as invalid', async () => {
      const { counter } = setup()
      const code = RedemptionCodeSchema.parse('ZZZZZZ')
      expect(await counter.validateRedemption(code)).toEqual({ ok: false, error: { code: 'redemptionInvalid' } })
    })

    it('requires a merchant session', async () => {
      const { signedOut } = setup()
      expect(await signedOut.listTodayEntries()).toEqual({ ok: false, error: { code: 'unauthorized' } })
    })
  })
}
