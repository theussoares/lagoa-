import { CHECK_IN_CODE_LENGTH } from '#shared/constants/domain'
import { unitOf } from '#shared/domain/programStrategies'
import { MerchantIdSchema, ProgramIdSchema, ShopIdSchema } from '#shared/schemas/ids'
import type { ShopId } from '#shared/schemas/ids'
import { ClubSetupDraftSchema } from '#shared/schemas/onboarding'
import type { ClubSetupDraft } from '#shared/schemas/onboarding'
import type { MerchantSession, SignUpTicket } from '#shared/schemas/session'
import { CheckInCodeSchema } from '#shared/schemas/shop'
import type { CheckInCode, ShopPoster, ShopStatus } from '#shared/schemas/shop'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok } from '#shared/types/result'
import type { Result } from '#shared/types/result'
import { randomReadableCode } from './codes'
import type { MockContext } from './context'
import { findProgram, findShop } from './queries'
import type { ShopRecord } from '../state'

type CreateClubError = ErrorOf<'signUpExpired' | 'invalidClubSetup'>

function newCheckInCode(ctx: MockContext): CheckInCode {
  const taken = new Set(ctx.state.shops.map((shop) => shop.checkInCode))
  for (;;) {
    const code = CheckInCodeSchema.parse(randomReadableCode(ctx, CHECK_IN_CODE_LENGTH))
    if (!taken.has(code)) return code
  }
}

/**
 * Loja, clube e lojista nascem juntos, a partir do ticket do celular
 * confirmado. A loja entra `pending`: a rede aprova antes de valer no balcão.
 */
export function createClub(ctx: MockContext, ticket: SignUpTicket, draft: ClubSetupDraft): Result<MerchantSession, CreateClubError> {
  const record = ctx.state.signUpTickets.find((item) => item.ticket === ticket)
  if (record === undefined || new Date(record.expiresAt) <= ctx.now) return err({ code: 'signUpExpired' })
  // Outra aba já criou a loja com este celular: o ticket não vale mais.
  if (ctx.state.merchants.some((merchant) => merchant.phone === record.phone)) {
    ctx.state.signUpTickets = ctx.state.signUpTickets.filter((item) => item.ticket !== ticket)
    return err({ code: 'signUpExpired' })
  }
  const parsed = ClubSetupDraftSchema.safeParse(draft)
  if (!parsed.success) return err({ code: 'invalidClubSetup' })

  const shopId = ShopIdSchema.parse(ctx.ids.next('shop'))
  const shop: ShopRecord = { id: shopId, ...parsed.data.shop, status: 'pending', checkInCode: newCheckInCode(ctx), posterReprinted: true }
  const merchantId = MerchantIdSchema.parse(ctx.ids.next('merchant'))
  ctx.state.shops.push(shop)
  ctx.state.programs.push({ id: ProgramIdSchema.parse(ctx.ids.next('prog')), shopId, ...parsed.data.program })
  ctx.state.merchants.push({ id: merchantId, phone: record.phone, shopId })
  ctx.state.signUpTickets = ctx.state.signUpTickets.filter((item) => item.ticket !== ticket)
  return ok({ role: 'merchant', merchantId, shopId, shopName: shop.name, shopStatus: shop.status })
}

export function shopPoster(ctx: MockContext, shopId: ShopId): Result<ShopPoster, ErrorOf<'unauthorized' | 'notFound'>> {
  const shop = findShop(ctx, shopId)
  if (shop === undefined) return err({ code: 'unauthorized' })
  const program = findProgram(ctx, shopId)
  if (program === undefined) return err({ code: 'notFound', entity: 'program' })
  return ok({
    shopName: shop.name,
    status: shop.status,
    checkInCode: shop.checkInCode,
    rewardTitle: program.reward.title,
    unit: unitOf(program.rules),
    target: program.rules.target,
  })
}

export function shopStatus(ctx: MockContext, shopId: ShopId): Result<ShopStatus, ErrorOf<'unauthorized'>> {
  const shop = findShop(ctx, shopId)
  return shop === undefined ? err({ code: 'unauthorized' }) : ok(shop.status)
}

/** Ação do admin da rede. Até a tela do admin existir, só o atalho de teste do mock chama. */
export function approveShop(ctx: MockContext, shopId: ShopId): Result<ShopStatus, ErrorOf<'unauthorized'>> {
  const shop = findShop(ctx, shopId)
  if (shop === undefined) return err({ code: 'unauthorized' })
  if (shop.status === 'pending') shop.status = 'approved'
  return ok(shop.status)
}

/** Loja que ainda tem o cartaz antigo na parede: o Início avisa até imprimir o novo. */
export function posterReprintPending(ctx: MockContext, shopId: ShopId): Result<boolean, ErrorOf<'unauthorized'>> {
  const shop = findShop(ctx, shopId)
  return shop === undefined ? err({ code: 'unauthorized' }) : ok(!shop.posterReprinted)
}

export function markPosterReprinted(ctx: MockContext, shopId: ShopId): Result<boolean, ErrorOf<'unauthorized'>> {
  const shop = findShop(ctx, shopId)
  if (shop === undefined) return err({ code: 'unauthorized' })
  shop.posterReprinted = true
  return ok(false)
}
