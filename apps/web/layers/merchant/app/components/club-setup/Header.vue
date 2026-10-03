<script setup lang="ts">
import type { SetupStepItem } from '../../types/clubSetup'

interface Props {
  shopName: string
  steps: readonly SetupStepItem[]
}

defineProps<Props>()
</script>

<template>
  <header class="flex flex-wrap items-center justify-between gap-4 border-b border-(--lagoa-rule) bg-default px-8 py-4 print:hidden">
    <div class="flex items-baseline gap-4">
      <p class="letreiro text-xl text-highlighted">{{ $t('app.name') }}</p>
      <p class="text-[0.9375rem] text-muted">
        {{ shopName ? $t('clubSetup.creatingFor', { shop: shopName }) : $t('clubSetup.creating') }}
      </p>
    </div>
    <ClubSetupSteps :steps="steps" />
  </header>
</template>
