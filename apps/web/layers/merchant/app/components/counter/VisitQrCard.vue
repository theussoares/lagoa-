<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import type { FocusRequest } from '#layers/ui/app/types/focus'
import type { CounterFocusTarget } from '../../types/counter'
import type { VisitQrDisplayModel } from '../../types/visitQr'

interface Props {
  display: VisitQrDisplayModel
  canSimulate: boolean
  focusRequest: FocusRequest<CounterFocusTarget> | null
}

interface Emits {
  print: []
  cancel: []
  issueAnother: []
  simulateClaim: []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const issueAnotherButton = useTemplateRef<ComponentPublicInstance>('issueAnotherButton')
useFocusTarget(() => props.focusRequest, 'issueVisitQr', () => focusElement(issueAnotherButton.value))
</script>

<template>
  <div class="flex flex-col gap-4">
    <CounterVisitQrCode v-if="display.status === 'active'" :display="display" />
    <div class="flex flex-col items-center gap-1 text-center print:hidden">
      <p role="status" class="letreiro text-xl" :class="display.status === 'claimed' ? 'text-success' : 'text-highlighted'">
        {{ display.statusLabel }}
      </p>
      <p v-if="display.countdown" class="tabular text-toned">{{ display.countdown }}</p>
    </div>
    <InkNote v-if="display.refusal" tone="warning" icon="i-ph-hourglass-medium" :description="display.refusal" class="print:hidden" />
    <CounterVisitQrReceipt v-if="display.receipt" :key="display.receipt.key" :receipt="display.receipt.model" icon="i-ph-check-fat-bold" class="print:hidden" />

    <div class="flex flex-wrap gap-2 print:hidden">
      <template v-if="display.status === 'active'">
        <UButton variant="outline" color="neutral" icon="i-ph-printer" :label="$t('counter.visitQr.print')" @click="emit('print')" />
        <UButton variant="outline" color="neutral" icon="i-ph-x" :label="$t('counter.visitQr.cancel')" @click="emit('cancel')" />
        <UButton v-if="canSimulate" variant="ghost" color="neutral" :label="$t('counter.visitQr.simulateClaim')" @click="emit('simulateClaim')" />
      </template>
      <UButton v-else ref="issueAnotherButton" block icon="i-ph-arrow-clockwise" :label="$t('counter.visitQr.issueAnother')" @click="emit('issueAnother')" />
    </div>
  </div>
</template>
