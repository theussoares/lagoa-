<script setup lang="ts">
import type { WalletSection } from '../../types/wallet'

interface Props {
  selected: WalletSection
}

defineProps<Props>()
const { t } = useI18n()
const sections: readonly WalletSection[] = ['cards', 'rewards']
</script>

<template>
  <nav :aria-label="t('wallet.tabs.label')" class="card flex gap-1.5 rounded-full p-1">
    <NuxtLink
      v-for="section in sections"
      :key="section"
      :to="walletSectionPath(section)"
      :aria-current="section === selected ? 'page' : undefined"
      class="flex min-h-11 flex-1 items-center justify-center rounded-full text-base font-semibold transition-colors duration-(--lagoa-dur-fast) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      :class="section === selected ? 'bg-primary text-inverted' : 'text-muted hover:text-highlighted'"
    >
      {{ t(`wallet.tabs.${section}`) }}
    </NuxtLink>
  </nav>
</template>
