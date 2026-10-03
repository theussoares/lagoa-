<script setup lang="ts">
import type { DomainErrorCode } from '#shared/types/errors'
import type { CounterRedemptionPreviewModel, RedemptionCheckState } from '../../types/counter'

interface Props {
  status: RedemptionCheckState['status']
  errorCode: DomainErrorCode | null
  preview: CounterRedemptionPreviewModel | null
  deliveredReward: string | null
}

interface Emits {
  deliver: []
  cancel: []
}

defineProps<Props>()
const emit = defineEmits<Emits>()
</script>

<template>
  <div aria-live="polite" class="empty:hidden">
    <p v-if="status === 'checking'" class="flex items-center gap-2 text-muted">
      <UIcon name="i-ph-circle-notch" class="size-4 motion-safe:animate-spin" aria-hidden="true" />{{ $t('counter.redemption.checking') }}
    </p>
    <p v-else-if="status === 'error' && errorCode" class="flex items-start gap-1.5 text-[0.9375rem] text-error">
      <UIcon name="i-ph-warning-circle" class="mt-0.5 size-4 shrink-0" aria-hidden="true" />{{ $t(`errors.${errorCode}`) }}
    </p>
    <div v-else-if="preview" class="flex flex-col gap-4">
      <div class="flex flex-col gap-1">
        <p class="flex items-center gap-1.5 text-[0.9375rem] font-semibold text-success">
          <UIcon name="i-ph-check-circle" class="size-4" aria-hidden="true" />{{ $t('counter.redemption.valid') }}
        </p>
        <p class="text-[1.375rem] leading-tight font-bold text-secondary [font-stretch:90%]">{{ preview.rewardTitle }}</p>
        <p class="tabular text-[0.9375rem] text-muted">{{ preview.customerLine }}</p>
      </div>
      <div class="flex gap-2">
        <UButton
          color="secondary"
          icon="i-ph-gift"
          :label="$t('counter.redemption.deliver')"
          :loading="preview.confirming"
          class="flex-1 justify-center"
          @click="emit('deliver')"
        />
        <UButton
          variant="ghost"
          color="neutral"
          :label="$t('counter.redemption.cancel')"
          :disabled="preview.confirming"
          @click="emit('cancel')"
        />
      </div>
    </div>
    <p v-else-if="status === 'delivered' && deliveredReward" class="flex items-start gap-1.5 text-[0.9375rem] font-medium text-success">
      <UIcon name="i-ph-check-circle" class="mt-0.5 size-4 shrink-0" aria-hidden="true" />{{ $t('counter.redemption.delivered', { reward: deliveredReward }) }}
    </p>
  </div>
</template>
