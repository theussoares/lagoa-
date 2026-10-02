<script setup lang="ts">
interface Props {
  title: string
  /** O que está valendo, numa linha: aparece com a seção fechada. */
  summary: string
}

defineProps<Props>()
const open = defineModel<boolean>('open', { required: true })

const headingId = useId()
const panelId = useId()
</script>

<template>
  <!-- Folha dobrada da caderneta: fechada mostra só o resumo; os campos continuam no formulário. -->
  <section :aria-labelledby="headingId" class="rounded-(--radius-card) bg-default shadow-(--lagoa-shadow-card)">
    <h2 :id="headingId" class="m-0">
      <button
        type="button"
        class="group flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left"
        :class="{ 'border-b border-(--lagoa-rule)': open }"
        :aria-expanded="open"
        :aria-controls="panelId"
        @click="open = !open"
      >
        <span class="flex min-w-0 flex-1 flex-col gap-1">
          <span class="letreiro text-base text-highlighted">{{ title }}</span>
          <span v-if="!open" class="text-[0.9375rem] font-normal text-toned">{{ summary }}</span>
        </span>
        <span
          aria-hidden="true"
          class="flex size-9 shrink-0 items-center justify-center rounded-full text-toned ring-1 ring-(--lagoa-rule) transition-[color,transform] duration-(--lagoa-dur-base) motion-reduce:transition-none group-hover:text-highlighted"
          :class="{ 'rotate-180': open }"
        >
          <UIcon name="i-ph-caret-down" class="size-4" />
        </span>
      </button>
    </h2>
    <div v-show="open" :id="panelId" class="p-4">
      <slot />
    </div>
  </section>
</template>
