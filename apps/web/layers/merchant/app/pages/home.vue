<script setup lang="ts">
import { HOME_LAPSED_PREVIEW_LIMIT, LAPSED_AFTER_DAYS, WEEK_SUMMARY_DAYS } from '#shared/constants/domain'
import { CUSTOMER_FILTER_QUERY, customerFilterSlug } from '../utils/customerFilterQuery'
import { toCustomerRowModel } from '../utils/customerModels'
import { toWeekDayRows, toWeekHeadline } from '../utils/homeModels'
import type { LapsedPreviewLabels } from '../types/home'

definePageMeta({ path: '/painel', layout: 'merchant', middleware: 'merchant-auth' })

const { t } = useI18n()
const translate = useTranslate()
const { signOut } = useMerchantSession()
useHead({ title: () => `${t('home.title')} · ${t('app.name')}` })

const { state, reload, posterReprint } = useMerchantHome()

watch(state, (current) => {
  if (current.status === 'error' && current.error.code === 'unauthorized') void signOut()
})

const snapshot = computed(() => (state.value.status === 'success' ? state.value.value : null))
const headline = computed(() => (snapshot.value === null ? '' : toWeekHeadline(snapshot.value.week, translate)))
const weekRows = computed(() => (snapshot.value === null ? [] : toWeekDayRows(snapshot.value.week, translate)))
const lapsedRows = computed(() => {
  if (snapshot.value === null) return []
  const now = new Date()
  return snapshot.value.lapsed.slice(0, HOME_LAPSED_PREVIEW_LIMIT).map((row) => toCustomerRowModel(row, now, translate))
})
const lapsedTotal = computed(() => snapshot.value?.lapsed.length ?? 0)
const reachable = computed(() => snapshot.value?.reachable ?? null)

const lapsedLink = { path: '/clientes', query: { [CUSTOMER_FILTER_QUERY]: customerFilterSlug('lapsed') } }
const lapsedLabels = computed<LapsedPreviewLabels>(() => ({ caption: t('home.lapsed.caption'), noName: t('customers.table.noName') }))
</script>

<template>
  <div class="mx-auto flex max-w-[1200px] flex-col gap-5">
    <!-- Só existe durante a impressão: o cartaz novo ocupa a folha e o resto da tela some. -->
    <ClubSetupPoster v-if="posterReprint.poster" :poster="posterReprint.poster" class="hidden print:flex" />
    <div class="flex flex-col gap-5 print:hidden">
    <PageTitle :title="t('home.title')" :lead="t('home.lead', { days: WEEK_SUMMARY_DAYS })">
      <template #actions>
        <div class="flex items-center gap-2 pb-1">
          <!-- A tela fica aberta no tablet do balcão: atualizar sem sair dela. -->
          <UButton
            variant="ghost"
            color="neutral"
            icon="i-ph-arrow-clockwise"
            class="size-11 justify-center"
            :aria-label="t('home.refresh')"
            :loading="state.status === 'loading'"
            @click="reload"
          />
          <UButton to="/balcao" size="lg" icon="i-ph-storefront" :label="t('home.counterAction')" />
        </div>
      </template>
    </PageTitle>

    <HomePosterReprintNotice
      v-if="snapshot?.posterReprintPending"
      @print="posterReprint.print"
    />

    <div v-if="state.status === 'loading'" class="grid gap-5 lg:grid-cols-12" role="status" :aria-label="t('common.loading')">
      <USkeleton class="h-96 rounded-(--radius-card) lg:col-span-7" />
      <USkeleton class="h-80 rounded-(--radius-card) lg:col-span-5" />
    </div>

    <InkNote
      v-else-if="state.status === 'error'"
      tone="error"
      icon="i-ph-warning-circle"
      :description="t(`errors.${state.error.code}`)"
      :actions="[{ label: t('common.retry'), onClick: reload }]"
      live
    />

    <div v-else-if="snapshot" class="grid items-start gap-5 lg:grid-cols-12">
      <PanelModule :title="t('home.week.title')" class="lg:col-span-7">
        <div class="flex flex-col gap-4">
          <p class="text-lg text-highlighted">{{ headline }}</p>
          <HomeWeekLedger :rows="weekRows" :caption="t('home.week.caption', { days: WEEK_SUMMARY_DAYS })" />
        </div>
      </PanelModule>

      <PanelModule :title="t('home.lapsed.title')" class="lg:col-span-5">
        <template v-if="lapsedTotal > 0" #actions>
          <ULink :to="lapsedLink" class="inline-flex min-h-11 items-center text-[0.9375rem] font-semibold text-primary">
            {{ t('home.lapsed.seeAll') }}
          </ULink>
        </template>

        <p v-if="lapsedTotal === 0" class="py-6 text-center text-muted">{{ t('home.lapsed.empty', { days: LAPSED_AFTER_DAYS }) }}</p>
        <div v-else class="flex flex-col gap-4">
          <p class="tabular text-highlighted">{{ t('home.lapsed.count', { count: lapsedTotal, days: LAPSED_AFTER_DAYS }, lapsedTotal) }}</p>
          <HomeLapsedPreview :rows="lapsedRows" :labels="lapsedLabels" />
          <div class="flex flex-col gap-2">
            <UButton
              to="/campanhas"
              size="lg"
              block
              icon="i-ph-megaphone"
              :variant="reachable ? 'solid' : 'outline'"
              :color="reachable ? 'primary' : 'neutral'"
              :label="t('home.lapsed.remind')"
            />
            <p v-if="reachable !== null" class="text-center text-sm text-muted">{{ t('home.lapsed.reachable', { count: reachable }, reachable) }}</p>
          </div>
        </div>
      </PanelModule>
    </div>
    </div>
  </div>
</template>
