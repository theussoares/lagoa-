<script setup lang="ts">
definePageMeta({ path: '/balcao/criar-clube', layout: 'merchant-entry', middleware: 'merchant-club-setup' })

usePageTitle('clubSetup.pageTitle')
const screen = useClubSetupScreen()
</script>

<template>
  <div class="flex min-h-dvh flex-col">
    <ClubSetupHeader :shop-name="screen.shopName" :steps="screen.steps" />

    <div v-if="screen.step !== 'poster'" class="mx-auto grid w-full max-w-[1200px] flex-1 items-start gap-10 px-8 py-8 lg:grid-cols-12">
      <ClubSetupFormStep :step="screen.step" :creating="screen.creating" :submit-error="screen.submitError" @submit="screen.submitStep" @back="screen.back">
        <ClubSetupShopStep v-if="screen.step === 'shop'" v-model:shop="screen.form.shop" :errors="screen.shopErrors" />
        <ClubSetupRulesStep
          v-else-if="screen.step === 'rules'"
          v-model:program="screen.form.program"
          :options="screen.fieldOptions"
          :errors="screen.programErrors"
          @mode="screen.setMode"
        />
        <ClubSetupRewardStep v-else v-model:program="screen.form.program" :options="screen.fieldOptions" :errors="screen.programErrors" />
      </ClubSetupFormStep>
      <ProgramPreviewAside
        :preview="screen.preview"
        :label="$t('clubSetup.preview.label')"
        :title="$t('clubSetup.preview.title')"
        heading-level="h2"
      />
    </div>

    <ClubSetupPosterStep
      v-else
      :status="screen.posterStatus"
      :poster="screen.poster"
      :is-pending="screen.isPending"
      :can-approve="screen.canApprove"
      @approve="screen.approve"
      @print="screen.print"
      @retry="screen.retryPoster"
    />
  </div>
</template>
