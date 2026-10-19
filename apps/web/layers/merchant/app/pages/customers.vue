<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui'
import { LAPSED_AFTER_DAYS } from '#shared/constants/domain'
import { CustomerFilterSchema } from '#shared/schemas/customer'
import type { CustomerTableLabels } from '../types/customer'
import { CUSTOMER_FILTER_QUERY, customerFilterFromSlug, customerFilterSlug } from '../utils/customerFilterQuery'
import { toCustomerRowModel } from '../utils/customerModels'

definePageMeta({ path: '/clientes', layout: 'merchant', middleware: 'merchant-auth' })

const { t } = useI18n()
const translate = useTranslate()
const { signOut } = useMerchantSession()
useHead({ title: () => `${t('customers.title')} · ${t('app.name')}` })

const route = useRoute()
const router = useRouter()
const { filter, state, reload, loadMore, loadingMore, loadMoreError } = useMerchantCustomers(customerFilterFromSlug(route.query[CUSTOMER_FILTER_QUERY]))

// O filtro mora na URL (`?filtro=sumidos`): o Início linka direto e o menu lateral volta para "Todos".
// Troca de aba usa `replace`: o Voltar do navegador sai da tela em vez de desfazer cada aba.
watch(
  () => route.query[CUSTOMER_FILTER_QUERY],
  (slug) => {
    filter.value = customerFilterFromSlug(slug)
    // `?filtro=xyz` ou `?filtro=todos` viram a URL limpa de "Todos".
    if (slug !== undefined && filter.value === 'all') void router.replace({ query: {} })
  },
  { immediate: true },
)
watch(filter, (next) => {
  if (customerFilterFromSlug(route.query[CUSTOMER_FILTER_QUERY]) === next) return
  void router.replace({ query: next === 'all' ? {} : { [CUSTOMER_FILTER_QUERY]: customerFilterSlug(next) } })
})
const filterLabelId = useId()

watch(state, (current) => {
  if (current.status === 'error' && current.error.code === 'unauthorized') void signOut()
})

const filterItems = computed<TabsItem[]>(() =>
  CustomerFilterSchema.options.map((value) => ({ label: t(`customers.filters.${value}`, { days: LAPSED_AFTER_DAYS }), value })),
)

function onFilterChange(value: string | number): void {
  const parsed = CustomerFilterSchema.safeParse(value)
  if (parsed.success) filter.value = parsed.data
}

const rows = computed(() => {
  if (state.value.status !== 'success') return []
  const now = new Date()
  return state.value.value.items.map((row) => toCustomerRowModel(row, now, translate))
})
const page = computed(() => (state.value.status === 'success' ? state.value.value : null))

const tableLabels = computed<CustomerTableLabels>(() => ({
  customer: t('customers.table.customer'),
  card: t('customers.table.card'),
  visits: t('customers.table.visits'),
  lastVisit: t('customers.table.lastVisit'),
  lastPurchase: t('customers.table.lastPurchase'),
  noName: t('customers.table.noName'),
  rewardReady: t('customers.table.rewardReady'),
  lapsed: t('customers.table.lapsed'),
  noPurchase: t('customers.table.noPurchase'),
}))
</script>

<template>
  <div class="mx-auto flex max-w-[1200px] flex-col gap-5">
    <PageTitle :title="t('customers.title')" :lead="t('customers.lead')" />

    <PanelModule :title="t('customers.listTitle')">
      <template #actions>
        <div class="flex items-center gap-1">
          <span v-if="state.status === 'success'" class="tabular text-[0.9375rem] text-muted">
            {{ t('customers.count', state.value.total) }}
          </span>
          <UButton
            variant="ghost"
            color="neutral"
            icon="i-ph-arrow-clockwise"
            class="size-11 justify-center cursor-pointer transition-all duration-150 hover:bg-slate-100 dark:hover:bg-white/10 active:scale-95"
            :aria-label="t('customers.refresh')"
            :loading="state.status === 'loading'"
            @click="reload"
          />
        </div>
      </template>

      <div class="flex flex-col gap-4">
        <div role="group" :aria-labelledby="filterLabelId" class="flex flex-col gap-1.5">
          <span :id="filterLabelId" class="sr-only">{{ t('customers.filters.label') }}</span>
          <UTabs
            :model-value="filter"
            :items="filterItems"
            :content="false"
            variant="pill"
            color="neutral"
            class="w-fit"
            :ui="{ trigger: 'min-h-11 px-4 text-[0.9375rem]' }"
            @update:model-value="onFilterChange"
          />
        </div>

        <p
          v-if="filter === 'lapsed' && page !== null && page.total > 0"
          class="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.9375rem] text-toned"
        >
          <span class="inline-flex items-center gap-1.5">
            <UIcon name="i-ph-bell-ringing" class="size-4 shrink-0" aria-hidden="true" />
            <span>{{ t('customers.lapsedHint', { count: page.acceptingNotifications, total: page.total }) }}</span>
          </span>
          <!-- A janela e a expiração só o servidor sabe: quem de fato recebe aparece em Campanhas. -->
          <NuxtLink
            to="/campanhas"
            class="group/link inline-flex items-center gap-1.5 text-xs font-semibold text-[#0f6381] dark:text-cyan-400 hover:text-[#0b4d66] dark:hover:text-cyan-300 hover:bg-[#e8f6f8] dark:hover:bg-cyan-950/50 px-2 py-1 rounded-lg transition-all duration-150"
          >
            <span>{{ t('customers.lapsedHintLink') }}</span>
            <UIcon name="i-ph-arrow-right" class="size-3 transition-transform duration-200 group-hover/link:translate-x-0.5" aria-hidden="true" />
          </NuxtLink>
        </p>

        <div v-if="state.status === 'loading'" class="flex flex-col" role="status" :aria-label="t('common.loading')">
          <div v-for="row in 5" :key="row" class="flex h-16 items-center gap-6 border-b border-(--lagoa-rule) last:border-b-0">
            <USkeleton class="h-4 w-36" />
            <USkeleton class="h-4 w-32" />
            <USkeleton class="h-4 w-10" />
            <USkeleton class="h-4 w-24" />
            <USkeleton class="h-4 w-20" />
          </div>
        </div>
        <InkNote
          v-else-if="state.status === 'error'"
          tone="error"
          icon="i-ph-warning-circle"
          :description="t(`errors.${state.error.code}`)"
          :actions="[{ label: t('common.retry'), onClick: reload }]"
          live
        />
        <p v-else-if="rows.length === 0" class="py-10 text-center text-muted">{{ t(`customers.empty.${filter}`, { days: LAPSED_AFTER_DAYS }) }}</p>
        <template v-else>
          <CustomersTable :rows="rows" :labels="tableLabels" :caption="t('customers.table.caption')" />
          <CustomersLoadMore
            v-if="page !== null && page.nextCursor !== null"
            :shown="rows.length"
            :total="page.total"
            :loading="loadingMore"
            :error-code="loadMoreError?.code ?? null"
            @load="loadMore"
          />
        </template>
      </div>
    </PanelModule>
  </div>
</template>
