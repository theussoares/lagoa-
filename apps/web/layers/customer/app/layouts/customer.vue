<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const tabBar = useCustomerTabBar()
</script>

<template>
  <div class="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col px-5 pt-[max(env(safe-area-inset-top),1.25rem)] pb-[calc(env(safe-area-inset-bottom)+7rem)]">
    <main id="main" class="flex-1">
      <slot />
    </main>
    <AppTabBar :items="tabBar.items" :action="tabBar.action" :label="t('nav.mainLabel')" :current-path="route.path" />
    <MoreMenuSheet v-if="tabBar.hitsEnabled" v-model:open="tabBar.moreOpen" />
  </div>
</template>
