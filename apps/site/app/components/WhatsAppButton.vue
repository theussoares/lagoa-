<script setup lang="ts">
import type { ButtonProps } from '@nuxt/ui'

interface Props {
  size?: ButtonProps['size']
  block?: boolean
}

withDefaults(defineProps<Props>(), { size: 'xl', block: false })

const { t } = useI18n()
const { href } = useWhatsAppLink()
</script>

<template>
  <!-- Um rótulo só para a mesma ação em toda a página. -->
  <UButton :to="href" target="_blank" :size="size" :block="block" trailing-icon="i-ph-whatsapp-logo">
    {{ t('cta.primary') }}<span class="sr-only"> {{ t('cta.newTab') }}</span>
  </UButton>
</template>
