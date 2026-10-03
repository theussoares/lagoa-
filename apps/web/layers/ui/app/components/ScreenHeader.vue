<script setup lang="ts">
interface Props {
  title: string
  lead?: string
  /** Foto da cidade; sem ela a faixa fica na cor lisa e a tela segue legível. */
  image?: string
  headingId?: string
}

defineProps<Props>()
</script>

<template>
  <!-- Sangra até a borda do layout (px-5 + safe-area) e deixa 40px para o card herói subir. -->
  <header
    class="relative -mx-5 -mt-[max(env(safe-area-inset-top),1.25rem)] overflow-hidden rounded-b-(--radius-header) bg-(--lagoa-header) px-5 pt-[max(env(safe-area-inset-top),1.25rem)] pb-16 text-white"
  >
    <img v-if="image" :src="image" alt="" class="slow-pan absolute inset-0 size-full object-cover" />
    <div v-if="image" class="absolute inset-0 bg-(image:--lagoa-scrim)" aria-hidden="true" />
    <!-- Halo do acento: a luz da água no canto, só cor, sem textura. -->
    <div class="pointer-events-none absolute -top-16 -right-12 size-56 rounded-full bg-(--color-lima-400) opacity-30 blur-3xl" aria-hidden="true" />
    <div class="relative flex flex-col gap-3 pt-4">
      <div class="flex items-start justify-between gap-4">
        <div class="flex flex-col gap-1">
          <h1 :id="headingId" class="font-display text-[2.25rem] leading-none font-bold text-balance">{{ title }}</h1>
          <p v-if="lead" class="max-w-[30ch] text-pretty text-white/90">{{ lead }}</p>
        </div>
        <slot name="actions" />
      </div>
      <slot />
    </div>
  </header>
</template>
