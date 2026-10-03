<script setup lang="ts">
import type { StampCardModel } from '#layers/ui/app/types/wallet'
import { formatShortDate } from '#shared/utils/dateFormat'

definePageMeta({ path: '/carteira', layout: 'customer', middleware: 'customer-auth' })

const { t } = useI18n()
const translate = useTranslate()
useHead({ title: () => `${t('wallet.title')} · ${t('app.name')}` })

const { signOut } = useCustomerSession()
const { state: cardsState, reload: reloadCards } = useWalletCards()
const { state: activityState } = useWalletActivity()
const { state: profileState } = useCustomerProfile()
const seenStamps = useSeenStamps()

const cards = shallowRef<StampCardModel[]>([])
const activeId = ref('')

// O "visto" é lido uma vez por carga: a batida acontece nesta tela e depois o saldo vira visto.
watch(cardsState, (state) => {
  if (state.status !== 'success') return
  const seen = seenStamps.snapshot()
  cards.value = state.value.map((card) =>
    toStampCardModel(card, { t: translate, seenBalance: seen[card.id] ?? 0, formatDate: formatShortDate }),
  )
  activeId.value = cards.value[0]?.id ?? ''
  seenStamps.remember(Object.fromEntries(state.value.map((card) => [card.id, card.balance])))
})

const anyUnauthorized = computed(() =>
  [cardsState.value, activityState.value, profileState.value].some(
    (state) => state.status === 'error' && state.error.code === 'unauthorized',
  ),
)
watch(anyUnauthorized, (unauthorized) => {
  if (unauthorized) void signOut()
})

const firstName = computed(() => (profileState.value.status === 'success' ? profileState.value.value.firstName : null))
const greeting = computed(() => (firstName.value ? t('wallet.greeting', { name: firstName.value }) : t('wallet.greetingAnonymous')))

const ledger = computed(() => {
  if (activityState.value.status !== 'success') return []
  const now = new Date()
  const iconByShop = new Map<string, string>(
    cardsState.value.status === 'success' ? cardsState.value.value.map((card) => [card.shop.id, categoryIcon(card.shop.category)]) : [],
  )
  return activityState.value.value.map((activity) => toLedgerEntryModel(activity, now, translate, iconByShop))
})
</script>

<template>
  <div>
    <ScreenHeader :title="greeting" :lead="t('wallet.lead')">
      <template #actions>
        <NuxtLink
          to="/perfil"
          class="grid size-11 shrink-0 place-items-center rounded-full bg-white/15 text-white ring-1 ring-white/50 transition-colors duration-(--lagoa-dur-fast) hover:bg-white/25"
          :aria-label="t('wallet.profileLink')"
        >
          <UIcon name="i-ph-user-circle" class="size-7" aria-hidden="true" />
        </NuxtLink>
      </template>
    </ScreenHeader>

    <div class="flex flex-col gap-8">
      <section :aria-label="t('wallet.stackLabel')" class="relative -mt-10">
        <WalletStackSkeleton v-if="cardsState.status === 'loading'" />

        <WalletProblem
          v-else-if="cardsState.status === 'error'"
          :message="t(`errors.${cardsState.error.code}`)"
          :action="t('common.retry')"
          @retry="reloadCards"
        />

        <WalletEmpty
          v-else-if="cards.length === 0"
          :title="t('wallet.emptyTitle')"
          :lead="t('wallet.empty')"
          :action="t('wallet.emptyAction')"
          to="/descobrir"
        />

        <CardStack
          v-else
          :cards="cards"
          :active-id="activeId"
          :show-label="(card) => t('wallet.showCard', { shop: card.shopName })"
          :more-label="(hidden) => t('wallet.showMore', { count: hidden }, hidden)"
          @select="activeId = $event"
        >
          <template #actions="{ card }">
            <UButton v-if="card.rewardReady" :to="`/premios/${card.id}`" color="secondary" size="xl" block icon="i-ph-gift" :label="t('wallet.redeem')" />
          </template>
        </CardStack>
      </section>

      <section v-if="cards.length > 0 || ledger.length > 0" class="flex flex-col gap-3" aria-labelledby="ledger-title">
        <h2 id="ledger-title" class="type-h2">
          {{ t('wallet.ledgerTitle') }}
        </h2>
        <div class="rounded-(--radius-card) bg-default px-5 py-1 shadow-(--lagoa-shadow-card)">
          <USkeleton v-if="activityState.status === 'loading'" class="my-3 h-24" />
          <LedgerList v-else-if="ledger.length > 0" :entries="ledger" />
          <p v-else class="py-4 text-muted">{{ t('wallet.ledgerEmpty') }}</p>
        </div>
      </section>
    </div>
  </div>
</template>
