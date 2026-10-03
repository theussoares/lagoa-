<script setup lang="ts">
import type { TransportError } from '#shared/types/errors'
import type { CounterLedgerEntryModel } from '../../types/counter'

interface Props {
  status: 'loading' | 'error' | 'success'
  errorCode: TransportError['code'] | null
  rows: readonly CounterLedgerEntryModel[]
}

interface Emits {
  reload: []
}

defineProps<Props>()
const emit = defineEmits<Emits>()
</script>

<template>
  <PanelModule :title="$t('counter.ledger.title')">
    <template #actions>
      <PanelRefreshAction
        :count-text="status === 'success' ? $t('counter.todayCount', rows.length) : undefined"
        :loading="status === 'loading'"
        :label="$t('counter.ledger.refresh')"
        @refresh="emit('reload')"
      />
    </template>

    <CounterLedgerSkeleton v-if="status === 'loading'" />
    <InkNote
      v-else-if="status === 'error' && errorCode"
      tone="error"
      icon="i-ph-warning-circle"
      :description="$t(`errors.${errorCode}`)"
      :actions="[{ label: $t('common.retry'), onClick: () => emit('reload') }]"
      live
    />
    <p v-else-if="rows.length === 0" class="py-10 text-center text-muted">{{ $t('counter.ledger.empty') }}</p>
    <!-- Rola por dentro: focável para quem usa só o teclado (iPad do balcão). -->
    <div
      v-else
      tabindex="0"
      role="region"
      :aria-label="$t('counter.ledger.title')"
      class="-mx-4 -mb-4 max-h-[min(28rem,50dvh)] overflow-y-auto px-4 pb-4 [scrollbar-color:var(--lagoa-slot)_transparent] [scrollbar-width:thin]">
      <CounterLedger :entries="rows" />
    </div>
  </PanelModule>
</template>
