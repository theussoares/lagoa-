<script setup lang="ts">
const { t } = useI18n()
const demo = reactive(useCounterDemo())
</script>

<template>
  <!-- touch-manipulation: toques rápidos nos botões não viram zoom de toque duplo no celular. -->
  <div v-reveal class="rounded-(--radius-card) bg-default shadow-(--lagoa-shadow-card) [&_button]:touch-manipulation">
    <header class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-(--lagoa-rule) px-4 py-4 sm:px-6">
      <p class="letreiro text-lg text-highlighted">{{ t('counter.panelTitle') }}</p>
      <p class="text-[0.9375rem] text-(--color-lima-200)">{{ t('counter.tryIt') }}</p>
    </header>

    <div class="grid gap-8 p-4 sm:p-6 md:grid-cols-2 lg:gap-12 lg:p-8">
      <CounterDemoGenerate
        v-model:mode="demo.mode"
        v-model:amount="demo.amount"
        :disabled="demo.stage !== 'idle'"
        :show-error="demo.showError"
        :focus-request="demo.focusRequest"
        @generate="demo.generate"
      />

      <div aria-live="polite" class="flex min-w-0 flex-col justify-center">
        <CounterDemoQr v-if="demo.stage === 'issued'" :qr="demo.qr" :code="demo.code" :focus-request="demo.focusRequest" @simulate="demo.simulate" />
        <CounterDemoReceipt v-else-if="demo.receipt" :receipt="demo.receipt" :focus-request="demo.focusRequest" @restart="demo.restart" />
        <p v-else class="grid min-h-28 place-items-center rounded-2xl border-[1.5px] border-dashed border-(--lagoa-slot) p-6 text-center text-muted md:min-h-56">
          {{ t('counter.demo.waiting') }}
        </p>
      </div>
    </div>
  </div>
</template>
