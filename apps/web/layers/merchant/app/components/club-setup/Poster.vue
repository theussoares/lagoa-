<script setup lang="ts">
import type { CheckInPosterModel } from '../../types/poster'

interface Props {
  poster: CheckInPosterModel
}

defineProps<Props>()
</script>

<template>
  <!-- Cartaz impresso: sempre tinta escura em papel branco, também no tema escuro. -->
  <article class="mx-auto flex w-full max-w-[420px] flex-col items-center gap-5 rounded-(--radius-card) bg-white p-8 text-center text-black shadow-(--lagoa-shadow-card) print:max-w-none print:shadow-none">
    <p class="letreiro text-lg">{{ poster.brand }}</p>
    <div class="flex flex-col gap-1">
      <h2 class="text-2xl leading-tight font-bold text-balance">{{ poster.shopName }}</h2>
      <p class="text-lg text-pretty">{{ poster.headline }}</p>
    </div>
    <svg :viewBox="`0 0 ${poster.qr.size} ${poster.qr.size}`" class="aspect-square w-full max-w-[280px]" role="img" :aria-label="poster.qrLabel" shape-rendering="crispEdges">
      <rect :width="poster.qr.size" :height="poster.qr.size" class="fill-white" />
      <path :d="poster.qr.d" fill="currentColor" />
    </svg>
    <p class="text-base text-pretty">{{ poster.instruction }}</p>
    <p class="flex flex-col gap-0.5">
      <span class="text-sm">{{ poster.codeLabel }}</span>
      <span class="tabular text-3xl font-bold tracking-[0.2em]">{{ poster.code }}</span>
    </p>
  </article>
</template>
