<script setup lang="ts">
import type { RedemptionTicketState } from '#layers/ui/app/types/redemption'

definePageMeta({ path: '/premios/:cardId', layout: 'customer', middleware: 'customer-auth' })

const { t } = useI18n()
const translate = useTranslate()
const route = useRoute()
const router = useRouter()
useHead({ title: () => `${t('redemption.pageTitle')} · ${t('app.name')}` })

const { signOut } = useCustomerSession()
const { state, remaining, request } = useRewardRedemption(String(route.params.cardId))
const { state: cardsState } = useWalletCards()

const card = computed(() => {
  if (cardsState.value.status !== 'success') return undefined
  return cardsState.value.value.find((item) => item.id === route.params.cardId)
})

const redemption = computed(() => (state.value.status === 'ready' ? state.value.redemption : undefined))
const ticket = computed<RedemptionTicketState | undefined>(() =>
  redemption.value ? toRedemptionTicketState(redemption.value, remaining.value, translate) : undefined,
)
const announcement = computed(() =>
  ticket.value?.kind === 'active' ? minutesLeftAnnouncement(remaining.value, translate) : '',
)
const heldUntil = computed(() =>
  card.value?.rewardExpiresAt ? t('redemption.heldUntil', { date: formatShortDate(card.value.rewardExpiresAt) }) : null,
)

const errorText = computed(() => {
  if (state.value.status !== 'error') return ''
  const { error } = state.value
  return error.code === 'rewardNotReady' ? t('errors.rewardNotReady', { remaining: error.remaining }) : t(`errors.${error.code}`)
})
const title = computed(() => (ticket.value?.kind === 'redeemed' ? t('redemption.redeemedTitle') : t('redemption.title')))
// Quem chegou pela aba Prêmios volta para ela; o resto volta para a carteira.
const back = router.options.history.state.back === '/premios'
  ? { to: '/premios', label: t('redemption.backToRewards') }
  : { to: '/carteira', label: t('redemption.back') }
const canRetry = computed(() => state.value.status === 'error' && state.value.error.code === 'network')

watch(state, (current) => {
  if (current.status === 'error' && current.error.code === 'unauthorized') void signOut()
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="-mb-3 flex flex-col items-start">
      <UButton :to="back.to" variant="ghost" color="neutral" icon="i-ph-arrow-left" :label="back.label" class="-ml-2.5" />
    </div>
    <PageTitle :title="title" />

    <p class="sr-only" aria-live="polite">{{ announcement }}</p>

    <WalletProblem
      v-if="state.status === 'error'"
      :message="errorText"
      :action="canRetry ? t('common.retry') : t('redemption.backToWallet')"
      :icon="canRetry ? undefined : 'i-ph-warning-circle'"
      :action-icon="canRetry ? undefined : 'i-ph-arrow-left'"
      @retry="canRetry ? request() : navigateTo('/carteira')"
    />

    <div
      v-else-if="!ticket || !card"
      class="flex flex-col gap-5 rounded-(--radius-card) bg-default p-5 shadow-(--lagoa-shadow-card)"
      :aria-label="t('common.loading')"
      role="status"
    >
      <div class="flex items-center gap-4">
        <USkeleton class="size-12 rounded-full" />
        <div class="flex flex-1 flex-col gap-2">
          <USkeleton class="h-4 w-1/3" />
          <USkeleton class="h-6 w-2/3" />
        </div>
      </div>
      <USkeleton class="mx-auto mt-4 h-14 w-4/5" />
      <USkeleton class="h-1 w-full" />
    </div>

    <template v-else>
      <RedemptionTicket
        :shop-name="card.shop.name"
        :icon="categoryIcon(card.shop.category)"
        :reward="redemption?.rewardTitle ?? card.rewardTitle"
        :code-label="t('redemption.codeLabel')"
        :state="ticket"
      />

      <div v-if="ticket.kind === 'active'" class="flex flex-col gap-3 text-pretty text-toned">
        <p>{{ t('redemption.howTo') }}</p>
        <p v-if="heldUntil" class="text-base text-muted">{{ heldUntil }}</p>
      </div>

      <UButton
        v-else-if="ticket.kind === 'expired'"
        size="xl"
        block
        icon="i-ph-arrow-clockwise"
        :label="t('redemption.regenerate')"
        @click="request"
      />

      <UButton v-else to="/carteira" size="xl" block :label="t('redemption.backToWallet')" />
    </template>
  </div>
</template>
