<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui'
import { CustomerFilterSchema } from '#shared/schemas/customer'
import type { CustomerTableLabels } from '#layers/ui/app/types/customers'
import { toCustomerRowModel } from '../utils/customerModels'

definePageMeta({ path: '/clientes', layout: 'merchant', middleware: 'merchant-auth' })

const { t } = useI18n()
const translate = useTranslate()
const { signOut } = useMerchantSession()
useHead({ title: () => `${t('customers.title')} · ${t('app.name')}` })

const { filter, state, reload } = useMerchantCustomers()

watch(state, (current) => {
  if (current.status === 'error' && current.error.code === 'unauthorized') void signOut()
})

const filterItems = computed<TabsItem[]>(() =>
  CustomerFilterSchema.options.map((value) => ({ label: t(`customers.filters.${value}`), value })),
)

function onFilterChange(value: string | number): void {
  const parsed = CustomerFilterSchema.safeParse(value)
  if (parsed.success) filter.value = parsed.data
}

const rows = computed(() => {
  if (state.value.status !== 'success') return []
  const now = new Date()
  return state.value.value.map((row) => toCustomerRowModel(row, now, translate))
})

const reachableLapsed = computed(() =>
  state.value.status === 'success' ? state.value.value.filter((row) => row.isLapsed && row.acceptsNotifications).length : 0,
)

const tableLabels = computed<CustomerTableLabels>(() => ({
  customer: t('customers.table.customer'),
  card: t('customers.table.card'),
  visits: t('customers.table.visits'),
  lastVisit: t('customers.table.lastVisit'),
  notifications: t('customers.table.notifications'),
  noName: t('customers.table.noName'),
  rewardReady: t('customers.table.rewardReady'),
  lapsed: t('customers.table.lapsed'),
  acceptsNotifications: t('customers.table.acceptsNotifications'),
  noNotifications: t('customers.table.noNotifications'),
}))
</script>

<template>
  <div class="mx-auto flex max-w-[1200px] flex-col gap-5">
    <header class="flex flex-col gap-1">
      <h1 class="text-[1.75rem] leading-tight font-bold text-highlighted [font-stretch:90%]">{{ t('customers.title') }}</h1>
      <p class="text-muted">{{ t('customers.lead') }}</p>
    </header>

    <PanelModule :title="t('customers.listTitle')">
      <template #actions>
        <div class="flex items-center gap-1">
          <span v-if="state.status === 'success'" class="tabular text-[0.9375rem] text-muted">
            {{ t('customers.count', state.value.length) }}
          </span>
          <UButton
            variant="ghost"
            color="neutral"
            icon="i-ph-arrow-clockwise"
            :aria-label="t('customers.refresh')"
            :loading="state.status === 'loading'"
            @click="reload"
          />
        </div>
      </template>

      <div class="flex flex-col gap-4">
        <UTabs
          :model-value="filter"
          :items="filterItems"
          :content="false"
          :aria-label="t('customers.filters.label')"
          variant="pill"
          color="neutral"
          class="w-fit"
          :ui="{ trigger: 'min-h-11 px-4 text-[0.9375rem]' }"
          @update:model-value="onFilterChange"
        />

        <p
          v-if="filter === 'lapsed' && state.status === 'success' && state.value.length > 0"
          class="flex items-start gap-1.5 text-[0.9375rem] text-toned"
        >
          <UIcon name="i-ph-bell-ringing" class="mt-0.5 size-4 shrink-0" aria-hidden="true" />{{ t('customers.lapsedHint', { count: reachableLapsed, total: rows.length }) }}
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
        <UAlert
          v-else-if="state.status === 'error'"
          color="error"
          variant="subtle"
          icon="i-ph-warning-circle"
          :description="t(`errors.${state.error.code}`)"
          :actions="[{ label: t('common.retry'), color: 'neutral', variant: 'outline', onClick: reload }]"
        />
        <p v-else-if="rows.length === 0" class="py-10 text-center text-muted">{{ t(`customers.empty.${filter}`) }}</p>
        <CustomerTable v-else :rows="rows" :labels="tableLabels" :caption="t('customers.table.caption')" />
      </div>
    </PanelModule>
  </div>
</template>
