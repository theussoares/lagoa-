import type { ReminderDraft } from '#shared/schemas/campaign'
import type { ClubSetupDraft } from '#shared/schemas/onboarding'
import type { CustomerFilter } from '#shared/schemas/customer'
import type { RedemptionId, VisitQrId } from '#shared/schemas/ids'
import type { ProgramDraft } from '#shared/schemas/program'
import type { RedemptionCode } from '#shared/schemas/redemption'
import type { ShopPhoto, ShopPhotoUpload } from '#shared/schemas/shop'
import type { VisitQrIssueRequest } from '#shared/schemas/visitQr'
import { ok } from '#shared/types/result'
import { asMerchant } from '#layers/core/app/mock/withSession'
import type { MerchantServices } from '../MerchantServices'
import type { MockBackend } from '#layers/core/app/mock/MockBackend'
import { campaignOverview, sendReminder } from '#layers/core/app/mock/handlers/campaigns'
import { approveShop, createClub, markPosterReprinted, posterReprintPending, shopPoster, shopStatus } from '#layers/core/app/mock/handlers/onboarding'
import { confirmRedemption, todayEntries, validateRedemption } from '#layers/core/app/mock/handlers/counter'
import { cancelVisitQr, getVisitQr, issueVisitQr } from '#layers/core/app/mock/handlers/visitQr'
import { simulateVisitQrClaim } from '#layers/core/app/mock/handlers/visitQrClaim'
import { countActiveCards, getProgram, merchantCustomers, updateProgram, weekSummary } from '#layers/core/app/mock/handlers/merchant'
import type { MerchantSessionProvider } from '#layers/core/app/services/SessionProvider'

export function createMockMerchantServices(backend: MockBackend, sessions: MerchantSessionProvider): MerchantServices {
  // A foto do mock fica só na memória da aba (data URL): serve para ver a tela, não vai ao Descobrir do mock.
  let photo: ShopPhoto = { imageUrl: null }
  return {
    counter: {
      validateRedemption: (code: RedemptionCode) =>
        asMerchant(backend, sessions, (ctx, shopId) => validateRedemption(ctx, shopId, code)),
      confirmRedemption: (id: RedemptionId) =>
        asMerchant(backend, sessions, (ctx, shopId) => confirmRedemption(ctx, shopId, id)),
      listTodayEntries: () => asMerchant(backend, sessions, (ctx, shopId) => ok(todayEntries(ctx, shopId))),
    },
    visitQr: {
      issueVisitQr: (request: VisitQrIssueRequest) =>
        asMerchant(backend, sessions, (ctx, shopId, merchantId) => issueVisitQr(ctx, shopId, merchantId, request)),
      getVisitQr: (id: VisitQrId) => asMerchant(backend, sessions, (ctx, shopId) => getVisitQr(ctx, shopId, id)),
      cancelVisitQr: (id: VisitQrId) => asMerchant(backend, sessions, (ctx, shopId) => cancelVisitQr(ctx, shopId, id)),
    },
    customers: {
      listCustomers: (filter: CustomerFilter) =>
        asMerchant(backend, sessions, (ctx, shopId) => ok(merchantCustomers(ctx, shopId, filter))),
    },
    program: {
      getProgram: () => asMerchant(backend, sessions, getProgram),
      countActiveCards: () => asMerchant(backend, sessions, (ctx, shopId) => ok(countActiveCards(ctx, shopId))),
      updateProgram: (draft: ProgramDraft) =>
        asMerchant(backend, sessions, (ctx, shopId) => updateProgram(ctx, shopId, draft)),
    },
    campaigns: {
      getOverview: () => asMerchant(backend, sessions, campaignOverview),
      sendReminder: (draft: ReminderDraft, expectedRecipients: number) =>
        asMerchant(backend, sessions, (ctx, shopId) => sendReminder(ctx, shopId, draft, expectedRecipients)),
    },
    // O mock não guarda o termo: toda loja já nasce com ele aceito (`termsAccepted: true` na sessão).
    terms: {
      accept: () => Promise.resolve(ok(undefined)),
    },
    home: {
      getWeekSummary: () => asMerchant(backend, sessions, (ctx, shopId) => ok(weekSummary(ctx, shopId))),
    },
    clubSetup: {
      createClub: (draft: ClubSetupDraft) => backend.run((ctx) => createClub(ctx, draft)),
    },
    poster: {
      getPoster: () => asMerchant(backend, sessions, shopPoster),
    },
    posterReprint: {
      isPending: () => asMerchant(backend, sessions, posterReprintPending),
      markPrinted: () => asMerchant(backend, sessions, markPosterReprinted),
    },
    shopPhoto: {
      getPhoto: () => Promise.resolve(ok(photo)),
      uploadPhoto: (upload: ShopPhotoUpload) => {
        photo = { imageUrl: `data:${upload.contentType};base64,${upload.dataBase64}` }
        return Promise.resolve(ok(photo))
      },
    },
    shopStatus: {
      getStatus: () => asMerchant(backend, sessions, shopStatus),
    },
    shopApprovalTesting: {
      approveCurrentShop: () => asMerchant(backend, sessions, approveShop),
    },
    visitQrTesting: {
      simulateClaim: (id: VisitQrId) => asMerchant(backend, sessions, (ctx, shopId) => simulateVisitQrClaim(ctx, shopId, id)),
    },
  }
}
