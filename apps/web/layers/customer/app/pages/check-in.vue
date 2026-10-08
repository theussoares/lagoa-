<script setup lang="ts">
definePageMeta({ path: '/check-in', layout: 'customer', middleware: 'customer-auth' })

usePageTitle('checkIn.pageTitle')
const screen = useCheckInScreen()
</script>

<template>
  <div class="flex flex-col gap-6">
    <p class="sr-only" aria-live="polite">{{ screen.announcement }}</p>

    <CheckInEarnedStep v-if="screen.earned" :earned="screen.earned" :focus-request="screen.focusRequest" />
    <CheckInJoinedStep v-else-if="screen.joined" :joined="screen.joined" :focus-request="screen.focusRequest" />

    <template v-else>
      <PageTitle
        :title="$t('checkIn.title')"
        :lead="screen.view === 'notice' ? undefined : $t(screen.view === 'scan' ? 'checkIn.leadScan' : 'checkIn.leadType', { length: screen.codeLength })"
      />

      <CheckInNotice v-if="screen.notice" :notice="screen.notice" @recover="screen.recover" @type-code="screen.typeCode" />
      <CheckInScanStep
        v-else-if="screen.view === 'scan'"
        :status="screen.viewfinderStatus"
        @video="screen.setVideo"
        @type-code="screen.typeCode"
      />
      <CheckInCodeForm
        v-else
        v-model:code="screen.code"
        :kind="screen.codeKind"
        :length="screen.codeLength"
        :camera-issue="screen.cameraIssue"
        :invalid="screen.codeInvalid"
        :typing="screen.typing"
        :focus-request="screen.focusRequest"
        @submit="screen.submitTyped"
        @switch-to-camera="screen.switchToCamera"
        @switch-kind="screen.switchCodeKind"
      />
    </template>
  </div>
</template>
