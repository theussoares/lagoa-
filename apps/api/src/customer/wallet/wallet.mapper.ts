import { unitOf } from '#shared/domain/programStrategies'
import { type WalletCard, WalletCardSchema } from '#shared/schemas/loyaltyCard'
import { type WalletActivity, WalletActivitySchema } from '#shared/schemas/visit'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'
import { toIso } from '#shared/utils/time'
import { toShopSummary } from '../../shops/shop-summary.mapper'
import { deriveStamps } from './stamps'
import type { ActivityRecord, WalletCardRecord } from './wallet.repository'

type InvalidContract = ErrorOf<'invalidProgram'>

const isoOrNull = (date: Date | null): string | null => (date === null ? null : toIso(date))

export function toWalletCard(record: WalletCardRecord, supabaseUrl: string): Result<WalletCard, InvalidContract> {
  const { rules, rewardTitle } = record.shop.program
  const shop = toShopSummary(record.shop, supabaseUrl)
  if (!shop.ok) return err(shop.error)
  const unit = unitOf(rules)
  const parsed = WalletCardSchema.safeParse({
    id: record.cardId,
    shopId: record.shop.id,
    programId: record.programId,
    unit,
    balance: record.balance,
    target: rules.target,
    rewardTitle,
    stamps: unit === 'stamp' ? deriveStamps(record.earned, record.balance) : [],
    lastVisitAt: isoOrNull(record.lastVisitAt),
    rewardExpiresAt: isoOrNull(record.rewardExpiresAt),
    shop: shop.value,
  })
  return parsed.success ? ok(parsed.data) : err({ code: 'invalidProgram' })
}

/** `units` é o que o cliente ganhou (0 no resgate, onde o ledger guarda o débito). */
export function toWalletActivity(record: ActivityRecord): Result<WalletActivity, InvalidContract> {
  const parsed = WalletActivitySchema.safeParse({
    id: record.id,
    shopId: record.shopId,
    shopName: record.shopName,
    kind: record.kind,
    unit: record.unit,
    units: Math.max(record.unitsDelta, 0),
    rewardTitle: record.rewardTitle,
    createdAt: toIso(record.occurredAt),
  })
  return parsed.success ? ok(parsed.data) : err({ code: 'invalidProgram' })
}
