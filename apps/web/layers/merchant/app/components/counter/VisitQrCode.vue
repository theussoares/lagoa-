<script setup lang="ts">
import type { VisitQrDisplayModel } from '../../types/visitQr'

interface Props {
  display: VisitQrDisplayModel
}

defineProps<Props>()
</script>

<template>
  <!-- Impresso ou na tela: sempre tinta escura em papel branco, também no tema escuro. -->
  <figure class="mx-auto flex w-full max-w-[280px] flex-col items-center gap-2 rounded-(--radius-card) bg-white p-3 text-center text-black print:max-w-none">
    <svg :viewBox="`0 0 ${display.qr.size} ${display.qr.size}`" class="aspect-square w-full" role="img" :aria-label="display.qrLabel" shape-rendering="crispEdges">
      <rect :width="display.qr.size" :height="display.qr.size" class="fill-white" />
      <path :d="display.qr.d" fill="currentColor" />
    </svg>
    <figcaption class="flex flex-col gap-0.5">
      <span class="text-sm">{{ $t('counter.visitQr.codeLabel') }}</span>
      <span class="tabular text-3xl font-bold tracking-[0.2em]">{{ display.visitCode }}</span>
    </figcaption>
  </figure>
</template>
