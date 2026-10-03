<script setup lang="ts">
import { REDEMPTION_CODE_LENGTH } from '#shared/constants/domain'
import { formatCurrency } from '#shared/utils/currency'
import { phoneDigits } from '#shared/utils/phone'
import { PILOT_TIME_ZONE } from '#shared/utils/time'
import type { ComponentPublicInstance } from 'vue'
import type { CounterKeypadLabels } from '#layers/ui/app/types/keypad'
import { amountDigits, counterActionFor } from '../utils/counterAction'
import type { CounterAction } from '../types/counter'
import { toCounterLedgerModel, toLaunchReceipt, unitsText } from '../utils/counterModels'

definePageMeta({ path: '/balcao', layout: 'merchant', middleware: 'merchant-auth' })

const { t } = useI18n()
const translate = useTranslate()
const { signOut } = useMerchantSession()
const shopStatus = useShopStatus()
const { program: programService } = useMerchantServices()
useHead({ title: () => `${t('counter.title')} · ${t('app.name')}` })

const program = useAsyncResult(() => programService.getProgram())
const ledger = useCounterLedger()
const launch = useCounterLaunch()
const redemption = useRedemptionCheck()

const phoneDisplay = useTemplateRef<{ focus: () => void }>('phoneDisplay')
const stub = useTemplateRef<{ focus: () => void }>('stub')
const amountField = useTemplateRef<ComponentPublicInstance>('amountField')
const activeField = ref<'phone' | 'amount'>('phone')

const STAMP_ICON = 'i-ph-check-fat-bold'
const dayFormat = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: PILOT_TIME_ZONE })
const timeFormat = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: PILOT_TIME_ZONE })
const today = dayFormat.format(new Date())

// Sessão vencida em qualquer chamada leva de volta ao login do painel; loja fechada
// pela rede atualiza a faixa do painel, sem derrubar a sessão.
watch(
  () => [program.state.value, ledger.state.value, launch.state.value, redemption.state.value],
  (states) => {
    const codes = states.flatMap((state) => (state.status !== 'error' ? [] : ['error' in state ? state.error.code : state.code]))
    if (codes.includes('unauthorized')) void signOut()
    else if (codes.includes('shopPendingApproval') || codes.includes('shopSuspended')) void shopStatus.refresh()
  },
)

const action = computed<CounterAction | null>(() =>
  program.state.value.status === 'success' ? counterActionFor(program.state.value.value.rules) : null,
)
const rewardTitle = computed(() => (program.state.value.status === 'success' ? program.state.value.value.reward.title : ''))

const submitLabel = computed(() => {
  if (action.value === null) return t('counter.launch.give', { units: unitsText(translate, 'stamp', 1) })
  if (action.value.kind === 'amount') return t('counter.launch.giveAmount')
  return t('counter.launch.give', { units: unitsText(translate, action.value.unit, action.value.units) })
})
const amountHint = computed(() =>
  action.value?.kind === 'amount'
    ? t('counter.launch.amountHint', { points: unitsText(translate, 'point', action.value.pointsPerReal) })
    : undefined,
)
const amountText = computed(() => (launch.amount.value === '' ? '' : formatCurrency(Number(launch.amount.value))))

const launchError = computed(() => (launch.state.value.status === 'error' ? launch.state.value.code : null))
const phoneError = computed(() => (launchError.value === 'invalidPhone' ? t('errors.invalidPhone') : undefined))
const amountError = computed(() => (launchError.value === 'invalidAmount' ? t('errors.invalidAmount') : undefined))
const launchAlert = computed(() =>
  launchError.value !== null && launchError.value !== 'invalidPhone' && launchError.value !== 'invalidAmount'
    ? t(`errors.${launchError.value}`)
    : undefined,
)
const receipt = computed(() =>
  launch.state.value.status === 'success' ? toLaunchReceipt(launch.state.value.result, rewardTitle.value, translate) : null,
)

const keypadLabels = computed<CounterKeypadLabels>(() => ({
  clear: t('counter.launch.keypadClear'),
  backspace: t('counter.launch.keypadBackspace'),
}))

const ledgerRows = computed(() =>
  ledger.state.value.status === 'success'
    ? ledger.state.value.value.map((entry) => toCounterLedgerModel(entry, translate, ledger.freshIds.value.has(entry.id)))
    : [],
)

function focusPhone(): void {
  activeField.value = 'phone'
  phoneDisplay.value?.focus()
}

function onKeypadDigit(digit: string): void {
  if (activeField.value === 'amount') launch.amount.value = amountDigits(launch.amount.value + digit)
  else launch.phone.value = phoneDigits(launch.phone.value + digit)
}

function onKeypadBackspace(): void {
  if (activeField.value === 'amount') launch.amount.value = launch.amount.value.slice(0, -1)
  else launch.phone.value = launch.phone.value.slice(0, -1)
}

function onAmountInput(value: string | number): void {
  launch.amount.value = amountDigits(String(value))
}

function focusAmount(): void {
  activeField.value = 'amount'
  const root: unknown = amountField.value?.$el
  if (root instanceof HTMLElement) root.querySelector('input')?.focus()
}

async function submitLaunch(): Promise<void> {
  if (action.value === null) return
  // Enter no celular, com o valor ainda vazio, só passa para o campo do valor.
  if (action.value.kind === 'amount' && launch.amount.value === '' && activeField.value === 'phone') {
    focusAmount()
    return
  }
  const result = await launch.submit(action.value)
  if (result !== null) ledger.prepend(result.entry)
  if (result !== null || launchError.value === 'invalidPhone') focusPhone()
}

function clearLaunch(): void {
  launch.clear()
  focusPhone()
}

async function onCodeComplete(): Promise<void> {
  await redemption.validate()
  if (redemption.state.value.status !== 'error') return
  await nextTick()
  stub.value?.focus()
}

async function deliverReward(): Promise<void> {
  const entry = await redemption.confirm()
  if (entry !== null) ledger.prepend(entry)
}

function cancelRedemption(): void {
  redemption.reset()
  stub.value?.focus()
}

onMounted(focusPhone)
</script>

<template>
  <div class="mx-auto flex max-w-[1200px] flex-col gap-5">
    <PageTitle :title="t('counter.title')">
      <template #actions>
        <p class="pb-1 text-muted first-letter:uppercase">{{ today }}</p>
      </template>
    </PageTitle>

    <div class="grid items-start gap-5 lg:grid-cols-12">
      <div class="flex flex-col gap-5 lg:col-span-5">
        <PanelModule :title="t('counter.launch.title')">
          <form class="flex flex-col gap-4" novalidate @submit.prevent="submitLaunch">
            <PhoneDisplay
              ref="phoneDisplay"
              v-model="launch.phone.value"
              :label="t('counter.launch.phoneLabel')"
              :hint="t('counter.launch.phoneHint')"
              :error="phoneError"
              @focusin="activeField = 'phone'"
              @clear="clearLaunch"
            />

            <UFormField v-if="action?.kind === 'amount'" :label="t('counter.launch.amountLabel')" :hint="amountHint" :error="amountError" name="amount" size="xl">
              <template #error="{ error: message }">
                <span v-if="message" class="flex items-start gap-1.5"><UIcon name="i-ph-warning-circle" class="mt-0.5 size-4 shrink-0" aria-hidden="true" />{{ message }}</span>
              </template>
              <UInput
                ref="amountField"
                :model-value="amountText"
                inputmode="none"
                autocomplete="off"
                placeholder="R$ 0,00"
                size="xl"
                class="w-full"
                :ui="{ base: 'tabular text-2xl font-bold' }"
                @update:model-value="onAmountInput"
                @focus="activeField = 'amount'"
                @keydown.esc.prevent="clearLaunch"
              />
            </UFormField>

            <CounterKeypad
              :labels="keypadLabels"
              :aria-label="t('counter.launch.keypadLabel')"
              :disabled="launch.state.value.status === 'pending'"
              @digit="onKeypadDigit"
              @backspace="onKeypadBackspace"
              @clear="clearLaunch"
            />

            <UButton
              type="submit"
              size="xl"
              block
              :icon="action?.kind === 'amount' ? 'i-ph-receipt' : 'i-ph-seal-check'"
              :label="submitLabel"
              :loading="launch.state.value.status === 'pending'"
              :disabled="action === null"
            />
          </form>

          <div aria-live="polite" class="empty:hidden mt-4 flex flex-col">
            <InkNote
              v-if="launchAlert"
              tone="error"
              icon="i-ph-warning-circle"
              :description="launchAlert"
            />
            <InkNote
              v-else-if="program.state.value.status === 'error'"
              tone="error"
              icon="i-ph-warning-circle"
              :description="t('counter.launch.programProblem')"
              :actions="[{ label: t('common.retry'), onClick: program.reload }]"
            />
            <CounterLaunchReceipt v-else-if="receipt" :key="launch.state.value.status === 'success' ? launch.state.value.result.entry.id : ''" :receipt="receipt" :icon="STAMP_ICON" />
          </div>
        </PanelModule>
      </div>

      <!-- Resgate no topo da direita: valida sem rolar, ao lado do teclado; a caderneta rola por dentro. -->
      <div class="flex flex-col gap-5 lg:col-span-7">
        <RedemptionStub
          ref="stub"
          v-model="redemption.code.value"
          :title="t('counter.redemption.title')"
          :hint="t('counter.redemption.hint')"
          :code-label="t('counter.redemption.codeLabel')"
          :length="REDEMPTION_CODE_LENGTH"
          :disabled="redemption.state.value.status === 'checking' || redemption.state.value.status === 'confirming'"
          :invalid="redemption.state.value.status === 'error'"
          @complete="onCodeComplete"
          @keydown.esc="cancelRedemption"
        >
          <div aria-live="polite" class="empty:hidden">
            <p v-if="redemption.state.value.status === 'checking'" class="flex items-center gap-2 text-muted">
              <UIcon name="i-ph-circle-notch" class="size-4 motion-safe:animate-spin" aria-hidden="true" />{{ t('counter.redemption.checking') }}
            </p>
            <p v-else-if="redemption.state.value.status === 'error'" class="flex items-start gap-1.5 text-[0.9375rem] text-error">
              <UIcon name="i-ph-warning-circle" class="mt-0.5 size-4 shrink-0" aria-hidden="true" />{{ t(`errors.${redemption.state.value.code}`) }}
            </p>
            <div
              v-else-if="redemption.state.value.status === 'preview' || redemption.state.value.status === 'confirming'"
              class="flex flex-col gap-4"
            >
              <div class="flex flex-col gap-1">
                <p class="flex items-center gap-1.5 text-[0.9375rem] font-semibold text-success">
                  <UIcon name="i-ph-check-circle" class="size-4" aria-hidden="true" />{{ t('counter.redemption.valid') }}
                </p>
                <p class="text-[1.375rem] leading-tight font-bold text-secondary [font-stretch:90%]">{{ redemption.state.value.preview.rewardTitle }}</p>
                <p class="tabular text-[0.9375rem] text-muted">
                  {{ t('counter.redemption.customer', { phone: redemption.state.value.preview.maskedPhone, time: timeFormat.format(new Date(redemption.state.value.preview.expiresAt)) }) }}
                </p>
              </div>
              <div class="flex gap-2">
                <UButton
                  color="secondary"
                  icon="i-ph-gift"
                  :label="t('counter.redemption.deliver')"
                  :loading="redemption.state.value.status === 'confirming'"
                  class="flex-1 justify-center"
                  @click="deliverReward"
                />
                <UButton
                  variant="ghost"
                  color="neutral"
                  :label="t('counter.redemption.cancel')"
                  :disabled="redemption.state.value.status === 'confirming'"
                  @click="cancelRedemption"
                />
              </div>
            </div>
            <p v-else-if="redemption.state.value.status === 'delivered'" class="flex items-start gap-1.5 text-[0.9375rem] font-medium text-success">
              <UIcon name="i-ph-check-circle" class="mt-0.5 size-4 shrink-0" aria-hidden="true" />{{ t('counter.redemption.delivered', { reward: redemption.state.value.rewardTitle }) }}
            </p>
          </div>
        </RedemptionStub>

        <PanelModule :title="t('counter.ledger.title')">
          <template #actions>
            <div class="flex items-center gap-1">
              <span v-if="ledger.state.value.status === 'success'" class="tabular text-[0.9375rem] text-muted">
                {{ t('counter.todayCount', ledger.state.value.value.length) }}
              </span>
              <UButton
                variant="ghost"
                color="neutral"
                icon="i-ph-arrow-clockwise"
                class="size-11 justify-center"
                :aria-label="t('counter.ledger.refresh')"
                :loading="ledger.state.value.status === 'loading'"
                @click="ledger.reload"
              />
            </div>
          </template>

          <div v-if="ledger.state.value.status === 'loading'" class="flex flex-col" role="status" :aria-label="t('common.loading')">
            <div v-for="row in 5" :key="row" class="flex h-14 items-center gap-4 border-b border-(--lagoa-rule) last:border-b-0">
              <USkeleton class="h-4 w-11" />
              <USkeleton class="h-4 w-36" />
              <USkeleton class="ml-auto h-4 w-24" />
              <USkeleton class="size-9 rounded-full" />
            </div>
          </div>
          <InkNote
            v-else-if="ledger.state.value.status === 'error'"
            tone="error"
            icon="i-ph-warning-circle"
            :description="t(`errors.${ledger.state.value.error.code}`)"
            :actions="[{ label: t('common.retry'), onClick: ledger.reload }]"
            live
          />
          <p v-else-if="ledgerRows.length === 0" class="py-10 text-center text-muted">{{ t('counter.ledger.empty') }}</p>
          <!-- Rola por dentro: focável para quem usa só o teclado (iPad do balcão). -->
          <div
            v-else
            tabindex="0"
            role="region"
            :aria-label="t('counter.ledger.title')"
            class="-mx-4 -mb-4 max-h-[min(28rem,50dvh)] overflow-y-auto px-4 pb-4 [scrollbar-color:var(--lagoa-slot)_transparent] [scrollbar-width:thin]">
            <CounterLedger :entries="ledgerRows" />
          </div>
        </PanelModule>
      </div>
    </div>
  </div>
</template>
