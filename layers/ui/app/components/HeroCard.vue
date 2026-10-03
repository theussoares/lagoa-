<script setup lang="ts">
interface Props {
  badge: string
  title: string
  description: string
  /** "0 de 3 visitadas" */
  progress: string
  filled: number
  total: number
  /** "Até 22 de out." */
  note?: string | null
  /** Ícone grande à direita; decorativo. */
  icon?: string
}

defineProps<Props>()

const titleId = useId()
</script>

<template>
  <!-- O único destaque da tela: sobe 40px sobre a faixa do cabeçalho. -->
  <article
    :aria-labelledby="titleId"
    class="rise relative -mt-10 flex flex-col gap-4 overflow-hidden rounded-(--radius-card) bg-default p-5 shadow-(--lagoa-shadow-card)"
  >
    <span
      v-if="icon"
      class="pop-tilt absolute top-5 right-5 grid size-14 place-items-center rounded-2xl bg-(--color-lima-100) text-(--color-lima-700) dark:bg-(--color-lima-900) dark:text-(--color-lima-200)"
      aria-hidden="true"
    >
      <UIcon :name="icon" class="size-8" />
    </span>
    <div class="relative flex flex-col items-start gap-2">
      <span class="eyebrow-tag inline-flex items-center gap-1.5 rounded-full bg-(--color-sol-100) px-3 py-1.5 text-(--color-sol-800) dark:bg-(--color-sol-900) dark:text-(--color-sol-200)">
        <UIcon name="i-ph-star-fill" class="size-3.5" aria-hidden="true" />
        {{ badge }}
      </span>
      <h2 :id="titleId" class="font-display max-w-[14ch] text-[1.75rem] leading-[1.05] font-bold text-balance text-highlighted">{{ title }}</h2>
      <p class="max-w-[32ch] text-pretty text-toned">{{ description }}</p>
    </div>
    <div class="relative flex flex-col gap-2">
      <SlotRow :filled="filled" :total="total" />
      <div class="flex items-center justify-between gap-3 text-base">
        <span class="tabular font-semibold text-primary">{{ progress }}</span>
        <span v-if="note" class="tabular text-muted">{{ note }}</span>
      </div>
    </div>
    <slot />
  </article>
</template>
