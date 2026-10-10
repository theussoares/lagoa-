import { describe, expect, it } from 'vitest'
import { AMOUNT_MAX_CENTS, VISIT_QR_ACTIVE_MAX_PER_SHOP } from '#shared/constants/domain'
import type { VisitQrCredential } from '#shared/schemas/visitQr'
import type { Result } from '#shared/types/result'
import { visitQrLink } from '#shared/utils/checkInCode'
import type { VisitQrService } from '../app/services/VisitQrService'

export interface VisitQrContractHarness {
  /** Logado numa loja aprovada de carimbos (meta 10). */
  readonly visitQr: VisitQrService
  /** Logado numa loja aprovada de pontos por real. */
  readonly perReal: VisitQrService
  /** Logado em outra loja aprovada: não enxerga os QRs de `visitQr`. */
  readonly otherShop: VisitQrService
  readonly signedOut: VisitQrService
  /** Um cliente que já é da loja de `visitQr` tenta usar o QR (lado do cliente, fora deste serviço). */
  readonly claimAsCustomer: (credential: VisitQrCredential) => Promise<Result<unknown, { readonly code: string }>>
  /** O lojista de `visitQr` troca o programa da loja. */
  readonly changeProgram: () => Promise<void>
  /** A rede tira a loja de `visitQr` de operação. */
  readonly closeShop: (status: 'pending' | 'suspended') => Promise<void>
}

/**
 * Contrato do QR da visita no Balcão. Toda implementação (mock hoje, HTTP quando houver `merchant/*`) roda estes
 * mesmos testes (Liskov); `setup` entrega um mundo novo a cada teste.
 */
export function describeVisitQrServiceContract(name: string, setup: () => VisitQrContractHarness): void {
  describe(`VisitQrService contract: ${name}`, () => {
    it('CA-05 issues a stamp QR without amount: active, with token, code and a 5-minute life', async () => {
      const { visitQr } = setup()
      const result = await visitQr.issueVisitQr({})
      if (!result.ok) throw new Error(result.error.code)
      expect(result.value).toMatchObject({ status: 'active', earn: { kind: 'visit' }, claim: null, refusal: null })
      expect(result.value.token).toMatch(/^[A-Za-z0-9_-]{43}$/)
      expect(result.value.visitCode).toHaveLength(5)
      expect(Date.parse(result.value.expiresAt) - Date.parse(result.value.createdAt)).toBe(5 * 60_000)
    })

    it('CA-08 stops at the limit of live QRs and frees a slot when one is cancelled', async () => {
      const { visitQr } = setup()
      const issued = []
      for (let i = 0; i < VISIT_QR_ACTIVE_MAX_PER_SHOP; i += 1) {
        const result = await visitQr.issueVisitQr({})
        if (!result.ok) throw new Error(`${i}: ${result.error.code}`)
        issued.push(result.value)
      }
      expect(await visitQr.issueVisitQr({})).toEqual({ ok: false, error: { code: 'visitQrLimitReached' } })
      const first = issued[0]
      if (first === undefined) throw new Error('expected a QR')
      await visitQr.cancelVisitQr(first.id)
      expect(await visitQr.issueVisitQr({})).toMatchObject({ ok: true })
    })

    it('CA-25 puts the token in the link fragment, never in the query', async () => {
      const { visitQr } = setup()
      const result = await visitQr.issueVisitQr({})
      if (!result.ok) throw new Error(result.error.code)
      const link = visitQrLink('https://app.test', result.value.token)
      expect(link).toMatch(/^https?:\/\/[^?#]+\/check-in#visita=[A-Za-z0-9_-]{43}$/)
    })

    it('issues a points-per-real QR carrying the amount', async () => {
      const { perReal } = setup()
      const result = await perReal.issueVisitQr({ amountCents: 3200 })
      expect(result).toMatchObject({ ok: true, value: { earn: { kind: 'amount', amountCents: 3200 } } })
    })

    it('CA-06 refuses a points-per-real QR without amount, with zero, or above the ceiling', async () => {
      const { perReal } = setup()
      const invalid = { ok: false, error: { code: 'invalidAmount' } }
      expect(await perReal.issueVisitQr({})).toEqual(invalid)
      expect(await perReal.issueVisitQr({ amountCents: 0 })).toEqual(invalid)
      expect(await perReal.issueVisitQr({ amountCents: AMOUNT_MAX_CENTS + 1 })).toEqual(invalid)
    })

    it('CA-07 refuses an amount on a stamps program', async () => {
      const { visitQr } = setup()
      expect(await visitQr.issueVisitQr({ amountCents: 5000 })).toEqual({ ok: false, error: { code: 'amountNotAccepted' } })
    })

    it('CA-08 refuses to issue while the shop is pending or suspended', async () => {
      const first = setup()
      await first.closeShop('pending')
      expect(await first.visitQr.issueVisitQr({})).toEqual({ ok: false, error: { code: 'shopPendingApproval' } })
      const second = setup()
      await second.closeShop('suspended')
      expect(await second.visitQr.issueVisitQr({})).toEqual({ ok: false, error: { code: 'shopSuspended' } })
    })

    it('reads a QR back without the token', async () => {
      const { visitQr } = setup()
      const issued = await visitQr.issueVisitQr({})
      if (!issued.ok) throw new Error(issued.error.code)
      const read = await visitQr.getVisitQr(issued.value.id)
      if (!read.ok) throw new Error(read.error.code)
      expect(read.value.id).toBe(issued.value.id)
      expect(JSON.stringify(read.value)).not.toContain(issued.value.token)
    })

    it('answers a QR of another shop as not found, for reading and for cancelling', async () => {
      const { visitQr, otherShop } = setup()
      const issued = await visitQr.issueVisitQr({})
      if (!issued.ok) throw new Error(issued.error.code)
      expect(await otherShop.getVisitQr(issued.value.id)).toMatchObject({ ok: false, error: { code: 'notFound' } })
      expect(await otherShop.cancelVisitQr(issued.value.id)).toMatchObject({ ok: false, error: { code: 'notFound' } })
      const stillActive = await visitQr.getVisitQr(issued.value.id)
      expect(stillActive).toMatchObject({ ok: true, value: { status: 'active' } })
    })

    it('cancels an active QR, and cancelling again changes nothing', async () => {
      const { visitQr } = setup()
      const issued = await visitQr.issueVisitQr({})
      if (!issued.ok) throw new Error(issued.error.code)
      const first = await visitQr.cancelVisitQr(issued.value.id)
      expect(first).toMatchObject({ ok: true, value: { status: 'cancelled' } })
      expect(await visitQr.cancelVisitQr(issued.value.id)).toEqual(first)
    })

    it('CA-18 makes a cancelled QR useless to the customer', async () => {
      const { visitQr, claimAsCustomer } = setup()
      const issued = await visitQr.issueVisitQr({})
      if (!issued.ok) throw new Error(issued.error.code)
      await visitQr.cancelVisitQr(issued.value.id)
      expect(await claimAsCustomer({ kind: 'token', token: issued.value.token })).toEqual({ ok: false, error: { code: 'invalidVisitQr' } })
    })

    it('RN-10 keeps a used QR as used when the merchant cancels it afterwards', async () => {
      const { visitQr, claimAsCustomer } = setup()
      const issued = await visitQr.issueVisitQr({})
      if (!issued.ok) throw new Error(issued.error.code)
      expect((await claimAsCustomer({ kind: 'token', token: issued.value.token })).ok).toBe(true)
      expect(await visitQr.cancelVisitQr(issued.value.id)).toMatchObject({ ok: true, value: { status: 'claimed' } })
    })

    it('CA-16 makes a QR stale when the program changes after issuing it', async () => {
      const { visitQr, claimAsCustomer, changeProgram } = setup()
      const issued = await visitQr.issueVisitQr({})
      if (!issued.ok) throw new Error(issued.error.code)
      await changeProgram()
      expect(await claimAsCustomer({ kind: 'token', token: issued.value.token })).toEqual({ ok: false, error: { code: 'visitQrStale' } })
    })

    it('requires a merchant session', async () => {
      const { signedOut } = setup()
      expect(await signedOut.issueVisitQr({})).toEqual({ ok: false, error: { code: 'unauthorized' } })
    })
  })
}
