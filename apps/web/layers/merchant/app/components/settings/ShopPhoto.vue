<script setup lang="ts">
import type { ShopPhotoSendState } from '../../types/shopPhoto'

interface Props {
  imageUrl: string | null
  loading: boolean
  send: ShopPhotoSendState
}

interface Emits {
  (event: 'choose', file: File): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()
const { t } = useI18n()
const inputId = useId()

function onChange(event: Event): void {
  const input = event.target instanceof HTMLInputElement ? event.target : null
  const file = input?.files?.[0]
  if (file !== undefined) emit('choose', file)
  // Escolher a mesma foto de novo também dispara (depois de um erro, por exemplo).
  if (input !== null) input.value = ''
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <p class="text-toned">{{ t('merchantSettings.photo.lead') }}</p>
    <USkeleton v-if="loading" class="aspect-[16/9] w-full rounded-(--radius-card)" />
    <img v-else-if="imageUrl" :src="imageUrl" :alt="t('merchantSettings.photo.alt')" class="aspect-[16/9] w-full rounded-(--radius-card) object-cover" >
    <p v-else class="flex aspect-[16/9] w-full items-center justify-center rounded-(--radius-card) border border-dashed border-(--lagoa-rule) text-muted">
      {{ t('merchantSettings.photo.empty') }}
    </p>
    <div class="flex flex-wrap items-center gap-3">
      <label
        :for="inputId"
        class="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-(--ui-radius) bg-primary px-4 font-semibold text-inverted focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary"
        :aria-disabled="send.status === 'sending'"
      >
        <UIcon name="i-ph-camera" class="size-5" aria-hidden="true" />
        {{ imageUrl ? t('merchantSettings.photo.change') : t('merchantSettings.photo.choose') }}
        <input :id="inputId" type="file" accept="image/*" class="sr-only" :disabled="send.status === 'sending'" @change="onChange" >
      </label>
      <p aria-live="polite" class="text-[0.9375rem]" :class="send.status === 'error' ? 'text-error' : 'text-muted'">
        <template v-if="send.status === 'sending'">{{ t('merchantSettings.photo.uploading') }}</template>
        <template v-else-if="send.status === 'saved'">{{ t('merchantSettings.photo.saved') }}</template>
        <template v-else-if="send.status === 'error'">
          {{ send.code === 'unreadable' ? t('merchantSettings.photo.unreadable') : t(`errors.${send.code}`) }}
        </template>
      </p>
    </div>
  </div>
</template>
