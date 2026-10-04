<script setup lang="ts">
interface Props {
  downloading: boolean
  erasing: boolean
}

defineProps<Props>()
const emit = defineEmits<{ download: []; erase: [] }>()
const { t } = useI18n()
const eraseLabels = computed(() => ({
  help: t('profile.eraseHelp'),
  button: t('profile.eraseButton'),
  confirmTitle: t('profile.eraseConfirmTitle'),
  confirmDescription: t('profile.eraseConfirmDescription'),
  confirm: t('profile.eraseConfirm'),
  cancel: t('profile.eraseCancel'),
}))
</script>

<template>
  <div class="flex flex-col gap-6">
    <section aria-labelledby="data-title" class="flex flex-col gap-3">
      <h2 id="data-title" class="letreiro text-base text-toned">{{ t('profile.dataTitle') }}</h2>
      <div class="flex flex-col gap-3 rounded-(--radius-card) bg-default p-4 shadow-(--lagoa-shadow-card)">
        <p class="text-base text-muted">{{ t('profile.dataHelp') }}</p>
        <UButton variant="outline" color="neutral" size="lg" block icon="i-ph-download-simple" :loading="downloading" :label="t('profile.dataDownload')" @click="emit('download')" />
      </div>
    </section>

    <section aria-labelledby="erase-title" class="flex flex-col gap-3">
      <h2 id="erase-title" class="letreiro text-base text-toned">{{ t('profile.eraseTitle') }}</h2>
      <ProfileEraseAccount :pending="erasing" :labels="eraseLabels" @confirm="emit('erase')" />
    </section>
  </div>
</template>
