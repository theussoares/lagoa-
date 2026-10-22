<script setup lang="ts">
import { MERCHANT_TERMS_VERSION } from '#shared/constants/domain'

definePageMeta({ path: '/painel', layout: 'merchant', middleware: 'merchant-auth' })

const { t } = useI18n()
const { session, expire } = useMerchantSession()
useHead({ title: () => `${t('home.title')} · ${t('app.name')}` })

const { state, reload, posterReprint } = useMerchantHome()
const terms = useMerchantTerms(reload)
const termsError = computed(() => (terms.state.value.status === 'error' ? terms.state.value.code : null))
const campaignsEnabled = useCampaignsEnabled()

watch(state, (current) => {
  if (current.status === 'error' && current.error.code === 'unauthorized') void expire()
})

const snapshot = computed(() => (state.value.status === 'success' ? state.value.value : null))
</script>

<template>
  <div class="mx-auto flex max-w-[1360px] flex-col gap-6">
    <!-- Impressão do cartaz de balcão (só aparece ao imprimir) -->
    <ClubSetupPoster v-if="posterReprint.poster" :poster="posterReprint.poster" class="hidden print:flex" />

    <div class="flex flex-col gap-6 print:hidden">
      <!-- Cabeçalho do Dashboard -->
      <HomeDashboardHeader
        :shop-name="session?.shopName"
        :loading="state.status === 'loading'"
        @refresh="reload"
      />

      <!-- Aceite de Termos pendente -->
      <HomeTermsAcceptance
        v-if="terms.needed.value"
        :version="MERCHANT_TERMS_VERSION"
        :accepting="terms.state.value.status === 'accepting'"
        :error-code="termsError"
        @accept="terms.accept"
      />

      <!-- Aviso de reimpressão de cartaz -->
      <HomePosterReprintNotice
        v-if="snapshot?.posterReprintPending"
        @print="posterReprint.print"
      />

      <!-- Avisos de carregamento parcial -->
      <template v-if="snapshot?.warnings && snapshot.warnings.length > 0">
        <InkNote
          v-for="warning in snapshot.warnings"
          :key="warning"
          tone="warning"
          icon="i-ph-warning"
          :description="t(`home.warnings.${warning}`)"
          :actions="[{ label: t('common.retry'), onClick: reload }]"
        />
      </template>

      <!-- Estado de Carregamento -->
      <div v-if="state.status === 'loading'" class="flex flex-col gap-6" role="status" :aria-label="t('common.loading')">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          <USkeleton v-for="index in 4" :key="index" class="h-32 rounded-2xl" />
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div class="flex flex-col gap-6">
            <USkeleton class="h-80 rounded-2xl" />
            <USkeleton class="h-44 rounded-2xl" />
          </div>
          <div class="flex flex-col gap-6">
            <USkeleton class="h-80 rounded-2xl" />
            <USkeleton class="h-44 rounded-2xl" />
          </div>
        </div>
      </div>

      <!-- Estado de Erro -->
      <InkNote
        v-else-if="state.status === 'error'"
        tone="error"
        icon="i-ph-warning-circle"
        :description="t(`errors.${state.error.code}`)"
        :actions="[{ label: t('common.retry'), onClick: reload }]"
        live
      />

      <!-- Dashboard Carregado -->
      <div v-else-if="snapshot" class="flex flex-col gap-6">
        <!-- 4 Cards de Indicadores -->
        <HomeIndicatorCards
          :week="snapshot.week"
          :overview="snapshot.overview"
          :program="snapshot.program"
        />

        <!-- Área Principal em 2 Colunas -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <!-- Coluna Esquerda: Atividade recente e Campanhas ativas -->
          <div class="flex flex-col gap-6 min-w-0">
            <HomeRecentActivity
              :activity="snapshot.overview.activity"
            />
            <HomeActiveCampaigns
              :program="snapshot.program"
              :campaigns-overview="snapshot.campaignsOverview"
              :campaigns-enabled="campaignsEnabled"
            />
          </div>

          <!-- Coluna Direita: Resumo do mês e Resumo de oportunidades -->
          <div class="flex flex-col gap-6 min-w-0">
            <HomeComparisonChart
              :comparison="snapshot.overview.comparison"
              :program="snapshot.program"
            />
            <HomeOpportunities
              :overview="snapshot.overview"
              :program="snapshot.program"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

