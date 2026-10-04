import type { LoyaltyCardId, RedemptionId, ShopId } from '#shared/schemas/ids'
import type { ProfileUpdate } from '#shared/schemas/customer'
import type { CheckInCode } from '#shared/schemas/shop'
import type { Ranking, RankingConsentUpdate } from '#shared/schemas/ranking'
import { ReferralInviteSchema } from '#shared/schemas/referral'
import { ok } from '#shared/types/result'
import { asCustomer } from '#layers/core/app/mock/withSession'
import type { CustomerServices } from '../CustomerServices'
import type { MockBackend } from '#layers/core/app/mock/MockBackend'
import { checkIn, discoverChallenges, discoverShops, rewardHistory, walletActivity, walletCard, walletCards } from '#layers/core/app/mock/handlers/wallet'
import { getRedemption, requestRedemption } from '#layers/core/app/mock/handlers/redemption'
import { acceptTerms, getProfile, setNotificationConsent, updateProfile } from '#layers/core/app/mock/handlers/profile'
import type { CustomerSessionProvider } from '#layers/core/app/services/SessionProvider'

export function createMockCustomerServices(backend: MockBackend, sessions: CustomerSessionProvider): CustomerServices {
  // O mock não guarda ranking no servidor falso: a pessoa só vê a si mesma, enquanto a aba estiver aberta.
  let mockName: string | null = null
  const mockRanking = (): Ranking => ({
    month: new Date().toISOString().slice(0, 7),
    entries: mockName === null ? [] : [{ position: 1, name: mockName, visits: 1, isMe: true }],
    me: { optedIn: mockName !== null, position: mockName === null ? null : 1, visits: 1, name: mockName },
  })
  return {
    wallet: {
      listCards: () => asCustomer(backend, sessions, (ctx, customerId) => ok(walletCards(ctx, customerId))),
      getCard: (shopId: ShopId) => asCustomer(backend, sessions, (ctx, customerId) => walletCard(ctx, customerId, shopId)),
      listActivity: (limit: number) =>
        asCustomer(backend, sessions, (ctx, customerId) => ok(walletActivity(ctx, customerId, limit))),
      listRewardHistory: (limit: number) =>
        asCustomer(backend, sessions, (ctx, customerId) => ok(rewardHistory(ctx, customerId, limit))),
    },
    checkIn: {
      checkIn: (code: CheckInCode) => asCustomer(backend, sessions, (ctx, customerId) => checkIn(ctx, customerId, code)),
    },
    redemption: {
      requestCode: (cardId: LoyaltyCardId) =>
        asCustomer(backend, sessions, (ctx, customerId) => requestRedemption(ctx, customerId, cardId)),
      getRedemption: (id: RedemptionId) =>
        asCustomer(backend, sessions, (ctx, customerId) => getRedemption(ctx, customerId, id)),
    },
    discover: {
      listShops: () => asCustomer(backend, sessions, (ctx) => ok(discoverShops(ctx))),
      listChallenges: () => asCustomer(backend, sessions, (ctx, customerId) => ok(discoverChallenges(ctx, customerId))),
    },
    profile: {
      getProfile: () => asCustomer(backend, sessions, getProfile),
      updateProfile: (update: ProfileUpdate) =>
        asCustomer(backend, sessions, (ctx, customerId) => updateProfile(ctx, customerId, update)),
      setNotificationConsent: (granted: boolean) =>
        asCustomer(backend, sessions, (ctx, customerId) => setNotificationConsent(ctx, customerId, granted)),
      acceptTerms: () => asCustomer(backend, sessions, acceptTerms),
    },
    dataExport: {
      exportMyData: () =>
        asCustomer(backend, sessions, (ctx, customerId) => {
          const profile = getProfile(ctx, customerId)
          return profile.ok
            ? ok({ exportedAt: new Date().toISOString(), profile: profile.value, cards: [], ledger: [], redemptions: [], referrals: { pending: 0, rewarded: 0, rejected: 0 } })
            : profile
        }),
    },
    ranking: {
      getRanking: () => asCustomer(backend, sessions, () => ok(mockRanking())),
      setConsent: (update: RankingConsentUpdate) =>
        asCustomer(backend, sessions, () => {
          mockName = update.granted ? update.name : null
          return ok(mockRanking())
        }),
    },
    referral: {
      capture: () => asCustomer(backend, sessions, () => ok(undefined)),
      getInvite: () => asCustomer(backend, sessions, () => ok(ReferralInviteSchema.parse({ referralCode: 'MOCKREF2' }))),
    },
  }
}
