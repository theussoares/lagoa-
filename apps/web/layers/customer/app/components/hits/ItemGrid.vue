<script setup lang="ts">
import type { HitItemCardModel } from '../../types/hits'

interface Props {
  items: readonly HitItemCardModel[]
  canLoadMore: boolean
  loadingMore: boolean
  /** Mensagem pronta quando o "Ver mais" falhou. */
  moreError: string | null
}

interface Emits {
  loadMore: []
}

defineProps<Props>()
const emit = defineEmits<Emits>()
const { t } = useI18n()
</script>

<template>
  <section :aria-label="t('hits.itemsLabel')" class="flex flex-col gap-4">
    <ul class="grid grid-cols-2 gap-3">
      <li v-for="(item, index) in items" :key="item.id" :style="{ '--i': (index % 6) + 1 }" class="rise">
        <HitsItemCard :item="item" />
      </li>
    </ul>
    <p v-if="moreError" role="alert" class="text-pretty text-toned">{{ moreError }}</p>
    <ActionButton
      v-if="canLoadMore"
      role="secondary"
      block
      :loading="loadingMore"
      :label="t('hits.loadMore')"
      class="min-h-11"
      @click="emit('loadMore')"
    />
  </section>
</template>
