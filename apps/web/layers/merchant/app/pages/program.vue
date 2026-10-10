<script setup lang="ts">
import { MERCHANT_SIGN_IN_PATH } from '../composables/useMerchantSession'
import { toProgramPreview } from '../utils/programPreviewModel'
import { sectionHasError } from '../utils/programSummary'

definePageMeta({ path: '/programa', layout: 'merchant', middleware: 'merchant-auth' })

const { t } = useI18n()
const translate = useTranslate()
const { session, signOut } = useMerchantSession()
useHead({ title: () => `${t('program.title')} · ${t('app.name')}` })

const editor = useProgramEditor()
const { draft, state, saveState, fieldErrors } = editor
const options = useProgramFieldOptions(draft)

// O essencial (prêmio, tipo e meta) fica aberto; bônus e validade dobram num resumo.
const bonusOpen = ref(false)
const visitRulesOpen = ref(false)
// Cada tentativa de salvar inválida gera um estado novo: reabre a seção com erro mesmo que o lojista a tenha fechado.
watch(saveState, (current) => {
  if (current.status !== 'error' || current.code !== 'invalidProgram') return
  if (sectionHasError('bonus', fieldErrors.value)) bonusOpen.value = true
  if (sectionHasError('visitRules', fieldErrors.value)) visitRulesOpen.value = true
})

watch(
  () => [state.value, saveState.value] as const,
  ([load, save]) => {
    const unauthorized = (load.status === 'error' && load.error.code === 'unauthorized') || (save.status === 'error' && save.code === 'unauthorized')
    if (unauthorized) void signOut()
  },
)

const preview = computed(() => (draft.value === null ? null : toProgramPreview(draft.value, session.value?.shopName ?? '', translate)))

const saveMessage = computed(() => {
  const current = saveState.value
  if (current.status === 'saved') return { tone: 'success' as const, text: t('program.save.saved') }
  if (current.status === 'error') return { tone: 'error' as const, text: t(`errors.${current.code}`) }
  return null
})

// Sessão encerrada (sair, ou vencida no meio do save) leva ao login sem perguntar: não há como salvar mesmo.
onBeforeRouteLeave((to) => {
  if (!editor.isDirty.value || session.value === null || to.path === MERCHANT_SIGN_IN_PATH) return true
  return window.confirm(t('program.save.leaveConfirm'))
})
</script>

<template>
  <div class="mx-auto flex max-w-[1200px] flex-col gap-5 pb-24">
    <PageTitle :title="t('program.title')" :lead="t('program.lead')" />

    <div v-if="state.status === 'loading'" class="grid gap-5 lg:grid-cols-12" role="status" :aria-label="t('common.loading')">
      <div class="flex flex-col gap-5 lg:col-span-7">
        <USkeleton v-for="block in 3" :key="block" class="h-48 rounded-(--radius-card)" />
      </div>
      <USkeleton class="h-80 rounded-(--radius-card) lg:col-span-5" />
    </div>

    <InkNote
      v-else-if="state.status === 'error'"
      tone="error"
      icon="i-ph-warning-circle"
      :description="t(`errors.${state.error.code}`)"
      :actions="[{ label: t('common.retry'), onClick: editor.reload }]"
      live
    />

    <form v-else-if="draft" class="grid items-start gap-5 lg:grid-cols-12" novalidate @submit.prevent="editor.save">
      <!-- Travado durante o save: o que fosse digitado agora seria trocado pela resposta do servidor. -->
      <fieldset :disabled="saveState.status === 'saving'" class="flex min-w-0 flex-col gap-5 lg:col-span-7">
        <PanelModule :title="t('program.card.title')">
          <ProgramRewardTitleField v-model:title="draft.reward.title" :invalid="fieldErrors.rewardTitle === true" />
          <ProgramEarnFields
            v-model:rules="draft.rules"
            :unit="options.unit"
            :limits="options.limits"
            :errors="fieldErrors"
            :target-changed="editor.targetChanged.value"
            :points-to-stamps-changed="editor.pointsToStampsChanged.value"
            class="mt-5 border-t border-(--lagoa-rule) pt-5"
            @mode="editor.setMode"
          />
        </PanelModule>

        <FoldModule v-model:open="bonusOpen" :title="t('program.bonus.title')" :summary="options.summaries?.bonus ?? ''">
          <ProgramBonusFields v-model:bonus="draft.bonusRules" :unit="options.unit" :limits="options.limits" :errors="fieldErrors" />
        </FoldModule>

        <FoldModule v-model:open="visitRulesOpen" :title="t('program.visitRules.title')" :summary="options.summaries?.visitRules ?? ''">
          <ProgramVisitRulesFields
            v-model:check-in="draft.checkIn"
            v-model:expiration="draft.expirationPolicy"
            :cooldown-options="options.cooldownOptions"
            :expiration-options="options.expirationOptions"
            :errors="fieldErrors"
          />
        </FoldModule>
      </fieldset>

      <ProgramPreviewAside
        v-if="preview"
        :preview="preview"
        :label="t('program.preview.label')"
        :title="t('program.preview.title')"
        heading-level="h3"
      />

      <div class="fixed inset-x-0 bottom-0 z-10 border-t border-(--lagoa-rule) bg-default/95 backdrop-blur left-(--merchant-sidebar-width)">
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
