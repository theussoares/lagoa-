<script setup lang="ts">
import { ShopGroupSchema } from '#shared/domain/shopGroup'
import type { ShopGroup } from '#shared/domain/shopGroup'

interface Props {
  selected: ShopGroup | null
}

interface Emits {
  'update:selected': [group: ShopGroup | null]
}

defineProps<Props>()
const emit = defineEmits<Emits>()
const { t } = useI18n()

const chips: ReadonlyArray<{ group: ShopGroup | null; label: string }> = [
  { group: null, label: 'discover.groups.all' },
  ...ShopGroupSchema.options.map((group) => ({ group, label: `discover.groups.${group}` })),
]
</script>

<template>
  <div role="group" :aria-label="t('discover.groups.label')" class="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
    <button
      v-for="chip in chips"
      :key="chip.group ?? 'all'"
      type="button"
      :aria-pressed="selected === chip.group"
      class="h-11 shrink-0 rounded-full px-4 text-base font-semibold whitespace-nowrap transition-colors duration-(--lagoa-dur-fast) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      :class="selected === chip.group ? 'bg-primary text-inverted' : 'bg-muted text-default hover:text-highlighted'"
      @click="emit('update:selected', chip.group)"
    >
      {{ t(chip.label) }}
    </button>
  </div>
</template>
