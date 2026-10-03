<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { CustomerRowModel, CustomerTableLabels } from '../../types/customer'

interface Props {
  rows: readonly CustomerRowModel[]
  labels: CustomerTableLabels
  caption: string
}

const props = defineProps<Props>()

const columns = computed<TableColumn<CustomerRowModel>[]>(() => [
  { id: 'customer', header: props.labels.customer },
  { id: 'card', header: props.labels.card },
  { accessorKey: 'visits', header: props.labels.visits, meta: { class: { th: 'text-right', td: 'text-right' } } },
  { id: 'lastVisit', header: props.labels.lastVisit },
  { id: 'notifications', header: props.labels.notifications },
])
</script>

<template>
  <UTable
    :data="[...rows]"
    :columns="columns"
    :get-row-id="(row: CustomerRowModel) => row.id"
    :caption="caption"
    :ui="{ caption: 'sr-only', th: 'text-[0.9375rem] font-semibold text-muted', td: 'text-[0.9375rem] text-default', tr: 'border-b border-(--lagoa-rule) last:border-b-0' }"
  >
    <template #customer-cell="{ row }">
      <span class="flex flex-col">
        <span class="font-semibold text-highlighted" :class="{ 'text-muted italic font-normal': row.original.name === null }">
          {{ row.original.name ?? labels.noName }}
        </span>
        <span class="tabular text-muted">{{ row.original.phone }}</span>
      </span>
    </template>

    <template #card-cell="{ row }">
      <span class="flex min-w-40 flex-col gap-1.5">
        <span class="flex items-center gap-2">
          <span class="tabular">{{ row.original.progress }}</span>
          <StampTag v-if="row.original.rewardReady" :label="labels.rewardReady" tone="reward" icon="i-ph-gift" />
        </span>
        <InkRule :fraction="row.original.progressRatio" :tone="row.original.rewardReady ? 'reward' : 'ink'" class="max-w-40" />
      </span>
    </template>

    <template #visits-cell="{ row }">
      <span class="tabular">{{ row.original.visits }}</span>
    </template>

    <template #lastVisit-cell="{ row }">
      <span class="flex items-center gap-2">
        <span class="tabular">{{ row.original.lastVisit }}</span>
        <StampTag v-if="row.original.isLapsed" :label="labels.lapsed" tone="warning" />
      </span>
    </template>

    <template #notifications-cell="{ row }">
      <span v-if="row.original.acceptsNotifications" class="flex items-center gap-1.5 text-success">
        <UIcon name="i-ph-bell-ringing" class="size-4 shrink-0" aria-hidden="true" />{{ labels.acceptsNotifications }}
      </span>
      <span v-else class="flex items-center gap-1.5 text-muted">
        <UIcon name="i-ph-bell-slash" class="size-4 shrink-0" aria-hidden="true" />{{ labels.noNotifications }}
      </span>
    </template>
  </UTable>
</template>
