<script setup lang="ts">
import { REWARD_TITLE_MAX_LENGTH } from '#shared/constants/domain'
import { toProgramPreview } from '../utils/programPreviewModel'

definePageMeta({ path: '/programa', layout: 'merchant', middleware: 'merchant-auth' })

const { t } = useI18n()
const translate = useTranslate()
const { session, signOut } = useMerchantSession()
useHead({ title: () => `${t('program.title')} · ${t('app.name')}` })

const editor = useProgramEditor()
const { draft, state, saveState, fieldErrors } = editor
const labels = useProgramFormLabels(draft)

watch(
  () => [state.value, saveState.value] as const,
  ([load, save]) => {
    const unauthorized = (load.status === 'error' && load.error.code === 'unauthorized') || (save.status === 'error' && save.code === 'unauthorized')
    if (unauthorized) void signOut()
  },
)

const preview = computed(() => (draft.value === null ? null : toProgramPreview(draft.value, session.value?.shopName ?? '', translate)))

const targetChanged = computed(() =>
  state.value.status === 'success' &&
  draft.value !== null &&
  state.value.value.activeCards > 0 &&
  draft.value.rules.target !== state.value.value.program.rules.target,
)

const saveMessage = computed(() => {
  const current = saveState.value
  if (current.status === 'saved') return { tone: 'success' as const, text: t('program.save.saved') }
  if (current.status === 'error') return { tone: 'error' as const, text: t(`errors.${current.code}`) }
  return null
})

onBeforeRouteLeave(() => {
  if (!editor.isDirty.value) return true
  return window.confirm(t('program.save.leaveConfirm'))
})
</script>

<template>
  <div class="mx-auto flex max-w-[1200px] flex-col gap-5 pb-24">
    <header class="flex flex-col gap-1">
      <h1 class="text-[1.75rem] leading-tight font-bold text-highlighted [font-stretch:90%]">{{ t('program.title') }}</h1>
      <p class="text-muted">{{ t('program.lead') }}</p>
    </header>

    <div v-if="state.status === 'loading'" class="grid gap-5 lg:grid-cols-12" role="status" :aria-label="t('common.loading')">
      <div class="flex flex-col gap-5 lg:col-span-7">
        <USkeleton v-for="block in 3" :key="block" class="h-48 rounded-(--radius-card)" />
      </div>
      <USkeleton class="h-80 rounded-(--radius-card) lg:col-span-5" />
    </div>

    <UAlert
      v-else-if="state.status === 'error'"
      color="error"
      variant="subtle"
      icon="i-ph-warning-circle"
      :description="t(`errors.${state.error.code}`)"
      :actions="[{ label: t('common.retry'), color: 'neutral', variant: 'outline', onClick: editor.reload }]"
    />

    <form v-else-if="draft" class="grid items-start gap-5 lg:grid-cols-12" novalidate @submit.prevent="editor.save">
      <div class="flex flex-col gap-5 lg:col-span-7">
        <PanelModule :title="t('program.reward.title')">
          <UFormField
            :label="t('program.reward.label')"
            :hint="t('program.reward.hint', { max: REWARD_TITLE_MAX_LENGTH })"
            :error="fieldErrors.rewardTitle ? t('program.errors.rewardTitle', { max: REWARD_TITLE_MAX_LENGTH }) : undefined"
            name="rewardTitle"
          >
            <UInput v-model="draft.reward.title" :maxlength="REWARD_TITLE_MAX_LENGTH" size="lg" class="w-full" :placeholder="t('program.reward.placeholder')" />
          </UFormField>
        </PanelModule>

        <PanelModule :title="t('program.earn.title')">
          <ProgramEarnFields
            v-model:rules="draft.rules"
            :labels="labels.earn.value"
            :errors="fieldErrors"
            :mode-locked="editor.modeLocked.value"
            :target-changed="targetChanged"
            @mode="editor.setMode"
          />
        </PanelModule>

        <PanelModule :title="t('program.bonus.title')">
          <ProgramBonusFields v-model:bonus="draft.bonusRules" :labels="labels.bonus.value" :errors="fieldErrors" />
        </PanelModule>

        <PanelModule :title="t('program.visitRules.title')">
          <ProgramVisitRulesFields v-model:check-in="draft.checkIn" v-model:expiration="draft.expirationPolicy" :labels="labels.visitRules.value" />
        </PanelModule>
      </div>

      <aside class="flex flex-col gap-3 lg:sticky lg:top-6 lg:col-span-5" :aria-label="t('program.preview.label')">
        <p class="letreiro text-[0.9375rem] text-toned">{{ t('program.preview.title') }}</p>
        <StampCard v-if="preview" :card="preview.card" heading-level="h3" />
        <p v-if="preview" class="flex items-center gap-1.5 text-[0.9375rem] text-toned">
          <UIcon name="i-ph-seal-check" class="size-4 shrink-0 text-primary" aria-hidden="true" />{{ preview.earnLine }}
        </p>
      </aside>

      <div class="fixed inset-x-0 bottom-0 z-10 border-t border-(--lagoa-rule) bg-default/95 backdrop-blur left-[220px]">
        <div class="mx-auto flex max-w-[1200px] items-center justify-end gap-3 px-8 py-3">
          <p aria-live="polite" class="mr-auto flex items-center gap-1.5 text-[0.9375rem]" :class="saveMessage?.tone === 'error' ? 'text-error' : 'text-success'">
            <template v-if="saveMessage">
              <UIcon :name="saveMessage.tone === 'error' ? 'i-ph-warning-circle' : 'i-ph-check-circle'" class="size-4 shrink-0" aria-hidden="true" />{{ saveMessage.text }}
            </template>
            <span v-else-if="editor.isDirty.value" class="text-muted">{{ t('program.save.unsaved') }}</span>
          </p>
          <UButton
            variant="ghost"
            color="neutral"
            size="lg"
            :label="t('program.save.discard')"
            :disabled="!editor.isDirty.value || saveState.status === 'saving'"
            @click="editor.discard"
          />
          <UButton
            type="submit"
            size="lg"
            icon="i-ph-floppy-disk"
            :label="t('program.save.submit')"
            :loading="saveState.status === 'saving'"
            :disabled="!editor.isDirty.value"
          />
        </div>
      </div>
    </form>
  </div>
</template>
