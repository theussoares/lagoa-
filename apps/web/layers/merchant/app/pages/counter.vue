<script setup lang="ts">
definePageMeta({ path: '/balcao', layout: 'merchant', middleware: 'merchant-auth' })

usePageTitle('counter.title')
const screen = useCounterScreen()
</script>

<template>
  <div class="mx-auto flex max-w-[1200px] flex-col gap-5">
    <PageTitle :title="$t('counter.title')" class="print:hidden">
      <template #actions>
        <p class="pb-1 text-muted first-letter:uppercase">{{ screen.today }}</p>
      </template>
    </PageTitle>

    <div class="grid items-start gap-5 lg:grid-cols-12 print:block">
      <div class="flex flex-col gap-5 lg:col-span-5">
        <CounterVisitQrPanel
          :amount-text="screen.visitQr.amountText"
          :action="screen.visitQr.action"
          :issue-label="screen.visitQr.issueLabel"
          :amount-hint="screen.visitQr.amountHint"
          :amount-preview="screen.visitQr.amountPreview"
          :pending="screen.visitQr.pending"
          :amount-error-code="screen.visitQr.amountErrorCode"
          :alert-code="screen.visitQr.alertCode"
          :program-failed="screen.visitQr.programFailed"
          :display="screen.visitQr.display"
          :can-simulate="screen.visitQr.canSimulate"
          :focus-request="screen.focusRequest"
          @amount-input="screen.visitQr.inputAmount"
          @issue="screen.visitQr.issue"
          @cancel="screen.visitQr.cancel"
          @issue-another="screen.visitQr.issueAnother"
          @print="screen.visitQr.print"
          @simulate-claim="screen.visitQr.simulateClaim"
          @retry-program="screen.visitQr.retryProgram"
        />
      </div>

      <!-- Resgate no topo da direita: valida sem rolar, ao lado do teclado; a caderneta rola por dentro. -->
      <div class="flex flex-col gap-5 lg:col-span-7 print:hidden">
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
