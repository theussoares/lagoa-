<script setup lang="ts">
interface Props {
  phone: string
  consent: boolean
  saving: boolean
}

interface Emits {
  change: [granted: boolean]
}

defineProps<Props>()
const emit = defineEmits<Emits>()
const { t } = useI18n()
</script>

<template>
  <dl class="rounded-(--radius-card) bg-default px-5 shadow-(--lagoa-shadow-card)">
    <div class="flex flex-col gap-1 border-b border-(--lagoa-rule) py-4">
      <dt class="text-base text-muted">{{ t('profile.phoneLabel') }}</dt>
      <dd class="tabular text-lg font-semibold text-highlighted">{{ phone }}</dd>
    </div>
    <div class="py-4">
      <dt class="sr-only">{{ t('profile.consentLabel') }}</dt>
      <dd>
        <USwitch
          :model-value="consent"
          size="lg"
          :loading="saving"
          :disabled="saving"
          :label="t('profile.consentLabel')"
          :description="consent ? t('profile.consentOn') : t('profile.consentOff')"
          :ui="{ root: 'items-start gap-3', label: 'text-base font-medium text-highlighted', description: 'text-base text-muted' }"
          @update:model-value="emit('change', $event)"
        />
      </dd>
    </div>
  </dl>
</template>
