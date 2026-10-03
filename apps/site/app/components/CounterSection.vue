<script setup lang="ts">
const { t } = useI18n()

const POINTS = [
  { key: 'newCustomer', icon: 'i-ph-user-plus' },
  { key: 'byValue', icon: 'i-ph-receipt' },
  { key: 'checkIn', icon: 'i-ph-qr-code' },
] as const
</script>

<template>
  <section id="balcao" class="dark bg-(--lagoa-header) text-default">
    <div class="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-16 sm:py-24 sm:px-6 lg:gap-16 lg:py-32">
      <div v-reveal class="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end lg:gap-16">
        <SectionHeading :title="t('counter.title')" :lead="t('counter.lead')" />
        <ul class="flex flex-col">
          <li v-for="point in POINTS" :key="point.key" class="flex items-center gap-3 border-t border-(--lagoa-rule) py-4 text-toned">
            <UIcon :name="point.icon" class="size-6 shrink-0 text-(--color-lima-200)" aria-hidden="true" />
            {{ t(`counter.points.${point.key}`) }}
          </li>
        </ul>
      </div>

      <!-- Hidrata junto com a página: com hidratação tardia, o que se digitava antes
           aparecia no campo mas não chegava ao estado, e o botão ficava travado. -->
      <CounterDemo />
    </div>
  </section>
</template>
