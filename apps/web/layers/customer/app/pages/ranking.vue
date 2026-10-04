<script setup lang="ts">
import { monthTitle, myStandingLine, toRankingRows } from '../utils/rankingModel'

definePageMeta({ path: '/ranking', layout: 'customer', middleware: 'customer-auth' })

const { t } = useI18n()
const translate = useTranslate()
const toast = useToast()
useHead({ title: () => `${t('ranking.title')} · ${t('app.name')}` })

const { ranking: rankingService } = useCustomerServices()
const { signOut } = useCustomerSession()
const { state, reload, set } = useRanking()
const pending = ref(false)
const joinLabels = computed(() => ({ name: t('ranking.nameLabel'), help: t('ranking.nameHelp'), submit: t('ranking.join') }))

watch(state, (current) => {
  if (current.status === 'error' && current.error.code === 'unauthorized') void signOut()
})

async function changeConsent(update: Parameters<typeof rankingService.setConsent>[0]): Promise<void> {
  pending.value = true
  const result = await rankingService.setConsent(update)
  pending.value = false
  if (!result.ok) return void toast.add({ color: 'error', icon: 'i-ph-warning-circle', title: t(`errors.${result.error.code}`) })
  set(result.value)
  toast.add({ color: 'success', icon: 'i-ph-check-circle', title: t(update.granted ? 'ranking.joined' : 'ranking.left') })
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <PageTitle :title="t('ranking.title')" :lead="state.status === 'success' ? t('ranking.lead', { month: monthTitle(state.value.month) }) : undefined" />

    <USkeleton v-if="state.status === 'loading'" class="h-56 rounded-(--radius-card)" />
    <WalletProblem v-else-if="state.status === 'error'" :message="t(`errors.${state.error.code}`)" :action="t('common.retry')" @retry="reload" />

    <template v-else>
      <RankingList v-if="state.value.entries.length > 0" :rows="toRankingRows(state.value, translate)" :label="t('ranking.listLabel')" />
      <p v-else class="text-base text-muted">{{ t('ranking.empty') }}</p>
      <p v-if="myStandingLine(state.value, translate)" class="text-base text-toned" aria-live="polite">{{ myStandingLine(state.value, translate) }}</p>

      <RankingJoinForm v-if="!state.value.me.optedIn" :pending="pending" :labels="joinLabels" @join="changeConsent({ granted: true, name: $event })" />
      <UButton v-else variant="outline" color="neutral" size="lg" block :loading="pending" :label="t('ranking.leave')" @click="changeConsent({ granted: false })" />
      <p class="text-base text-muted">{{ t('ranking.privacy') }}</p>
    </template>
  </div>
</template>
