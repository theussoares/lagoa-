<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import { CHECK_IN_CODE_LENGTH, CHECK_IN_LINK_PARAM } from '#shared/constants/domain'
import { seenBalanceBefore, toCheckInEarnedModel, toCheckInNotice } from '../utils/checkInModel'

definePageMeta({ path: '/check-in', layout: 'customer', middleware: 'customer-auth' })

const STAMP_VIBRATION_MS = 15
const VIEWFINDER_TEXT = {
  busy: 'checkIn.submitting',
  scanning: 'checkIn.cameraScanning',
  starting: 'checkIn.cameraStarting',
} as const

const { t } = useI18n()
const translate = useTranslate()
const route = useRoute()
const router = useRouter()
useHead({ title: () => `${t('checkIn.pageTitle')} · ${t('app.name')}` })

const { signOut } = useCustomerSession()
const { state, submit, retry, reset } = useCheckIn()
const scanner = useQrScanner((content) => void submit(content, 'camera'))
const seenStamps = useSeenStamps()
const mockCode = useMockCheckInCode()

const mode = ref<'scan' | 'type'>('scan')
const cameraIssue = ref<'denied' | 'unavailable' | null>(null)
const code = ref<string[]>([])
const viewfinder = useTemplateRef<{ video: HTMLVideoElement | null }>('viewfinder')
const codeField = useTemplateRef<ComponentPublicInstance>('codeField')
const earnedHeading = useTemplateRef<HTMLHeadingElement>('earnedHeading')

// Link do QR aberto pela câmera do celular: faz o check-in direto e tira o código da URL,
// para recarregar a página não tentar de novo.
const linkCode = route.query[CHECK_IN_LINK_PARAM]
if (typeof linkCode === 'string') {
  void router.replace({ query: {} })
  void submit(linkCode, 'link')
}

const shouldScan = computed(() => mode.value === 'scan' && state.value.status === 'idle')
watch(
  [shouldScan, () => viewfinder.value?.video],
  ([scan, video]) => {
    if (scan && video) void scanner.start(video)
    else if (!scan) scanner.stop()
  },
  { immediate: true, flush: 'post' },
)
watch(scanner.status, (status) => {
  if (status !== 'denied' && status !== 'unavailable') return
  cameraIssue.value = status
  mode.value = 'type'
})

const viewfinderStatus = computed<keyof typeof VIEWFINDER_TEXT>(() => {
  if (state.value.status === 'submitting') return 'busy'
  return scanner.status.value === 'scanning' ? 'scanning' : 'starting'
})
const viewfinderText = computed(() => t(VIEWFINDER_TEXT[viewfinderStatus.value]))

const notice = computed(() => {
  if (state.value.status !== 'error') return null
  return toCheckInNotice(state.value.error, state.value.source, new Date(), translate)
})
const codeError = computed(() => {
  const current = state.value
  return current.status === 'error' && current.source === 'typed' && current.error.code === 'invalidShopQr' ? t('checkIn.invalidCode') : undefined
})
const typing = computed(() => state.value.status === 'submitting' && state.value.source === 'typed')

const earned = computed(() => (state.value.status === 'earned' ? state.value : null))
const earnedCard = computed(() => {
  if (!earned.value?.card) return null
  return toStampCardModel(earned.value.card, {
    t: translate,
    seenBalance: seenBalanceBefore(earned.value.result),
    formatDate: formatShortDate,
  })
})
const earnedText = computed(() =>
  earned.value ? toCheckInEarnedModel(earned.value.result, earnedCard.value?.summary ?? null, new Date(), translate) : null,
)

watch(earned, async (current) => {
  if (current === null) return
  // A batida acontece aqui; a carteira não repete.
  if (current.card) seenStamps.remember({ [current.card.id]: current.card.balance })
  navigator.vibrate?.(STAMP_VIBRATION_MS)
  await nextTick()
  earnedHeading.value?.focus()
})

watch(state, async (current) => {
  if (current.status !== 'error') return
  if (current.error.code === 'unauthorized') {
    void signOut()
    return
  }
  if (current.source !== 'typed') return
  code.value = []
  await nextTick()
  const root: unknown = codeField.value?.$el
  if (root instanceof HTMLElement) root.querySelector('input')?.focus()
})

function switchToCamera(): void {
  cameraIssue.value = null
  reset()
  mode.value = 'scan'
}

function submitTyped(): void {
  void submit(code.value.join(''), 'typed')
}

function typeCode(): void {
  reset()
  mode.value = 'type'
}

function recover(): void {
  if (notice.value?.recovery === 'retry') void retry()
  else switchToCamera()
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <p class="sr-only" aria-live="polite">{{ earnedText?.announcement ?? '' }}</p>

    <section v-if="earned && earnedText" class="flex flex-col gap-6" aria-labelledby="earned-title">
      <header class="flex flex-col gap-1 pt-2">
        <h1
          id="earned-title"
          ref="earnedHeading"
          tabindex="-1"
          class="text-[1.75rem] leading-[1.15] font-bold text-highlighted [font-stretch:90%] focus:outline-none"
        >
          {{ earnedText.title }}
        </h1>
        <p class="text-toned">{{ earnedText.lead }}</p>
      </header>

      <StampCard v-if="earnedCard" :card="earnedCard" />

      <p class="text-[0.9375rem] text-muted">{{ earnedText.next }}</p>

      <div class="flex flex-col gap-3">
        <UButton
          v-if="earned.result.card.rewardReady"
          :to="`/premios/${earned.result.card.cardId}`"
          color="secondary"
          size="xl"
          block
          icon="i-ph-gift"
          :label="t('checkIn.earned.redeem')"
        />
        <UButton
          to="/carteira"
          size="xl"
          block
          :variant="earned.result.card.rewardReady ? 'outline' : 'solid'"
          :color="earned.result.card.rewardReady ? 'neutral' : 'primary'"
          :label="t('checkIn.toWallet')"
        />
      </div>
    </section>

    <template v-else>
      <header class="flex flex-col gap-2">
        <h1 class="text-[1.75rem] leading-[1.15] font-bold text-highlighted [font-stretch:90%]">{{ t('checkIn.title') }}</h1>
        <p v-if="!notice" class="text-pretty text-toned">{{ mode === 'scan' ? t('checkIn.leadScan') : t('checkIn.leadType') }}</p>
      </header>

      <CheckInNotice v-if="notice" :notice="notice">
        <UButton
          v-if="notice.recovery === 'wallet'"
          to="/carteira"
          size="xl"
          block
          :label="t('checkIn.toWallet')"
        />
        <template v-else>
          <UButton
            size="xl"
            block
            :icon="notice.recovery === 'retry' ? 'i-ph-arrow-counter-clockwise' : 'i-ph-qr-code'"
            :label="notice.recovery === 'retry' ? t('common.retry') : t('checkIn.scanAgain')"
            @click="recover"
          />
          <UButton variant="outline" color="neutral" size="xl" block icon="i-ph-keyboard" :label="t('checkIn.typeCode')" @click="typeCode" />
        </template>
      </CheckInNotice>

      <template v-else-if="mode === 'scan'">
        <QrViewfinder ref="viewfinder" :label="t('checkIn.viewfinderLabel')" :status="viewfinderStatus" :status-text="viewfinderText" />
        <UButton variant="outline" color="neutral" size="xl" block icon="i-ph-keyboard" :label="t('checkIn.typeCode')" @click="typeCode" />
      </template>

      <form v-else class="flex flex-col gap-6" novalidate @submit.prevent="submitTyped">
        <UAlert
          v-if="cameraIssue"
          color="warning"
          variant="subtle"
          icon="i-ph-camera-slash"
          :description="cameraIssue === 'denied' ? t('checkIn.cameraDenied') : t('checkIn.cameraUnavailable')"
        />

        <UFormField ref="codeField" :label="t('checkIn.codeLabel')" :error="codeError" name="code">
          <template #error="{ error: message }">
            <span v-if="message" class="flex items-start gap-1.5"><UIcon name="i-ph-warning-circle" class="mt-0.5 size-4 shrink-0" aria-hidden="true" />{{ message }}</span>
          </template>
          <UPinInput
            v-model="code"
            :length="CHECK_IN_CODE_LENGTH"
            size="xl"
            autofocus
            :disabled="typing"
            :highlight="codeError !== undefined"
            :color="codeError ? 'error' : 'primary'"
            :ui="{ root: 'w-full justify-between', base: 'uppercase w-12 [font-stretch:75%] font-semibold' }"
            @complete="submitTyped"
          />
        </UFormField>

        <div class="flex flex-col gap-3">
          <UButton type="submit" size="xl" block :loading="typing" :label="t('checkIn.submit')" />
          <UButton
            v-if="cameraIssue !== 'unavailable'"
            variant="ghost"
            color="neutral"
            block
            icon="i-ph-qr-code"
            :label="t('checkIn.useCamera')"
            @click="switchToCamera"
          />
        </div>
      </form>

      <UAlert v-if="mockCode && !notice" color="info" variant="subtle" icon="i-ph-info" :description="t('checkIn.mockHint', { code: mockCode })" />
    </template>
  </div>
</template>
