<script setup lang="ts">
import { formatPhoneDraft, formatPhoneInput, phoneDigits } from '#shared/utils/phone'

interface Props {
  /** Só os dígitos digitados até agora. */
  modelValue: string
  label: string
  hint?: string
  error?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), { hint: undefined, error: undefined, disabled: false })
const emit = defineEmits<{ 'update:modelValue': [digits: string]; clear: [] }>()

const inputId = useId()
const hintId = useId()
const errorId = useId()
const input = useTemplateRef<HTMLInputElement>('input')

const typed = computed(() => formatPhoneInput(props.modelValue))
// formatPhoneInput é sempre prefixo de formatPhoneDraft: o resto é a máscara ainda vazia.
const rest = computed(() => formatPhoneDraft(props.modelValue).slice(typed.value.length))
const describedBy = computed(() => [props.hint && hintId, props.error && errorId].filter(Boolean).join(' ') || undefined)

function onInput(event: Event): void {
  if (!(event.target instanceof HTMLInputElement)) return
  const digits = phoneDigits(event.target.value)
  emit('update:modelValue', digits)
  // Letra ou símbolo não muda os dígitos; o campo volta para a máscara.
  event.target.value = formatPhoneInput(digits)
}

function caretToEnd(): void {
  const element = input.value
  if (element === null) return
  element.setSelectionRange(element.value.length, element.value.length)
}

function focus(): void {
  input.value?.focus()
  caretToEnd()
}

defineExpose({ focus })
</script>

<template>
  <div class="flex flex-col gap-2">
    <label :for="inputId" class="text-[0.9375rem] font-medium text-highlighted">{{ label }}</label>
    <div
      class="group relative rounded-(--ui-radius) border bg-default px-4 py-3.5 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary"
      :class="[error ? 'border-error' : 'border-accented', disabled && 'opacity-60']"
    >
      <p class="tabular text-[2.75rem] leading-none font-bold whitespace-nowrap [font-stretch:90%]" aria-hidden="true">
        <span class="text-highlighted">{{ typed }}</span>
        <span class="mx-px hidden h-[0.8em] w-[3px] translate-y-[0.06em] bg-primary align-baseline group-focus-within:inline-block motion-safe:animate-pulse" />
        <span class="text-(--lagoa-slot)">{{ rest }}</span>
      </p>
      <!-- Campo real por cima do visor: teclado físico, colar e leitor de tela funcionam como num input comum.
           inputmode="none" segura o teclado virtual no tablet do balcão, que usa o teclado da tela. -->
      <input
        :id="inputId"
        ref="input"
        :value="typed"
        type="tel"
        inputmode="none"
        autocomplete="off"
        :disabled="disabled"
        :aria-invalid="error ? true : undefined"
        :aria-describedby="describedBy"
        class="absolute inset-0 size-full cursor-text opacity-0"
        @input="onInput"
        @focus="caretToEnd"
        @click="caretToEnd"
        @keydown.esc.prevent="emit('clear')"
      >
    </div>
    <p v-if="error" :id="errorId" class="flex items-start gap-1.5 text-[0.9375rem] text-error">
      <UIcon name="i-ph-warning-circle" class="mt-0.5 size-4 shrink-0" aria-hidden="true" />{{ error }}
    </p>
    <p v-else-if="hint" :id="hintId" class="text-[0.9375rem] text-muted">{{ hint }}</p>
  </div>
</template>
