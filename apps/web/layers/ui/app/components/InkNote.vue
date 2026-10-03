<script setup lang="ts">
import type { InkNoteAction, InkNoteTone } from '../types/note'

interface Props {
  description: string
  title?: string
  tone?: InkNoteTone
  icon?: string
  actions?: readonly InkNoteAction[]
  /** Erro que acabou de acontecer: o leitor de tela anuncia na hora. */
  live?: boolean
}

const props = withDefaults(defineProps<Props>(), { tone: 'ink', icon: undefined, title: undefined, actions: () => [], live: false })

const TONE_CLASS: Readonly<Record<InkNoteTone, string>> = {
  ink: 'text-primary',
  warning: 'text-warning',
  error: 'text-error',
  success: 'text-success',
  pencil: 'text-muted',
}

const DEFAULT_ICON: Readonly<Record<InkNoteTone, string>> = {
  ink: 'i-ph-info',
  warning: 'i-ph-hourglass-medium',
  error: 'i-ph-warning-circle',
  success: 'i-ph-check',
  pencil: 'i-ph-pencil-simple-line',
}
</script>

<template>
  <!-- Anotação na margem da caderneta: recorte pautado com um carimbinho, não caixa colorida. -->
  <div
    :role="live ? 'alert' : undefined"
    class="flex items-start gap-3.5 border-y border-dashed border-(--lagoa-slot)/60 py-3.5"
  >
    <span
      aria-hidden="true"
      class="mt-0.5 flex size-9 shrink-0 -rotate-6 items-center justify-center rounded-full ring-[1.5px] ring-current outline-1 outline-offset-2 outline-current/50"
      :class="TONE_CLASS[props.tone]"
    >
      <UIcon :name="props.icon ?? DEFAULT_ICON[props.tone]" class="size-[1.125rem]" />
    </span>
    <div class="flex min-w-0 flex-1 flex-col gap-1">
      <p v-if="title" class="type-tag" :class="TONE_CLASS[props.tone]">{{ title }}</p>
      <p class="text-pretty text-default">{{ description }}</p>
      <div v-if="actions.length > 0" class="mt-2 flex flex-wrap gap-2">
        <UButton
          v-for="action in actions"
          :key="action.label"
          :to="action.to"
          variant="outline"
          color="neutral"
          size="lg"
          :label="action.label"
          @click="action.onClick?.()"
        />
      </div>
    </div>
  </div>
</template>
