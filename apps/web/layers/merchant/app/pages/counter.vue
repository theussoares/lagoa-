<script setup lang="ts">
definePageMeta({ path: '/balcao', layout: 'merchant', middleware: 'merchant-auth' })

usePageTitle('counter.title')
const screen = useCounterScreen()
</script>

<template>
  <div class="mx-auto flex max-w-[1200px] flex-col gap-5">
    <PageTitle :title="$t('counter.title')">
      <template #actions>
        <p class="pb-1 text-muted first-letter:uppercase">{{ screen.today }}</p>
      </template>
    </PageTitle>

    <div class="grid items-start gap-5 lg:grid-cols-12">
      <div class="flex flex-col gap-5 lg:col-span-5">
        <CounterLaunchPanel
          v-model:phone="screen.launch.phone"
          :amount-text="screen.launch.amountText"
          :action="screen.launch.action"
          :submit-label="screen.launch.submitLabel"
          :amount-hint="screen.launch.amountHint"
          :pending="screen.launch.pending"
          :phone-error-code="screen.launch.phoneErrorCode"
          :amount-error-code="screen.launch.amountErrorCode"
          :alert-code="screen.launch.alertCode"
          :program-failed="screen.launch.programFailed"
          :receipt="screen.launch.receipt"
          :focus-request="screen.focusRequest"
          @field-focus="screen.launch.setActiveField"
          @amount-input="screen.launch.inputAmount"
          @digit="screen.launch.pressDigit"
          @backspace="screen.launch.pressBackspace"
          @clear="screen.launch.clear"
          @submit="screen.launch.submit"
          @retry-program="screen.launch.retryProgram"
        />
      </div>

      <!-- Resgate no topo da direita: valida sem rolar, ao lado do teclado; a caderneta rola por dentro. -->
      <div class="flex flex-col gap-5 lg:col-span-7">
        <CounterRedemptionPanel
          v-model:code="screen.redemption.code"
          :status="screen.redemption.status"
          :error-code="screen.redemption.errorCode"
          :preview="screen.redemption.preview"
          :delivered-reward="screen.redemption.deliveredReward"
          :focus-request="screen.focusRequest"
          @complete="screen.redemption.complete"
          @deliver="screen.redemption.deliver"
          @cancel="screen.redemption.cancel"
        />
        <CounterLedgerPanel
          :status="screen.ledger.status"
          :error-code="screen.ledger.errorCode"
          :rows="screen.ledger.rows"
          @reload="screen.ledger.reload"
        />
      </div>
    </div>
  </div>
</template>
