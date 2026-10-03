<script setup lang="ts">
import type { CheckInPosterModel } from '../../types/poster'
import type { PosterStepLabels } from '../../types/clubSetup'

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
      <PageTitle :title="labels.title" :lead="labels.lead" focusable />
      <InkNote
        v-if="isPending"
        tone="warning"
        icon="i-ph-hourglass-medium"
        :title="labels.pendingTitle"
        :description="labels.pendingDescription"
        :actions="canApprove ? [{ label: labels.approveForTesting, onClick: () => emit('approve') }] : []"
      />
      <InkNote
        v-else-if="status === 'success'"
        tone="success"
        icon="i-ph-check-circle"
        :description="labels.approved"
      />
      <div class="flex flex-wrap gap-3">
        <UButton size="lg" icon="i-ph-printer" :label="labels.print" :disabled="!poster" @click="emit('print')" />
        <UButton :to="panelPath" size="lg" variant="outline" color="neutral" trailing-icon="i-ph-arrow-right" :label="labels.goToPanel" />
      </div>
    </section>

    <div class="lg:col-span-6">
      <div v-if="status === 'loading'" role="status" :aria-label="labels.loading">
        <USkeleton class="mx-auto h-[560px] max-w-[420px] rounded-(--radius-card)" />
      </div>
      <InkNote
        v-else-if="status === 'error'"
        tone="error"
        icon="i-ph-warning-circle"
        :description="labels.loadError"
        :actions="[{ label: labels.retry, onClick: () => emit('retry') }]"
        live
      />
      <ClubSetupPoster v-else-if="poster" :poster="poster" />
    </div>
  </div>
</template>
