<script setup lang="ts">
import type { CheckInPosterModel } from '#layers/ui/app/types/poster'
import type { PosterStepLabels } from '../../utils/clubSetupLabels'

interface Props {
  status: 'loading' | 'error' | 'success'
  poster: CheckInPosterModel | null
  isPending: boolean
  canApprove: boolean
  panelPath: string
  labels: PosterStepLabels
}

interface Emits {
  (event: 'approve' | 'print' | 'retry'): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()
</script>

<template>
  <div class="mx-auto grid w-full max-w-[1200px] flex-1 items-start gap-10 px-8 py-8 lg:grid-cols-12 print:block print:p-0">
    <section class="flex flex-col gap-5 lg:col-span-6 print:hidden">
      <div class="flex flex-col gap-2">
        <h1 tabindex="-1" class="text-[1.75rem] leading-tight font-bold text-balance text-highlighted [font-stretch:90%] focus:outline-none">{{ labels.title }}</h1>
        <p class="text-pretty text-muted">{{ labels.lead }}</p>
      </div>
      <UAlert
        v-if="isPending"
        color="warning"
        variant="subtle"
        icon="i-ph-hourglass-medium"
        :title="labels.pendingTitle"
        :description="labels.pendingDescription"
        :actions="canApprove ? [{ label: labels.approveForTesting, color: 'neutral', variant: 'outline', onClick: () => emit('approve') }] : []"
      />
      <UAlert v-else-if="status === 'success'" color="success" variant="subtle" icon="i-ph-check-circle" :description="labels.approved" />
      <div class="flex flex-wrap gap-3">
        <UButton size="lg" icon="i-ph-printer" :label="labels.print" :disabled="!poster" @click="emit('print')" />
        <UButton :to="panelPath" size="lg" variant="outline" color="neutral" trailing-icon="i-ph-arrow-right" :label="labels.goToPanel" />
      </div>
    </section>

    <div class="lg:col-span-6">
      <div v-if="status === 'loading'" role="status" :aria-label="labels.loading">
        <USkeleton class="mx-auto h-[560px] max-w-[420px] rounded-(--radius-card)" />
      </div>
      <UAlert
        v-else-if="status === 'error'"
        color="error"
        variant="subtle"
        icon="i-ph-warning-circle"
        :description="labels.loadError"
        :actions="[{ label: labels.retry, color: 'neutral', variant: 'outline', onClick: () => emit('retry') }]"
      />
      <CheckInPoster v-else-if="poster" :poster="poster" />
    </div>
  </div>
</template>
