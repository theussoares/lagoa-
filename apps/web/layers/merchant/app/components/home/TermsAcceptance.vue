<script setup lang="ts">
import { MERCHANT_TERMS_SECTIONS } from '../../utils/merchantTerms'
import type { MerchantTermsError } from '../../services/MerchantTermsService'

interface Props {
  version: string
  accepting: boolean
  /** Código do erro do último aceite; `null` sem erro. */
  errorCode: MerchantTermsError['code'] | null
}

interface Emits {
  (event: 'accept'): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()
const { t } = useI18n()
const agreed = ref(false)
const checkboxId = useId()
</script>

<template>
  <PanelModule :title="t('merchantTerms.title')">
    <div class="flex flex-col gap-4">
      <p class="text-toned">{{ t('merchantTerms.lead') }}</p>
      <!-- Texto longo rola dentro do cartão: o botão de aceite fica sempre à vista. -->
      <div
        class="max-h-80 overflow-y-auto rounded-(--radius-card) border border-(--lagoa-rule) p-4 text-[0.9375rem]"
        tabindex="0"
        role="region"
        :aria-label="t('merchantTerms.textLabel')"
      >
        <section v-for="section in MERCHANT_TERMS_SECTIONS" :key="section.key" class="mb-4 last:mb-0">
          <h3 class="mb-1 font-semibold text-highlighted">{{ t(`merchantTerms.sections.${section.key}.title`) }}</h3>
          <p v-for="n in section.paragraphs" :key="n" class="mb-1 text-toned">{{ t(`merchantTerms.sections.${section.key}.p${n}`) }}</p>
        </section>
        <p class="mt-4 text-sm text-muted">{{ t('merchantTerms.versionLabel', { version }) }}</p>
      </div>
      <form class="flex flex-wrap items-center justify-between gap-3" @submit.prevent="emit('accept')">
        <label :for="checkboxId" class="flex min-h-11 cursor-pointer items-center gap-3 text-highlighted">
          <input :id="checkboxId" v-model="agreed" type="checkbox" class="size-5 accent-(--ui-primary)" >
          {{ t('merchantTerms.checkbox') }}
        </label>
        <UButton type="submit" size="lg" icon="i-ph-check" :label="t('merchantTerms.accept')" :loading="accepting" :disabled="!agreed" />
      </form>
      <p v-if="errorCode" class="text-error" role="alert">{{ errorCode === 'merchantTermsNotAccepted' ? t('merchantTerms.stale') : t(`errors.${errorCode}`) }}</p>
    </div>
  </PanelModule>
</template>
