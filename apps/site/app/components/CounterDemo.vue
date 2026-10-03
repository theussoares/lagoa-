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
const phone = useTemplateRef<{ focus: () => void }>('phone')

const parsedPhone = computed(() => parsePhoneNumber(digits.value))
const canGive = computed(() => parsedPhone.value.ok && receipt.value === null)

function typeDigit(digit: string): void {
  digits.value = phoneDigits(digits.value + digit).slice(0, PHONE_LENGTH)
}

function giveStamp(): void {
  if (!parsedPhone.value.ok) return
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
    <header class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-(--lagoa-rule) px-6 py-4">
      <p class="letreiro text-lg text-highlighted">{{ t('counter.panelTitle') }}</p>
      <p class="text-[0.9375rem] text-(--color-lima-200)">{{ t('counter.tryIt') }}</p>
    </header>

    <div class="grid gap-8 p-6 md:grid-cols-2 lg:gap-12 lg:p-8">
      <div class="flex flex-col gap-4">
        <PhoneDisplay ref="phone" v-model="digits" :label="t('counter.phoneLabel')" :hint="t('counter.phoneHint')" :disabled="receipt !== null" @clear="digits = ''" />
        <CounterKeypad
          :labels="{ clear: t('counter.keypadClear'), backspace: t('counter.keypadBackspace') }"
          :disabled="receipt !== null"
          @digit="typeDigit"
          @backspace="digits = digits.slice(0, -1)"
          @clear="digits = ''"
        />
      </div>

      <div class="flex flex-col justify-between gap-6">
        <div aria-live="polite" class="flex min-h-56 flex-col justify-center">
          <div v-if="receipt" class="flex flex-col items-start gap-5">
            <RewardSeal :label="t('counter.seal')" pressed />
            <LaunchReceipt :receipt="receipt" icon="i-ph-scissors-bold" />
          </div>
          <p v-else class="grid min-h-56 place-items-center rounded-2xl border-[1.5px] border-dashed border-(--lagoa-slot) p-6 text-center text-muted">
            {{ t('counter.waiting') }}
          </p>
        </div>

        <UButton v-if="receipt" size="xl" block color="neutral" variant="outline" icon="i-ph-arrow-counter-clockwise" @click="restart">
          {{ t('counter.restart') }}
        </UButton>
        <UButton v-else size="xl" block icon="i-ph-seal-check" :disabled="!canGive" @click="giveStamp">
          {{ t('counter.give') }}
        </UButton>
      </div>
    </div>
  </div>
</template>
