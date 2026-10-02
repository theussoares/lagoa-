<script setup lang="ts">
interface Props {
  /** Nome da região para leitor de tela. */
  label: string
  status: 'starting' | 'scanning' | 'busy'
  statusText: string
}

defineProps<Props>()

const video = useTemplateRef<HTMLVideoElement>('video')
defineExpose({ video })
</script>

<template>
  <figure
    class="relative aspect-square w-full overflow-hidden rounded-(--radius-card) bg-(--ui-color-neutral-950) shadow-(--lagoa-shadow-card)"
    role="group"
    :aria-label="label"
  >
    <video
      ref="video"
      class="size-full object-cover transition-opacity duration-(--lagoa-dur-base)"
      :class="status === 'scanning' ? 'opacity-100' : 'opacity-40'"
      muted
      playsinline
      aria-hidden="true"
    />

    <!-- os cantos marcam a área que a câmera lê (o centro, 2/3 do quadro) -->
    <div class="pointer-events-none absolute inset-[16.67%]" aria-hidden="true">
      <span class="corner top-0 left-0 rounded-tl-[10px] border-t-4 border-l-4" />
      <span class="corner top-0 right-0 rounded-tr-[10px] border-t-4 border-r-4" />
      <span class="corner bottom-0 left-0 rounded-bl-[10px] border-b-4 border-l-4" />
      <span class="corner right-0 bottom-0 rounded-br-[10px] border-r-4 border-b-4" />
    </div>

    <div v-if="status !== 'scanning'" class="pointer-events-none absolute inset-0 grid place-items-center" aria-hidden="true">
      <UIcon
        :name="status === 'busy' ? 'i-ph-circle-notch' : 'i-ph-camera'"
        class="size-10 text-(--ui-color-neutral-200)"
        :class="status === 'busy' ? 'motion-safe:animate-spin' : 'motion-safe:animate-pulse'"
      />
    </div>

    <figcaption class="absolute inset-x-0 bottom-4 flex justify-center px-4">
      <span class="rounded-full bg-default/90 px-3.5 py-1.5 text-[0.9375rem] font-medium text-highlighted" role="status">
        {{ statusText }}
      </span>
    </figcaption>
  </figure>
</template>

<style scoped>
.corner {
  position: absolute;
  width: 2.5rem;
  height: 2.5rem;
  border-color: var(--ui-color-neutral-50);
  filter: drop-shadow(0 1px 2px rgb(0 0 0 / 0.45));
}
</style>
