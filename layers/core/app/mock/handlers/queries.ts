import { CustomerIdSchema, LoyaltyCardIdSchema } from '#shared/schemas/ids'
import type { CustomerId, ShopId } from '#shared/schemas/ids'
import type { LoyaltyCard } from '#shared/schemas/loyaltyCard'
import type { MaskedPhone, PhoneNumber } from '#shared/schemas/phone'
import type { Program } from '#shared/schemas/program'
import type { ShopSummary } from '#shared/schemas/shop'
import { earnRateOf, unitOf } from '#shared/domain/programStrategies'
import { maskPhone } from '#shared/utils/phone'
import { toIso } from '#shared/utils/time'
import type { MockContext } from './context'
import type { CustomerRecord, ShopRecord } from '../state'

export function findShop(ctx: MockContext, shopId: ShopId): ShopRecord | undefined {
  return ctx.state.shops.find((shop) => shop.id === shopId)
}

export function findProgram(ctx: MockContext, shopId: ShopId): Program | undefined {
  return ctx.state.programs.find((program) => program.shopId === shopId)
}

export function findCustomer(ctx: MockContext, customerId: CustomerId): CustomerRecord | undefined {
  return ctx.state.customers.find((customer) => customer.id === customerId)
}

export function findCustomerByPhone(ctx: MockContext, phone: PhoneNumber): CustomerRecord | undefined {
  return ctx.state.customers.find((customer) => customer.phone === phone)
}

export function findCard(ctx: MockContext, customerId: CustomerId, shopId: ShopId): LoyaltyCard | undefined {
  return ctx.state.cards.find((card) => card.customerId === customerId && card.shopId === shopId)
}

export function replaceCard(ctx: MockContext, next: LoyaltyCard): void {
  const index = ctx.state.cards.findIndex((card) => card.id === next.id)
  if (index === -1) ctx.state.cards.push(next)
  else ctx.state.cards[index] = next
}

export function maskedPhoneOf(ctx: MockContext, customerId: CustomerId): MaskedPhone | undefined {
  const customer = findCustomer(ctx, customerId)
  return customer === undefined ? undefined : maskPhone(customer.phone)
}

export function toShopSummary(shop: ShopRecord, program: Program): ShopSummary {
  return {
    id: shop.id,
    name: shop.name,
    category: shop.category,
    neighborhood: shop.neighborhood,
    addressLine: shop.addressLine,
    program: {
      unit: unitOf(program.rules),
      target: program.rules.target,
      rewardTitle: program.reward.title,
      earnRate: earnRateOf(program.rules),
      welcomeUnits: program.bonusRules.welcomeBonus.enabled ? program.bonusRules.welcomeBonus.units : 0,
    },
  }
}

export function ensureCustomer(ctx: MockContext, phone: PhoneNumber): { customer: CustomerRecord; isNew: boolean } {
  const existing = findCustomerByPhone(ctx, phone)
  if (existing !== undefined) return { customer: existing, isNew: false }
  const customer: CustomerRecord = {
    id: CustomerIdSchema.parse(ctx.ids.next('cus')),
    phone,
    firstName: null,
    birthday: null,
    consent: { notifications: false, updatedAt: null },
    termsAcceptedAt: null,
    createdAt: toIso(ctx.now),
  }
  ctx.state.customers.push(customer)
  return { customer, isNew: true }
}

export function newCard(ctx: MockContext, customerId: CustomerId, program: Program): LoyaltyCard {
  return {
    id: LoyaltyCardIdSchema.parse(ctx.ids.next('card')),
    shopId: program.shopId,
    customerId,
    programId: program.id,
    unit: unitOf(program.rules),
    balance: 0,
    target: program.rules.target,
    rewardTitle: program.reward.title,
    stamps: [],
    lastVisitAt: null,
    rewardExpiresAt: null,
  }
}
