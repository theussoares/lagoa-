<script setup lang="ts">
import type { HitItemRow } from '../../types/hitItem'

interface Props {
  rows: readonly HitItemRow[]
  busy: boolean
}

interface Emits {
  (event: 'edit' | 'archive' | 'unarchive', id: string): void
}

defineProps<Props>()
defineEmits<Emits>()
const { t } = useI18n()
</script>

<template>
  <ul v-if="rows.length > 0" class="flex flex-col divide-y divide-(--lagoa-rule)">
    <li v-for="row in rows" :key="row.item.id" class="flex flex-wrap items-center gap-4 py-4 first:pt-0 last:pb-0">
      <img v-if="row.item.photoUrl" :src="row.item.photoUrl" alt="" class="size-16 shrink-0 rounded-(--radius-card) object-cover" >
      <span v-else class="flex size-16 shrink-0 items-center justify-center rounded-(--radius-card) border border-dashed border-(--lagoa-rule) text-muted" aria-hidden="true">
        <UIcon name="i-ph-image" class="size-6" />
      </span>
      <div class="flex min-w-0 flex-1 flex-col gap-1">
        <p class="truncate text-base font-semibold text-highlighted">{{ row.item.title }}</p>
        <p class="text-[0.9375rem] text-toned tabular-nums">{{ row.priceLabel ?? t('merchantHits.onRequest') }}</p>
        <HitsStatusBadge :status="row.status" :reason="row.rejectionReason" :missing-photo="row.missingPhoto" />
      </div>
      <div class="flex gap-2">
        <ActionButton v-if="row.canEdit" role="secondary" :label="t('merchantHits.edit')" :disabled="busy" @click="$emit('edit', row.item.id)" />
        <ActionButton v-if="row.canEdit" role="quiet" :label="t('merchantHits.archive')" :disabled="busy" @click="$emit('archive', row.item.id)" />
        <ActionButton v-else role="secondary" :label="t('merchantHits.unarchive')" :disabled="busy" @click="$emit('unarchive', row.item.id)" />
      </div>
    </li>
  </ul>
  <p v-else class="rounded-(--radius-card) border-2 border-dashed border-(--lagoa-slot) px-4 py-3 text-pretty text-toned" role="status">
    {{ t('merchantHits.empty') }}
  </p>
</template>
