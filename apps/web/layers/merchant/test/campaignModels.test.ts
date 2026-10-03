import { describe, expect, it } from 'vitest'
import { CampaignSchema } from '#shared/schemas/campaign'
import type { Translate } from '#layers/core/app/types/i18n'
import { toCampaignHistoryRow, toReachModel, toReminderPreview } from '../app/utils/campaignModels'
import { initialReminderDraft, reminderFieldErrors, withSuggestedBonus } from '../app/utils/reminderForm'

const t: Translate = (key, named = {}, plural) =>
  [key, ...Object.entries(named).map(([name, value]) => `${name}=${String(value)}`), plural === undefined ? '' : `#${plural}`]
    .filter(Boolean)
    .join(' ')

describe('toReachModel', () => {
  it('explains who is left out and only lists reasons that apply', () => {
    const model = toReachModel({ lapsed: 3, withoutConsent: 2, expired: 0, alreadyReminded: 0, reachable: 1 }, t)
    expect(model.headline).toBe('campaigns.reach.reachable count=1 #1')
    expect(model.lines.map((line) => line.key)).toEqual(['lapsed', 'withoutConsent'])
    expect(model.emptyHint).toBeNull()
  })

  it('tells the merchant why nobody would receive it', () => {
    const model = toReachModel({ lapsed: 2, withoutConsent: 0, expired: 1, alreadyReminded: 1, reachable: 0 }, t)
    expect(model.lines.map((line) => line.key)).toEqual(['lapsed', 'expired', 'alreadyReminded'])
    expect(model.emptyHint).toBe('campaigns.reach.emptyHint days=30')
  })
})

describe('toReminderPreview', () => {
  it('shows the bonus in the program unit and hides it at zero', () => {
    const draft = { message: '  Sentimos sua falta!  ', bonusUnits: 2 }
    expect(toReminderPreview(draft, 'Barbearia Navalha', 'stamp', t)).toEqual({
      shopName: 'Barbearia Navalha',
      message: 'Sentimos sua falta!',
      bonus: 'campaigns.preview.bonus units=units.stamp count=2 #2',
    })
    expect(toReminderPreview({ ...draft, bonusUnits: 0 }, 'Barbearia Navalha', 'point', t).bonus).toBeNull()
  })
})

describe('toCampaignHistoryRow', () => {
  it('formats the send time in the pilot time zone', () => {
    const campaign = CampaignSchema.parse({
      id: 'campaign_1',
      shopId: 'shop_barbearia',
      kind: 'lapsedReminder',
      unit: 'stamp',
      bonusUnits: 0,
      message: 'Oi',
      recipientsCount: 4,
      sentAt: '2026-10-02T02:30:00.000Z',
    })
    const row = toCampaignHistoryRow(campaign, t)
    expect(row.sentAt).toMatch(/^1 de out\.?,? 22:30$/)
    expect(row.recipients).toBe('campaigns.history.recipients count=4 #4')
    expect(row.bonus).toBe('campaigns.history.noBonus')
  })
})

describe('reminder form', () => {
  const limits = { min: 0, max: 9, suggested: 1 }

  it('starts with the gift the program suggests', () => {
    expect(withSuggestedBonus(initialReminderDraft('Oi'), limits)).toEqual({ message: 'Oi', bonusUnits: 1 })
  })

  it('flags a blank message and a gift over the program limit', () => {
    expect(reminderFieldErrors({ message: 'Oi', bonusUnits: 9 }, limits)).toEqual({})
    expect(reminderFieldErrors({ message: '   ', bonusUnits: 10 }, limits)).toEqual({ message: true, bonusUnits: true })
  })
})
