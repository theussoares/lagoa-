<script setup lang="ts">
definePageMeta({ path: '/check-in', layout: 'customer', middleware: 'customer-auth' })

usePageTitle('checkIn.pageTitle')
const screen = useCheckInScreen()
const cityHeaderImage = useCityHeaderImage()
</script>

<template>
  <div>
    <p class="sr-only" aria-live="polite">{{ screen.announcement }}</p>

    <CheckInEarnedStep v-if="screen.earned" :earned="screen.earned" :image="cityHeaderImage" :focus-request="screen.focusRequest" />
    <CheckInJoinedStep v-else-if="screen.joined" :joined="screen.joined" :image="cityHeaderImage" :focus-request="screen.focusRequest" />

    <template v-else>
      <ScreenHeader
        :title="$t('checkIn.title')"
        :lead="screen.view === 'notice' ? undefined : $t(screen.view === 'scan' ? 'checkIn.leadScan' : 'checkIn.leadType', { length: screen.codeLength })"
        :image="cityHeaderImage"
        :overlap="screen.view !== 'type'"
      />

      <!-- Aviso e visor são um bloco único e sobem sobre a faixa; o campo de código abre com rótulo escuro e não sobe. -->
      <div class="flex flex-col gap-6" :class="{ 'relative -mt-10': screen.view !== 'type' }">
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
      </div>
    </template>
  </div>
</template>
