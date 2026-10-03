<script setup lang="ts">
import { REDEMPTION_CODE_LENGTH } from '#shared/constants/domain'
import type { DomainErrorCode } from '#shared/types/errors'
import type { FocusRequest } from '#layers/ui/app/types/focus'
import type { CounterFocusTarget, CounterRedemptionPreviewModel, RedemptionCheckState } from '../../types/counter'

interface Props {
  status: RedemptionCheckState['status']
  errorCode: DomainErrorCode | null
  preview: CounterRedemptionPreviewModel | null
  deliveredReward: string | null
  focusRequest: FocusRequest<CounterFocusTarget> | null
}

interface Emits {
  complete: []
  deliver: []
  cancel: []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const code = defineModel<string[]>('code', { required: true })

const stub = useTemplateRef<{ focus: () => void }>('stub')
const busy = computed(() => props.status === 'checking' || props.status === 'confirming')
useFocusTarget(() => props.focusRequest, 'redemptionCode', () => stub.value?.focus())
</script>

<template>
  <RedemptionStub
    ref="stub"
    v-model="code"
    :title="$t('counter.redemption.title')"
    :hint="$t('counter.redemption.hint')"
    :code-label="$t('counter.redemption.codeLabel')"
    :length="REDEMPTION_CODE_LENGTH"
    :disabled="busy"
    :invalid="status === 'error'"
    @complete="emit('complete')"
    @keydown.esc="emit('cancel')"
  >
    <CounterRedemptionStatus
      :status="status"
      :error-code="errorCode"
      :preview="preview"
      :delivered-reward="deliveredReward"
      @deliver="emit('deliver')"
      @cancel="emit('cancel')"
    />
  </RedemptionStub>
</template>
