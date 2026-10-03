<script setup lang="ts">
import type { Birthday } from '#shared/schemas/common'
import { dayOptions, joinBirthday, monthOptions, splitBirthday } from '../../utils/birthdayModel'

export interface BirthdayFormLabels {
  readonly legend: string
  readonly help: string
  readonly day: string
  readonly month: string
  readonly placeholderDay: string
  readonly placeholderMonth: string
  readonly partial: string
  /** "Você pode trocar a data a partir de 2 de out." quando a troca está travada. */
  readonly locked: string | null
  readonly save: string
  readonly remove: string
  readonly removeTitle: string
  readonly removeDescription: string
  readonly removeConfirm: string
  readonly removeCancel: string
}

export type BirthdayAction = 'save' | 'remove'

interface Props {
  birthday: Birthday | null
  labels: BirthdayFormLabels
  /** Qual ação está indo para o servidor agora. */
  pending: BirthdayAction | null
}

interface Emits {
  save: [birthday: Birthday]
  remove: []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const day = ref<number | null>(null)
const month = ref<number | null>(null)
const confirmingRemoval = ref(false)
watch(
  () => props.birthday,
  (saved) => {
    const parts = splitBirthday(saved)
    day.value = parts.day
    month.value = parts.month
  },
  { immediate: true },
)
watch(
  () => props.pending,
  (current, previous) => {
    if (previous === 'remove' && current === null) confirmingRemoval.value = false
  },
)

const months = monthOptions()
const days = computed(() => dayOptions(month.value))
const chosen = computed(() => joinBirthday({ day: day.value, month: month.value }))
const changed = computed(() => chosen.value !== null && chosen.value !== props.birthday)
const partial = computed(() => (day.value === null) !== (month.value === null))
const busy = computed(() => props.pending !== null)
const frozen = computed(() => busy.value || props.labels.locked !== null)

function toNumber(value: unknown): number | null {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function setMonth(value: unknown): void {
  month.value = toNumber(value)
  // 31 de janeiro → abril: o dia que não existe no mês novo sai, em vez de virar data inválida.
  if (day.value !== null && month.value !== null && joinBirthday({ day: day.value, month: month.value }) === null) day.value = null
}

function submit(): void {
  if (changed.value && chosen.value !== null) emit('save', chosen.value)
}
</script>

<template>
  <form class="flex flex-col gap-4" novalidate @submit.prevent="submit">
    <fieldset :disabled="frozen" class="flex flex-col gap-3">
      <legend class="mb-1 text-base font-medium text-highlighted">{{ labels.legend }}</legend>
      <p class="text-base text-muted">{{ labels.help }}</p>
      <div class="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3">
        <UFormField :label="labels.day" name="birthdayDay">
          <USelect
            :model-value="day === null ? undefined : String(day)"
            :items="days"
            :placeholder="labels.placeholderDay"
            size="xl"
            :disabled="frozen"
            :ui="{ base: 'min-h-11' }"
            class="w-full"
            @update:model-value="day = toNumber($event)"
          />
        </UFormField>
        <UFormField :label="labels.month" name="birthdayMonth">
          <USelect
            :model-value="month === null ? undefined : String(month)"
            :items="months"
            :placeholder="labels.placeholderMonth"
            size="xl"
            :disabled="frozen"
            :ui="{ base: 'min-h-11' }"
            class="w-full"
            @update:model-value="setMonth"
          />
        </UFormField>
      </div>
      <p v-if="labels.locked" class="flex items-start gap-2 text-base text-toned">
        <UIcon name="i-ph-lock-simple" class="mt-1 size-4 shrink-0" aria-hidden="true" />{{ labels.locked }}
      </p>
      <p v-else-if="partial" class="text-base text-toned" aria-live="polite">{{ labels.partial }}</p>
    </fieldset>
    <div class="flex flex-wrap items-center gap-3">
      <UButton
        v-if="labels.locked === null"
        type="submit"
        size="lg"
        :label="labels.save"
        :loading="pending === 'save'"
        :disabled="!changed || busy"
      />
      <UButton
        v-if="birthday !== null"
        variant="ghost"
        color="neutral"
        size="lg"
        :label="labels.remove"
        :disabled="busy"
        @click="confirmingRemoval = true"
      />
    </div>

    <UDrawer v-model:open="confirmingRemoval" :title="labels.removeTitle" :description="labels.removeDescription">
      <template #footer>
        <UButton color="error" size="xl" block :label="labels.removeConfirm" :loading="pending === 'remove'" @click="emit('remove')" />
        <UButton variant="outline" color="neutral" size="xl" block :label="labels.removeCancel" :disabled="busy" @click="confirmingRemoval = false" />
      </template>
    </UDrawer>
  </form>
</template>
