<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import type { CounterDemoFocusTarget } from '../types/counterDemo'
import type { FocusRequest } from '#layers/ui/app/types/focus'
import type { QrPath } from '#layers/ui/app/types/qr'
import { VISIT_QR_TTL_MINUTES } from '#shared/constants/domain'

interface Props {
  qr: QrPath
  code: string
  focusRequest: FocusRequest<CounterDemoFocusTarget> | null
}

interface Emits {
  simulate: []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const { t } = useI18n()

const simulateButton = useTemplateRef<ComponentPublicInstance>('simulateButton')
useFocusTarget(() => props.focusRequest, 'simulate', () => focusElement(simulateButton.value))
</script>

<template>
  <div class="flex flex-col items-center gap-5">
    <!-- Sempre tinta escura em papel branco, como o QR do Balcão. O desenho é só ilustração: fica fora da árvore de acessibilidade. -->
    <figure class="flex w-full max-w-[15rem] flex-col items-center gap-2 rounded-(--radius-card) bg-white p-3 text-center text-black">
      <svg :viewBox="`0 0 ${qr.size} ${qr.size}`" class="aspect-square w-full" aria-hidden="true" shape-rendering="crispEdges">
        <rect :width="qr.size" :height="qr.size" class="fill-white" />
        <path :d="qr.d" fill="currentColor" />
      </svg>
      <figcaption class="flex flex-col gap-0.5">
        <span class="text-sm">{{ t('counter.demo.codeLabel') }}</span>
        <span class="sr-only">{{ t('counter.demo.codeLabelSpoken', { code: code.split('').join(' ') }) }}</span>
        <span class="tabular text-3xl font-bold tracking-[0.2em]" aria-hidden="true">{{ code }}</span>
      </figcaption>
    </figure>
    <p class="flex items-center gap-2 text-center text-[0.9375rem] text-muted">
      <UIcon name="i-ph-timer" class="size-5 shrink-0" aria-hidden="true" />
      {{ t('counter.demo.validity', { minutes: VISIT_QR_TTL_MINUTES }) }}
    </p>
    <p class="text-sm text-muted">{{ t('counter.demo.qrCaption') }}</p>
    <UButton ref="simulateButton" size="xl" block color="neutral" variant="outline" icon="i-ph-device-mobile-camera" @click="emit('simulate')">
      {{ t('counter.demo.simulate') }}
    </UButton>
  </div>
</template>
