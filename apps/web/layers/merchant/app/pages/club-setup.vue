<script setup lang="ts">
import type { SelectItem } from '@nuxt/ui'
import { REWARD_TITLE_MAX_LENGTH, SHOP_ADDRESS_MAX_LENGTH, SHOP_NAME_MAX_LENGTH, SHOP_NEIGHBORHOOD_MAX_LENGTH } from '#shared/constants/domain'
import { ShopCategorySchema } from '#shared/schemas/shop'
import { CLUB_SETUP_STEPS } from '../utils/clubSetupForm'
import type { PosterStepLabels, SetupStepItem, ShopFieldLimits, ShopFieldsLabels } from '../utils/clubSetupLabels'
import { toCheckInPosterModel } from '../utils/posterModel'
import { toProgramPreview } from '../utils/programPreviewModel'

definePageMeta({ path: '/balcao/criar-clube', layout: 'merchant-entry', middleware: 'merchant-club-setup' })

const { t } = useI18n()
const translate = useTranslate()
const origin = useRequestURL().origin
useHead({ title: () => `${t('clubSetup.pageTitle')} · ${t('app.name')}` })

const setup = useClubSetup()
const { step, form, shopErrors, programErrors, submitState, posterState } = setup
const program = computed(() => form.value.program)
const labels = useProgramFormLabels(program)
const { approveForTesting } = useShopStatus()

const shopName = computed(() => form.value.shop.name.trim())
const stepItems = computed<SetupStepItem[]>(() => {
  const currentIndex = CLUB_SETUP_STEPS.indexOf(step.value)
  return CLUB_SETUP_STEPS.map((key, index) => ({
    key,
    label: t(`clubSetup.steps.${key}`),
    state: index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'next',
  }))
})

const categories = computed<SelectItem[]>(() => ShopCategorySchema.options.map((value) => ({ label: t(`shop.categories.${value}`), value })))
const shopLimits: ShopFieldLimits = { name: SHOP_NAME_MAX_LENGTH, neighborhood: SHOP_NEIGHBORHOOD_MAX_LENGTH, addressLine: SHOP_ADDRESS_MAX_LENGTH }
const shopLabels = computed<ShopFieldsLabels>(() => ({
  name: t('clubSetup.shop.name'),
  namePlaceholder: t('clubSetup.shop.namePlaceholder'),
  nameError: t('clubSetup.shop.nameError', { max: SHOP_NAME_MAX_LENGTH }),
  category: t('clubSetup.shop.category'),
  categoryPlaceholder: t('clubSetup.shop.categoryPlaceholder'),
  categoryError: t('clubSetup.shop.categoryError'),
  neighborhood: t('clubSetup.shop.neighborhood'),
  neighborhoodError: t('clubSetup.shop.neighborhoodError', { max: SHOP_NEIGHBORHOOD_MAX_LENGTH }),
  addressLine: t('clubSetup.shop.addressLine'),
  addressHint: t('clubSetup.shop.addressHint'),
  addressError: t('clubSetup.shop.addressError', { max: SHOP_ADDRESS_MAX_LENGTH }),
}))

const preview = computed(() => toProgramPreview(form.value.program, shopName.value || t('clubSetup.preview.shopFallback'), translate))
const poster = computed(() => (posterState.value.status === 'success' ? toCheckInPosterModel(posterState.value.poster, origin, translate) : null))
const isPending = computed(() => posterState.value.status === 'success' && posterState.value.poster.status === 'pending')
const posterLabels = computed<PosterStepLabels>(() => ({
  title: t('clubSetup.poster.title'),
  lead: t('clubSetup.poster.lead'),
  pendingTitle: t('merchantNav.pending.title'),
  pendingDescription: t('merchantNav.pending.description'),
  approveForTesting: t('merchantNav.pending.approveForTesting'),
  approved: t('clubSetup.poster.approved'),
  print: t('clubSetup.poster.print'),
  goToPanel: t('clubSetup.poster.goToPanel'),
  loading: t('common.loading'),
  loadError: t('clubSetup.poster.loadError'),
  retry: t('common.retry'),
}))
const submitError = computed(() => (submitState.value.status === 'error' ? submitState.value.code : null))

async function approve(): Promise<void> {
  if (approveForTesting !== null && (await approveForTesting())) await setup.loadPoster()
}

function printPoster(): void {
  window.print()
}

// Etapa nova: o foco vai para o título, e o leitor de tela anuncia onde o lojista está.
watch(step, async () => {
  await nextTick()
  document.querySelector<HTMLElement>('h1')?.focus()
})

// "Continuar" que não avança leva o foco ao primeiro campo com erro.
async function submitStep(): Promise<void> {
  const before = step.value
  if (before === 'reward') await setup.create()
  else setup.next()
  if (step.value !== before) return
  await nextTick()
  document.querySelector<HTMLElement>('form [aria-invalid="true"]')?.focus()
}

// Fora do painel o rascunho só vive nesta aba: recarregar ou fechar perde o que foi
// preenchido. Confirmar o celular de novo (login) guarda o rascunho; depois do cartaz, nada a perder.
const hasUnsavedDraft = (): boolean => step.value !== 'poster'
onBeforeRouteLeave((to) => {
  if (!hasUnsavedDraft() || to.path === MERCHANT_SIGN_IN_PATH) return true
  return window.confirm(t('clubSetup.leaveConfirm'))
})
function warnBeforeUnload(event: BeforeUnloadEvent): void {
  if (hasUnsavedDraft()) event.preventDefault()
}
onMounted(() => window.addEventListener('beforeunload', warnBeforeUnload))
onBeforeUnmount(() => window.removeEventListener('beforeunload', warnBeforeUnload))
</script>

<template>
  <div class="flex min-h-dvh flex-col">
    <header class="flex flex-wrap items-center justify-between gap-4 border-b border-(--lagoa-rule) bg-default px-8 py-4 print:hidden">
      <div class="flex items-baseline gap-4">
        <p class="letreiro text-xl text-highlighted">{{ t('app.name') }}</p>
        <p class="text-[0.9375rem] text-muted">
          {{ shopName ? t('clubSetup.creatingFor', { shop: shopName }) : t('clubSetup.creating') }}
        </p>
      </div>
      <ClubSetupSteps :steps="stepItems" :label="t('clubSetup.stepsLabel')" :done-label="t('clubSetup.stepDone')" />
    </header>

    <div v-if="step !== 'poster'" class="mx-auto grid w-full max-w-[1200px] flex-1 items-start gap-10 px-8 py-8 lg:grid-cols-12">
      <form class="flex min-w-0 flex-col gap-6 lg:col-span-7" novalidate @submit.prevent="submitStep">
        <PageTitle :title="t(`clubSetup.${step}.title`)" :lead="t(`clubSetup.${step}.lead`)" focusable />

        <fieldset :disabled="submitState.status === 'creating'" class="flex min-w-0 flex-col gap-5">
          <PanelModule v-if="step === 'shop'" :title="t('clubSetup.shop.module')">
            <ClubSetupShopFields v-model:shop="form.shop" :labels="shopLabels" :limits="shopLimits" :categories="categories" :errors="shopErrors" />
          </PanelModule>

          <template v-else-if="step === 'rules'">
            <PanelModule :title="t('program.earn.title')">
              <ProgramEarnFields
                v-model:rules="form.program.rules"
                :labels="labels.earn.value"
                :limits="labels.limits.value"
                :errors="programErrors"
                :mode-locked="false"
                :target-changed="false"
                @mode="setup.setMode"
              />
            </PanelModule>
            <PanelModule :title="t('program.visitRules.title')">
              <ProgramVisitRulesFields v-model:check-in="form.program.checkIn" v-model:expiration="form.program.expirationPolicy" :labels="labels.visitRules.value" :errors="programErrors" />
            </PanelModule>
          </template>

          <template v-else>
            <PanelModule :title="t('program.reward.title')">
              <UFormField
                :label="t('program.reward.label')"
                :hint="t('program.reward.hint', { max: REWARD_TITLE_MAX_LENGTH })"
                :error="programErrors.rewardTitle ? t('program.errors.rewardTitle', { max: REWARD_TITLE_MAX_LENGTH }) : undefined"
                name="rewardTitle"
              >
                <UInput v-model="form.program.reward.title" :maxlength="REWARD_TITLE_MAX_LENGTH" size="lg" class="w-full" :placeholder="t('program.reward.placeholder')" />
              </UFormField>
            </PanelModule>
            <PanelModule :title="t('program.bonus.title')">
              <ProgramBonusFields v-model:bonus="form.program.bonusRules" :labels="labels.bonus.value" :limits="labels.limits.value" :errors="programErrors" />
            </PanelModule>
          </template>
        </fieldset>

        <InkNote
          v-if="submitError"
          tone="error"
          icon="i-ph-warning-circle"
          :description="t(`errors.${submitError}`)"
          :actions="submitError === 'signUpExpired' ? [{ label: t('clubSetup.confirmPhoneAgain'), to: MERCHANT_SIGN_IN_PATH }] : []"
          live
        />

        <div class="flex items-center justify-between gap-3 border-t border-(--lagoa-rule) pt-5">
          <UButton
            v-if="step !== 'shop'"
            variant="outline"
            color="neutral"
            size="lg"
            icon="i-ph-arrow-left"
            :label="t('clubSetup.back')"
            :disabled="submitState.status === 'creating'"
            @click="setup.back"
          />
          <span v-else />
          <UButton
            type="submit"
            size="lg"
            :trailing-icon="step === 'reward' ? 'i-ph-seal-check' : 'i-ph-arrow-right'"
            :label="step === 'reward' ? t('clubSetup.create') : t(`clubSetup.continue.${step}`)"
            :loading="submitState.status === 'creating'"
          />
        </div>
      </form>

      <aside class="flex flex-col gap-3 lg:sticky lg:top-6 lg:col-span-5" :aria-label="t('clubSetup.preview.label')">
        <p class="letreiro text-[0.9375rem] text-toned">{{ t('clubSetup.preview.title') }}</p>
        <StampCard :card="preview.card" heading-level="h2" />
        <p class="flex items-center gap-1.5 text-[0.9375rem] text-toned">
          <UIcon name="i-ph-seal-check" class="size-4 shrink-0 text-primary" aria-hidden="true" />{{ preview.earnLine }}
        </p>
      </aside>
    </div>

    <ClubSetupPosterStep
      v-else
      :status="posterState.status"
      :poster="poster"
      :is-pending="isPending"
      :can-approve="approveForTesting !== null"
      :panel-path="MERCHANT_PANEL_PATH"
      :labels="posterLabels"
      @approve="approve"
      @print="printPoster"
      @retry="setup.loadPoster"
    />
  </div>
</template>
