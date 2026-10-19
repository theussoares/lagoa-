<script setup lang="ts">
import type { ShopPhotoKind } from '#shared/schemas/shop'
import type { ShopPhotoSendState } from '../../types/shopPhoto'

interface Props {
  kind: ShopPhotoKind
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
  // Escolher a mesma imagem de novo também dispara (depois de um erro, por exemplo).
  if (input !== null) input.value = ''
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <p class="text-toned">{{ t(`merchantSettings.photo.${kind}.lead`) }}</p>

    <!-- Logo: alinhamento lado a lado no desktop (círculo + botão) -->
    <div v-if="kind === 'logo'" class="flex flex-col sm:flex-row sm:items-center gap-6 pt-1">
      <div class="size-28 shrink-0 overflow-hidden rounded-full ring-2 ring-slate-200/80 dark:ring-white/10 shadow-xs">
        <USkeleton v-if="loading" class="size-full" />
        <img v-else-if="imageUrl" :src="imageUrl" :alt="t(`merchantSettings.photo.${kind}.alt`)" class="size-full object-cover" >
        <p v-else class="flex size-full items-center justify-center border border-dashed border-(--lagoa-rule) p-3 text-center text-sm text-muted rounded-full bg-slate-50/50 dark:bg-white/2">
          {{ t(`merchantSettings.photo.${kind}.empty`) }}
        </p>
      </div>

      <div class="flex flex-col items-start gap-2.5">
        <label
          :for="inputId"
          class="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-(--ui-radius) bg-primary px-4 font-semibold text-inverted focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary transition-all duration-150 hover:opacity-90 hover:shadow-xs active:scale-[0.98]"
          :aria-disabled="send.status === 'sending'"
        >
          <UIcon name="i-ph-camera" class="size-5" aria-hidden="true" />
          {{ imageUrl ? t(`merchantSettings.photo.${kind}.change`) : t(`merchantSettings.photo.${kind}.choose`) }}
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

    <!-- Banner: visualização ampla 16:9 -->
    <template v-else>
      <div class="aspect-[16/9] w-full overflow-hidden rounded-(--radius-card) border border-(--lagoa-rule) bg-slate-50/50 dark:bg-white/2 shadow-xs">
        <USkeleton v-if="loading" class="size-full" />
        <img v-else-if="imageUrl" :src="imageUrl" :alt="t(`merchantSettings.photo.${kind}.alt`)" class="size-full object-cover" >
        <p v-else class="flex size-full items-center justify-center border border-dashed border-(--lagoa-rule) p-4 text-center text-sm text-muted rounded-(--radius-card)">
          {{ t(`merchantSettings.photo.${kind}.empty`) }}
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <label
          :for="inputId"
          class="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-(--ui-radius) bg-primary px-4 font-semibold text-inverted focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary transition-all duration-150 hover:opacity-90 hover:shadow-xs active:scale-[0.98]"
          :aria-disabled="send.status === 'sending'"
        >
          <UIcon name="i-ph-camera" class="size-5" aria-hidden="true" />
          {{ imageUrl ? t(`merchantSettings.photo.${kind}.change`) : t(`merchantSettings.photo.${kind}.choose`) }}
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
    </template>
  </div>
</template>
