import type { CustomerFilter } from '#shared/schemas/customer'
import type { RedemptionId } from '#shared/schemas/ids'
import type { PhoneNumber } from '#shared/schemas/phone'
import type { ProgramDraft } from '#shared/schemas/program'
import type { RedemptionCode } from '#shared/schemas/redemption'
import { ok } from '#shared/types/result'
import { asMerchant } from '#layers/core/app/mock/withSession'
import type { MerchantServices } from '../MerchantServices'
import type { MockBackend } from '#layers/core/app/mock/MockBackend'
import { confirmRedemption, registerVisit, todayEntries, validateRedemption } from '#layers/core/app/mock/handlers/counter'
import { getProgram, merchantCustomers, updateProgram } from '#layers/core/app/mock/handlers/merchant'
import type { MerchantSessionProvider } from '#layers/core/app/services/SessionProvider'

export function createMockMerchantServices(backend: MockBackend, sessions: MerchantSessionProvider): MerchantServices {
  return {
    counter: {
      registerVisit: (phone: PhoneNumber) =>
        asMerchant(backend, sessions, (ctx, shopId) => registerVisit(ctx, shopId, phone, { kind: 'visit' })),
      registerAmount: (phone: PhoneNumber, amountCents: number) =>
        asMerchant(backend, sessions, (ctx, shopId) => registerVisit(ctx, shopId, phone, { kind: 'amount', amountCents })),
      validateRedemption: (code: RedemptionCode) =>
        asMerchant(backend, sessions, (ctx, shopId) => validateRedemption(ctx, shopId, code)),
      confirmRedemption: (id: RedemptionId) =>
        asMerchant(backend, sessions, (ctx, shopId) => confirmRedemption(ctx, shopId, id)),
      listTodayEntries: () => asMerchant(backend, sessions, (ctx, shopId) => ok(todayEntries(ctx, shopId))),
    },
    customers: {
      listCustomers: (filter: CustomerFilter) =>
        asMerchant(backend, sessions, (ctx, shopId) => ok(merchantCustomers(ctx, shopId, filter))),
    },
    program: {
      getProgram: () => asMerchant(backend, sessions, getProgram),
      updateProgram: (draft: ProgramDraft) =>
        asMerchant(backend, sessions, (ctx, shopId) => updateProgram(ctx, shopId, draft)),
    },
  }
}
