import { CAMPAIGN_HISTORY_LIMIT } from '#shared/constants/domain'
import { isBonusWithinLimits, reminderBonusLimits, reminderEligibility, summarizeReach } from '#shared/domain/campaign'
import type { ReminderEligibility } from '#shared/domain/campaign'
import { addUnits, isExpiredByInactivity } from '#shared/domain/loyaltyCard'
import { unitOf } from '#shared/domain/programStrategies'
import { ReminderDraftSchema } from '#shared/schemas/campaign'
import type { Campaign, CampaignOverview, ReminderDraft } from '#shared/schemas/campaign'
import type { IsoDateTime } from '#shared/schemas/common'
import { CampaignIdSchema } from '#shared/schemas/ids'
import type { CustomerId, ShopId } from '#shared/schemas/ids'
import type { LoyaltyCard } from '#shared/schemas/loyaltyCard'
import type { Program } from '#shared/schemas/program'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok } from '#shared/types/result'
import type { Result } from '#shared/types/result'
import { toIso } from '#shared/utils/time'
import type { MockContext } from './context'
import { appendLedger, holdRewardIfReady } from './earning'
import { findCustomer, findProgram, replaceCard } from './queries'
import { requireOperationalShop } from './shopAccess'
import type { ShopAccessError } from './shopAccess'
import type { CampaignRecord } from '../state'

interface ReminderCandidateCard {
  readonly card: LoyaltyCard
  readonly eligibility: ReminderEligibility
}

type SendReminderError = ErrorOf<'invalidCampaign' | 'noReachableCustomers' | 'reachChanged' | 'notFound' | 'unauthorized'>

/** Loja sem clube criado ainda: não é sessão inválida, e a tela não deve deslogar. */
const programMissing: ErrorOf<'notFound'> = { code: 'notFound', entity: 'program' }

function lastRemindedByCustomer(ctx: MockContext, shopId: ShopId): Map<CustomerId, IsoDateTime> {
  const latest = new Map<CustomerId, IsoDateTime>()
  for (const campaign of ctx.state.campaigns) {
    if (campaign.shopId !== shopId) continue
    for (const customerId of campaign.recipientIds) {
      const previous = latest.get(customerId)
      if (previous === undefined || campaign.sentAt > previous) latest.set(customerId, campaign.sentAt)
    }
  }
  return latest
}

/** O consentimento é lido do cadastro na hora, nunca de um valor guardado pela tela. */
function reminderCandidates(ctx: MockContext, program: Program): ReminderCandidateCard[] {
  const reminded = lastRemindedByCustomer(ctx, program.shopId)
  return ctx.state.cards
    .filter((card) => card.shopId === program.shopId)
    .flatMap((card) => {
      const customer = findCustomer(ctx, card.customerId)
      if (customer === undefined) return []
      const eligibility = reminderEligibility(
        {
          lastVisitAt: card.lastVisitAt,
          acceptsNotifications: customer.consent.notifications,
          lastRemindedAt: reminded.get(customer.id) ?? null,
          isExpired: isExpiredByInactivity(card, program.expirationPolicy, ctx.now),
        },
        ctx.now,
      )
      return [{ card, eligibility }]
    })
}

function toCampaign(record: CampaignRecord): Campaign {
  const { recipientIds: _recipients, ...campaign } = record
  return campaign
}

export function campaignOverview(ctx: MockContext, shopId: ShopId): Result<CampaignOverview, ErrorOf<'notFound'>> {
  const program = findProgram(ctx, shopId)
  if (program === undefined) return err(programMissing)
  const history = ctx.state.campaigns
    .filter((campaign) => campaign.shopId === shopId)
    .toSorted((a, b) => b.sentAt.localeCompare(a.sentAt))
    .slice(0, CAMPAIGN_HISTORY_LIMIT)
    .map(toCampaign)
  return ok({
    unit: unitOf(program.rules),
    bonusLimits: reminderBonusLimits(program.rules),
    reach: summarizeReach(reminderCandidates(ctx, program).map((candidate) => candidate.eligibility)),
    history,
  })
}

/** O presente entra no cartão e na caderneta do cliente, sem contar como visita: ele segue sumido até voltar. */
function giveBonus(ctx: MockContext, card: LoyaltyCard, units: number, sentAt: IsoDateTime): void {
  replaceCard(ctx, holdRewardIfReady(ctx, addUnits(card, units, 'campaignBonus', sentAt)))
  appendLedger(ctx, {
    shopId: card.shopId,
    customerId: card.customerId,
    kind: 'campaignBonus',
    unit: card.unit,
    units,
    amountCents: null,
    rewardTitle: null,
    isNewCustomer: false,
  })
}

/**
 * Lembrete para quem sumiu. `expectedRecipients` é o número que o lojista
 * confirmou: se o alcance mudou desde então, nada sai e a tela recarrega.
 */
export function sendReminder(
  ctx: MockContext,
  shopId: ShopId,
  draft: ReminderDraft,
  expectedRecipients: number,
): Result<Campaign, SendReminderError | ShopAccessError> {
  const shop = requireOperationalShop(ctx, shopId)
  if (!shop.ok) return shop
  const program = findProgram(ctx, shopId)
  if (program === undefined) return err(programMissing)
  const parsed = ReminderDraftSchema.safeParse(draft)
  if (!parsed.success || !isBonusWithinLimits(parsed.data.bonusUnits, reminderBonusLimits(program.rules))) {
    return err({ code: 'invalidCampaign' })
  }
  const recipients = reminderCandidates(ctx, program)
    .filter((candidate) => candidate.eligibility === 'reachable')
    .map((candidate) => candidate.card)
  if (recipients.length === 0) return err({ code: 'noReachableCustomers' })
  if (recipients.length !== expectedRecipients) return err({ code: 'reachChanged' })

  const sentAt = toIso(ctx.now)
  const { bonusUnits, message } = parsed.data
  if (bonusUnits > 0) recipients.forEach((card) => giveBonus(ctx, card, bonusUnits, sentAt))
  const record: CampaignRecord = {
    id: CampaignIdSchema.parse(ctx.ids.next('campaign')),
    shopId,
    kind: 'lapsedReminder',
    unit: unitOf(program.rules),
    bonusUnits,
    message,
    recipientsCount: recipients.length,
    sentAt,
    recipientIds: recipients.map((card) => card.customerId),
  }
  ctx.state.campaigns.push(record)
  return ok(toCampaign(record))
}
