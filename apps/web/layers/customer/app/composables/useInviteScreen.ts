import { CHECK_IN_LINK_PARAM } from '#shared/constants/domain'
import { ReferralCaptureSchema } from '#shared/schemas/referral'

const CHECK_IN_PATH = '/check-in'

/**
 * Link de convite aberto (`/convite?ref=&loja=`): registra o convite e leva ao check-in da loja,
 * onde a primeira visita fecha a indicação. Link quebrado ou rede fora não travam o amigo: ele segue.
 */
export function useInviteScreen(): void {
  const route = useRoute()
  const { referral } = useCustomerServices()
  const invite = ReferralCaptureSchema.safeParse({ referralCode: route.query.ref, shopCode: route.query[CHECK_IN_LINK_PARAM] })

  onMounted(async () => {
    if (!invite.success) return navigateTo(HOME_PATH, { replace: true })
    await referral.capture(invite.data)
    await navigateTo({ path: CHECK_IN_PATH, query: { [CHECK_IN_LINK_PARAM]: invite.data.shopCode } }, { replace: true })
  })
}
