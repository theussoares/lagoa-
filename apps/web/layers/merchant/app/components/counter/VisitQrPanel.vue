<script setup lang="ts">
import type { DomainErrorCode } from '#shared/types/errors'
import type { FocusRequest } from '#layers/ui/app/types/focus'
import type { CounterAction, CounterFocusTarget } from '../../types/counter'
import type { VisitQrDisplayModel } from '../../types/visitQr'

interface Props {
  amountText: string
  action: CounterAction | null
  issueLabel: string
  amountHint?: string
  amountPreview?: string
  pending: boolean
  amountErrorCode: 'invalidAmount' | null
  alertCode: DomainErrorCode | null
  programFailed: boolean
  display: VisitQrDisplayModel | null
  canSimulate: boolean
  focusRequest: FocusRequest<CounterFocusTarget> | null
}

interface Emits {
  amountInput: [value: string | number]
  issue: []
  cancel: []
  issueAnother: []
  print: []
  simulateClaim: []
  retryProgram: []
}

withDefaults(defineProps<Props>(), { amountHint: undefined, amountPreview: undefined })
const emit = defineEmits<Emits>()
</script>

<template>
  <PanelModule :title="$t('counter.visitQr.title')" class="print:bg-transparent print:shadow-none">
    <CounterVisitQrCard
      v-if="display"
      :display="display"
      :can-simulate="canSimulate"
      :focus-request="focusRequest"
      @print="emit('print')"
      @cancel="emit('cancel')"
      @issue-another="emit('issueAnother')"
      @simulate-claim="emit('simulateClaim')"
    />
    <CounterVisitQrIssueForm
      v-else
      :amount-text="amountText"
      :action="action"
      :issue-label="issueLabel"
      :amount-hint="amountHint"
      :amount-preview="amountPreview"
      :pending="pending"
      :amount-error-code="amountErrorCode"
      :focus-request="focusRequest"
      @amount-input="emit('amountInput', $event)"
      @issue="emit('issue')"
    />
    <CounterVisitQrFeedback :alert-code="alertCode" :program-failed="programFailed" @retry-program="emit('retryProgram')" />
  </PanelModule>
</template>
