<script setup lang="ts">
import type { TabBarItem } from '../types/wallet'

interface Props {
  item: TabBarItem
  active: boolean
}

const props = defineProps<Props>()

const tabClass = computed(() => [
  'flex h-full flex-col items-center justify-center gap-1 text-sm leading-none transition-colors duration-(--lagoa-dur-fast)',
  props.active ? 'font-semibold text-primary' : 'font-medium text-muted hover:text-highlighted',
])
</script>

<template>
  <button
    v-if="item.kind === 'button'"
    type="button"
    aria-haspopup="dialog"
    :aria-expanded="active ? 'true' : 'false'"
    class="w-full cursor-pointer"
    :class="tabClass"
    @click="item.onSelect()"
  >
    <UIcon :name="active ? item.activeIcon : item.icon" class="size-6" aria-hidden="true" />
    <span>{{ item.label }}</span>
  </button>
  <NuxtLink v-else :to="item.to" :class="tabClass" :aria-current="active ? 'page' : undefined">
    <UIcon :name="active ? item.activeIcon : item.icon" class="size-6" aria-hidden="true" />
    <span>{{ item.label }}</span>
  </NuxtLink>
</template>
