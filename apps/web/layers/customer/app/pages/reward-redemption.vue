<script setup lang="ts">
definePageMeta({ path: '/premios/:cardId', layout: 'customer', middleware: 'customer-auth' })

const { t } = useI18n()
useHead({ title: () => `${t('redemption.pageTitle')} · ${t('app.name')}` })
const screen = useRewardRedemptionScreen()
</script>

<template>
  <div>
    <ScreenHeader :title="screen.title" :image="screen.cityHeaderImage">
      <template #actions>
        <RewardRedemptionBackLink :to="screen.back.to" :label="screen.back.label" />
      </template>
    </ScreenHeader>

    <!-- Erro, esqueleto e bilhete são cards únicos: o primeiro sobe sobre a faixa. -->
    <div class="relative -mt-10 flex flex-col gap-6">
      <p class="sr-only" aria-live="polite">{{ screen.announcement }}</p>

      <WalletProblem
        v-if="screen.state.status === 'error'"
        :message="screen.errorText"
        :action="screen.canRetry ? t('common.retry') : t('redemption.backToWallet')"
        :icon="screen.canRetry ? undefined : 'i-ph-warning-circle'"
        :action-icon="screen.canRetry ? undefined : 'i-ph-arrow-left'"
        @retry="screen.canRetry ? screen.request() : navigateTo('/carteira')"
      />

      <div
        v-else-if="!screen.ticket || !screen.card"
        class="flex flex-col gap-5 rounded-(--radius-card) bg-default p-5 shadow-(--lagoa-shadow-card)"
        :aria-label="t('common.loading')"
        role="status"
      >
        <div class="flex items-center gap-4">
          <USkeleton class="size-12 rounded-full" />
          <div class="flex flex-1 flex-col gap-2">
            <USkeleton class="h-4 w-1/3" />
            <USkeleton class="h-6 w-2/3" />
          </div>
        </div>
        <USkeleton class="mx-auto mt-4 h-14 w-4/5" />
        <USkeleton class="h-1 w-full" />
      </div>

      <template v-else>
        <RedemptionTicket
          :shop-name="screen.card.shop.name"
          :icon="categoryIcon(screen.card.shop.category)"
          :reward="screen.redemption?.rewardTitle ?? screen.card.rewardTitle"
          :code-label="t('redemption.codeLabel')"
          :state="screen.ticket"
        />

        <div v-if="screen.ticket.kind === 'active'" class="flex flex-col gap-3 text-pretty text-toned">
          <p>{{ t('redemption.howTo') }}</p>
          <p v-if="screen.heldUntil" class="text-base text-muted">{{ screen.heldUntil }}</p>
        </div>

        <ActionButton
          v-else-if="screen.ticket.kind === 'expired'"
          role="primary"
          block
          icon="i-ph-arrow-clockwise"
          :label="t('redemption.regenerate')"
          @click="screen.request"
        />

        <ActionButton v-else role="primary" to="/carteira" block :label="t('redemption.backToWallet')" />
      </template>
    </div>
  </div>
</template>
