<script setup lang="ts">
import type { HitItemStatus } from '#shared/schemas/hitItem'

interface Props {
  status: HitItemStatus
  reason: string | null
  missingPhoto: boolean
}

defineProps<Props>()
const { t } = useI18n()

const TONE: Readonly<Record<HitItemStatus, string>> = {
  pending: 'text-warning ring-warning',
  approved: 'text-success ring-success',
  rejected: 'text-error ring-error',
  archived: 'text-muted ring-(--lagoa-rule)',
}
</script>

<template>
  <span class="flex flex-col items-start gap-1">
    <span class="inline-flex min-h-7 items-center rounded-full px-3 text-[0.9375rem] font-semibold ring-1" :class="TONE[status]">
      {{ t(`merchantHits.status.${status}`, { reason: reason ?? '' }) }}
    </span>
    <span v-if="missingPhoto" class="text-[0.9375rem] text-error">{{ t('merchantHits.missingPhoto') }}</span>
  </span>
</template>
