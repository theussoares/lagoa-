<script setup lang="ts">
import type { BirthdayFormLabels, BirthdayAction } from '../../types/profile'
import type { Birthday } from '#shared/schemas/common'
import { dayOptions, joinBirthday, monthOptions, splitBirthday } from '../../utils/birthdayModel'

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

/** `undefined` = ainda não mexeu: vale a data salva. Derivado (não `watch immediate`) para sair certo já no SSR. */
const pickedDay = ref<number | null | undefined>(undefined)
const pickedMonth = ref<number | null | undefined>(undefined)
const saved = computed(() => splitBirthday(props.birthday))
const day = computed(() => (pickedDay.value === undefined ? saved.value.day : pickedDay.value))
const month = computed(() => (pickedMonth.value === undefined ? saved.value.month : pickedMonth.value))
const confirmingRemoval = ref(false)
watch(
  () => props.birthday,
  () => {
    pickedDay.value = undefined
    pickedMonth.value = undefined
  },
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
const notice = computed(() => props.labels.locked !== null || partial.value)
const frozen = computed(() => busy.value || props.labels.locked !== null)

function toNumber(value: unknown): number | null {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function setMonth(value: unknown): void {
  pickedMonth.value = toNumber(value)
  // 31 de janeiro → abril: o dia que não existe no mês novo sai, em vez de virar data inválida.
  if (day.value !== null && month.value !== null && joinBirthday({ day: day.value, month: month.value }) === null) pickedDay.value = null
}

function submit(): void {
  if (changed.value && chosen.value !== null) emit('save', chosen.value)
}
</script>

<template>
  <form class="flex flex-col gap-4" novalidate @submit.prevent="submit">
    <fieldset :disabled="frozen" class="flex flex-col gap-3" :aria-describedby="notice ? 'birthday-help birthday-notice' : 'birthday-help'">
      <legend class="mb-1 text-base font-medium text-highlighted">{{ labels.legend }}</legend>
      <p id="birthday-help" class="text-base text-muted">{{ labels.help }}</p>
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
            @update:model-value="pickedDay = toNumber($event)"
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
      <p v-if="notice" id="birthday-notice" role="status" class="flex items-start gap-2 text-base text-toned">
        <UIcon v-if="labels.locked" name="i-ph-lock-simple" class="mt-1 size-4 shrink-0" aria-hidden="true" />{{ labels.locked ?? labels.partial }}
      </p>
    </fieldset>
    <div class="flex flex-wrap items-center gap-3">
      <ActionButton
        v-if="labels.locked === null"
        role="primary"
        type="submit"
        size="lg"
        :label="labels.save"
        :loading="pending === 'save'"
        :disabled="!changed || busy"
      />
      <ActionButton
        v-if="birthday !== null"
        role="danger"
        :label="labels.remove"
        :disabled="busy"
        @click="confirmingRemoval = true"
      />
    </div>

    <UDrawer v-model:open="confirmingRemoval" :title="labels.removeTitle" :description="labels.removeDescription">
      <template #footer>
        <ActionButton role="dangerConfirm" size="xl" block :label="labels.removeConfirm" :loading="pending === 'remove'" @click="emit('remove')" />
        <ActionButton role="secondary" size="xl" block :label="labels.removeCancel" :disabled="busy" @click="confirmingRemoval = false" />
      </template>
    </UDrawer>
  </form>
</template>
