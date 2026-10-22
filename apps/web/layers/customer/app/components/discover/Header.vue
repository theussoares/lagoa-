<script setup lang="ts">
interface Props {
  image: string
  mapUrl: string
  /** Sem card para subir sobre a faixa (chave do Hits sem destaque), a faixa não deixa o espaço. */
  overlap?: boolean
}

withDefaults(defineProps<Props>(), { overlap: true })
const query = defineModel<string>('query', { required: true })
const { t } = useI18n()
</script>

<template>
  <ScreenHeader :title="t('discover.title')" :lead="t('discover.lead')" :image="image" :overlap="overlap">
    <template #actions>
      <a
        :href="mapUrl"
        target="_blank"
        rel="noopener"
        class="grid size-11 shrink-0 place-items-center rounded-full bg-white text-(--lagoa-header) shadow-(--lagoa-shadow-card)"
        :aria-label="t('discover.mapLinkLabel')"
      >
        <UIcon name="i-ph-map-trifold" class="size-6" aria-hidden="true" />
      </a>
    </template>
    <UInput
      v-model="query"
      type="search"
      size="xl"
      icon="i-ph-magnifying-glass"
      :placeholder="t('discover.searchPlaceholder')"
      :aria-label="t('discover.searchLabel')"
      class="w-full"
      :ui="{ base: 'h-12 rounded-full bg-default' }"
    />
  </ScreenHeader>
</template>
