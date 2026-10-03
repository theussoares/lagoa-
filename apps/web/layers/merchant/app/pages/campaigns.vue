<script setup lang="ts">
import { REMINDER_MESSAGE_MAX_LENGTH } from '#shared/constants/domain'
import { toCampaignHistoryRow, toReachModel, toReminderPreview } from '../utils/campaignModels'
import { unitsText } from '../utils/counterModels'
import type { ReminderFieldLimits, ReminderFieldsLabels } from '../utils/reminderForm'

definePageMeta({ path: '/campanhas', layout: 'merchant', middleware: 'merchant-auth' })

const { t } = useI18n()
const translate = useTranslate()
const { session, signOut } = useMerchantSession()
useHead({ title: () => `${t('campaigns.title')} · ${t('app.name')}` })

const campaigns = useCampaigns(t('campaigns.message.default'))
const { state, draft, bonusLimits, fieldErrors, sendState, reachable } = campaigns
const confirmOpen = ref(false)
// Fixo ao abrir: o alcance volta do servidor antes de o modal terminar de fechar.
const confirmRecipients = ref(0)

watch(
  () => [state.value, sendState.value] as const,
  ([load, send]) => {
    const unauthorized = (load.status === 'error' && load.error.code === 'unauthorized') || (send.status === 'error' && send.code === 'unauthorized')
    if (unauthorized) void signOut()
  },
)

const overview = computed(() => (state.value.status === 'success' ? state.value.value : null))
const reach = computed(() => (overview.value === null ? null : toReachModel(overview.value.reach, translate)))
const preview = computed(() =>
  overview.value === null ? null : toReminderPreview(draft.value, session.value?.shopName ?? '', overview.value.unit, translate),
)
const history = computed(() => overview.value?.history.map((campaign) => toCampaignHistoryRow(campaign, translate)) ?? [])

const limits = computed<ReminderFieldLimits | null>(() =>
  bonusLimits.value === null
    ? null
    : { messageMax: REMINDER_MESSAGE_MAX_LENGTH, bonusMin: bonusLimits.value.min, bonusMax: bonusLimits.value.max },
)
const fieldLabels = computed<ReminderFieldsLabels>(() => ({
  message: t('campaigns.message.label'),
  messageHint: t('campaigns.message.hint', { max: REMINDER_MESSAGE_MAX_LENGTH }),
  messageError: t('campaigns.message.error', { max: REMINDER_MESSAGE_MAX_LENGTH }),
  bonus: t('campaigns.message.bonusLabel'),
  bonusHint: t('campaigns.message.bonusHint'),
  bonusError: t('campaigns.message.bonusError', { min: limits.value?.bonusMin ?? 0, max: limits.value?.bonusMax ?? 0 }),
}))

const confirmBonus = computed(() => {
  if (overview.value === null || draft.value.bonusUnits === 0) return t('campaigns.send.confirmNoBonus')
  return t('campaigns.send.confirmBonus', { units: unitsText(translate, overview.value.unit, draft.value.bonusUnits) })
})

const sendMessage = computed(() => {
  const current = sendState.value
  if (current.status === 'sent') return { tone: 'success' as const, text: t('campaigns.send.sent', { count: current.recipientsCount }, current.recipientsCount) }
  if (current.status === 'error') return { tone: 'error' as const, text: t(`errors.${current.code}`) }
  return null
})

function onSubmit(): void {
  if (!campaigns.validate()) return
  confirmRecipients.value = reachable.value
  confirmOpen.value = true
}

async function onConfirm(): Promise<void> {
  await campaigns.send(confirmRecipients.value)
  confirmOpen.value = false
}
</script>

<template>
  <div class="mx-auto flex max-w-[1200px] flex-col gap-5">
    <PageTitle :title="t('campaigns.title')" :lead="t('campaigns.lead')" />

    <div v-if="state.status === 'loading'" class="grid gap-5 lg:grid-cols-12" role="status" :aria-label="t('common.loading')">
      <div class="flex flex-col gap-5 lg:col-span-7">
        <USkeleton v-for="block in 2" :key="block" class="h-56 rounded-(--radius-card)" />
      </div>
      <USkeleton class="h-72 rounded-(--radius-card) lg:col-span-5" />
    </div>

    <InkNote
      v-else-if="state.status === 'error'"
      tone="error"
      icon="i-ph-warning-circle"
      :description="t(`errors.${state.error.code}`)"
      :actions="[{ label: t('common.retry'), onClick: campaigns.reload }]"
      live
    />

    <div v-else-if="reach && preview && limits" class="grid items-start gap-5 lg:grid-cols-12">
      <div class="flex min-w-0 flex-col gap-5 lg:col-span-7">
        <PanelModule :title="t('campaigns.reach.title')">
          <CampaignReachSummary :model="reach" :privacy-note="t('campaigns.reach.privacy')" />
        </PanelModule>

        <PanelModule :title="t('campaigns.message.title')">
          <form class="flex flex-col gap-5" novalidate @submit.prevent="onSubmit">
            <fieldset :disabled="sendState.status === 'sending'" class="min-w-0">
              <CampaignReminderFields v-model:draft="draft" :labels="fieldLabels" :limits="limits" :errors="fieldErrors" />
            </fieldset>
            <div class="flex flex-wrap items-center justify-end gap-3 border-t border-(--lagoa-rule) pt-4">
              <p aria-live="polite" class="mr-auto flex items-center gap-1.5 text-[0.9375rem]" :class="sendMessage?.tone === 'error' ? 'text-error' : 'text-success'">
                <template v-if="sendMessage">
                  <UIcon :name="sendMessage.tone === 'error' ? 'i-ph-warning-circle' : 'i-ph-check-circle'" class="size-4 shrink-0" aria-hidden="true" />{{ sendMessage.text }}
                </template>
              </p>
              <UButton
                type="submit"
                size="lg"
                icon="i-ph-paper-plane-tilt"
                :label="t('campaigns.send.submit')"
                :loading="sendState.status === 'sending'"
                :disabled="reachable === 0"
              />
            </div>
          </form>
        </PanelModule>
      </div>

      <div class="flex flex-col gap-5 lg:sticky lg:top-6 lg:col-span-5">
        <aside class="flex flex-col gap-3" :aria-label="t('campaigns.preview.label')">
          <p class="letreiro text-[0.9375rem] text-toned">{{ t('campaigns.preview.title') }}</p>
          <CampaignReminderPreview :preview="preview" :source="t('campaigns.preview.source')" />
        </aside>

        <PanelModule :title="t('campaigns.history.title')">
          <CampaignHistoryList :rows="history" :empty-text="t('campaigns.history.empty')" :caption="t('campaigns.history.caption')" />
        </PanelModule>
      </div>
    </div>

    <UModal v-model:open="confirmOpen" :title="t('campaigns.send.confirmTitle')" :dismissible="sendState.status !== 'sending'" :close="sendState.status !== 'sending'">
      <template #body>
        <div class="flex flex-col gap-2 text-[0.9375rem]">
          <p class="font-semibold text-highlighted">{{ t('campaigns.send.confirmRecipients', { count: confirmRecipients }, confirmRecipients) }}</p>
          <p class="text-toned">{{ confirmBonus }}</p>
          <p class="text-muted">{{ t('campaigns.send.confirmUndo') }}</p>
        </div>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-3">
          <UButton
            variant="ghost"
            color="neutral"
            size="lg"
            :label="t('campaigns.send.cancel')"
            :disabled="sendState.status === 'sending'"
            @click="confirmOpen = false"
          />
          <UButton size="lg" icon="i-ph-paper-plane-tilt" :label="t('campaigns.send.confirm')" :loading="sendState.status === 'sending'" @click="onConfirm" />
        </div>
      </template>
    </UModal>
  </div>
</template>
