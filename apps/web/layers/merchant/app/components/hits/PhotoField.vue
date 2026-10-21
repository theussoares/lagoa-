<script setup lang="ts">
interface Props {
  imageUrl: string | null
  missing: boolean
  unreadable: boolean
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
  <UFormField :label="t('merchantHits.photo.label')" :description="t('merchantHits.photo.hint')" name="photo" :error="missing ? t('merchantHits.errors.missingPhoto') : unreadable ? t('merchantHits.errors.unreadable') : undefined">
    <div class="flex flex-wrap items-center gap-4">
      <img v-if="imageUrl" :src="imageUrl" :alt="t('merchantHits.preview.photoAlt')" class="aspect-[16/9] w-40 rounded-(--radius-card) object-cover" >
      <label
        :for="inputId"
        class="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-(--ui-radius) bg-primary px-4 font-semibold text-inverted focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary"
      >
        <UIcon name="i-ph-camera" class="size-5" aria-hidden="true" />
        {{ imageUrl ? t('merchantHits.photo.change') : t('merchantHits.photo.choose') }}
        <input :id="inputId" type="file" accept="image/*" class="sr-only" @change="onChange" >
      </label>
    </div>
  </UFormField>
</template>
