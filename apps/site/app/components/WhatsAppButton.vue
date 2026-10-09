<script setup lang="ts">
import type { ButtonProps } from '@nuxt/ui'
import type { WhatsAppMessage } from '../types/whatsapp'

interface Props {
  size?: ButtonProps['size']
  block?: boolean
  message?: WhatsAppMessage
  /** Nome do plano, lido por leitor de tela para distinguir botões iguais. */
  context?: string
}

const props = withDefaults(defineProps<Props>(), { size: 'xl', block: false, message: 'whatsappMessage', context: undefined })

const { t } = useI18n()
const { href } = useWhatsAppLink(props.message)
</script>

<template>
  <!-- Um rótulo só para a mesma ação em toda a página. -->
  <UButton :to="href" target="_blank" :size="size" :block="block" trailing-icon="i-ph-whatsapp-logo">
    {{ t('cta.primary') }}<span class="sr-only"><template v-if="context"> {{ t('cta.forPlan', { plan: context }) }}</template> {{ t('cta.newTab') }}</span>
  </UButton>
</template>
