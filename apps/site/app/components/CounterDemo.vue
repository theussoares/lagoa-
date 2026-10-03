<script setup lang="ts">
import type { LaunchReceiptModel } from '#layers/ui/app/types/counter'
import { maskPhone, parsePhoneNumber, phoneDigits } from '#shared/utils/phone'

/**
 * Demonstração do Balcão. Fica só na memória da página: o número digitado não é
 * enviado, salvo nem registrado em lugar nenhum (é celular, dado pessoal).
 */
const { t } = useI18n()

const TOTAL_SLOTS = 10
const PHONE_LENGTH = 11

const digits = ref('')
const receipt = ref<LaunchReceiptModel | null>(null)
const showError = ref(false)
const phone = useTemplateRef<{ focus: () => void }>('phone')

const parsedPhone = computed(() => parsePhoneNumber(digits.value))
// O erro só aparece depois de tentar (ou com os 11 números digitados), nunca no meio da digitação.
const phoneError = computed(() => {
  if (parsedPhone.value.ok) return undefined
  return showError.value || digits.value.length === PHONE_LENGTH ? t('counter.phoneError') : undefined
})

watch(digits, () => {
  showError.value = false
})

function typeDigit(digit: string): void {
  digits.value = phoneDigits(digits.value + digit).slice(0, PHONE_LENGTH)
}

function giveStamp(): void {
  if (!parsedPhone.value.ok) {
    showError.value = true
    phone.value?.focus()
    return
  }
  receipt.value = {
    tone: 'reward',
    tilt: -6,
    title: t('counter.rewardTitle', { phone: maskPhone(parsedPhone.value.value) }),
    detail: t('counter.rewardDetail'),
    body: { kind: 'slots', slots: sampleSlots(TOTAL_SLOTS, TOTAL_SLOTS, 350) },
  }
}

function restart(): void {
  receipt.value = null
  digits.value = ''
  phone.value?.focus()
}
</script>

<template>
  <div v-reveal class="rounded-(--radius-card) bg-default shadow-(--lagoa-shadow-card)">
    <header class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-(--lagoa-rule) px-4 py-4 sm:px-6">
      <p class="letreiro text-lg text-highlighted">{{ t('counter.panelTitle') }}</p>
      <p class="text-[0.9375rem] text-(--color-lima-200)">{{ t('counter.tryIt') }}</p>
    </header>

    <div class="grid gap-8 p-4 sm:p-6 md:grid-cols-2 lg:gap-12 lg:p-8">
      <!-- O visor do app usa 44px; no celular estreito ele encolhe para caber na coluna. -->
      <div class="flex min-w-0 flex-col gap-4 max-sm:[&_p.tabular]:text-[2.125rem]">
        <PhoneDisplay ref="phone" v-model="digits" :label="t('counter.phoneLabel')" :hint="t('counter.phoneHint')" :error="phoneError" :disabled="receipt !== null" @clear="digits = ''" />
        <CounterKeypad
          :labels="{ clear: t('counter.keypadClear'), backspace: t('counter.keypadBackspace') }"
          :disabled="receipt !== null"
          @digit="typeDigit"
          @backspace="digits = digits.slice(0, -1)"
          @clear="digits = ''"
        />
      </div>

      <div class="flex min-w-0 flex-col gap-6">
        <div aria-live="polite" class="flex flex-1 flex-col justify-center">
          <div v-if="receipt" class="flex flex-col items-start gap-5">
            <RewardSeal :label="t('counter.seal')" pressed />
            <LaunchReceipt :receipt="receipt" icon="i-ph-scissors-bold" />
          </div>
          <p v-else class="grid min-h-28 flex-1 place-items-center md:min-h-56 rounded-2xl border-[1.5px] border-dashed border-(--lagoa-slot) p-6 text-center text-muted">
            {{ t('counter.waiting') }}
          </p>
        </div>

        <!-- No celular o botão fica logo abaixo do teclado; o canhoto aparece depois dele. -->
        <UButton v-if="receipt" class="max-md:order-first" size="xl" block color="neutral" variant="outline" icon="i-ph-arrow-counter-clockwise" @click="restart">
          {{ t('counter.restart') }}
        </UButton>
        <UButton v-else class="max-md:order-first" size="xl" block icon="i-ph-seal-check" @click="giveStamp">
          {{ t('counter.give') }}
        </UButton>
      </div>
    </div>
  </div>
</template>
