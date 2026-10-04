import type { LoyaltyCardId, RedemptionId, ShopId } from '#shared/schemas/ids'
import type { ProfileUpdate } from '#shared/schemas/customer'
import type { CheckInCode } from '#shared/schemas/shop'
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
    referral: {
      capture: () => asCustomer(backend, sessions, () => ok(undefined)),
      getInvite: () => asCustomer(backend, sessions, () => ok(ReferralInviteSchema.parse({ referralCode: 'MOCKREF2' }))),
    },
  }
}
