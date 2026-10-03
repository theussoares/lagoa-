<script setup lang="ts">
import type { TabBarItem } from '../types/wallet'

interface Props {
  /** Quatro destinos; os dois primeiros ficam à esquerda da ação central. */
  items: readonly [TabBarItem, TabBarItem, TabBarItem, TabBarItem]
  action: TabBarItem
  label: string
  /** Rota atual; quem conhece o roteador é o layout. */
  currentPath: string
}

const props = defineProps<Props>()

const left = computed(() => props.items.slice(0, 2))
const right = computed(() => props.items.slice(2))

function tabClass(item: TabBarItem): string[] {
  return [
    'flex h-full flex-col items-center justify-center gap-1 text-[0.8125rem] leading-none transition-colors duration-(--lagoa-dur-fast)',
    isActive(item) ? 'font-semibold text-primary' : 'font-medium text-muted hover:text-highlighted',
  ]
}

function isActive(item: TabBarItem): boolean {
  return props.currentPath === item.to || props.currentPath.startsWith(`${item.to}/`)
}
</script>

<template>
  <nav
    :aria-label="label"
    class="fixed inset-x-0 bottom-0 z-30 border-t border-(--lagoa-rule) bg-default pb-[env(safe-area-inset-bottom)]"
  >
    <ul class="mx-auto grid h-16 max-w-[480px] grid-cols-5 items-stretch px-2">
      <li v-for="item in left" :key="item.to">
        <NuxtLink :to="item.to" :class="tabClass(item)" :aria-current="isActive(item) ? 'page' : undefined">
          <UIcon :name="isActive(item) ? item.activeIcon : item.icon" class="size-6" aria-hidden="true" />
          <span>{{ item.label }}</span>
        </NuxtLink>
      </li>
      <li class="flex justify-center">
        <NuxtLink
          :to="action.to"
          class="-mt-5 flex flex-col items-center gap-1 text-[0.8125rem] font-semibold text-highlighted"
          :aria-current="isActive(action) ? 'page' : undefined"
        >
          <span class="grid size-16 place-items-center rounded-full bg-primary text-inverted shadow-(--lagoa-shadow-card) ring-4 ring-(--lagoa-desk) transition-transform duration-(--lagoa-dur-fast) active:scale-95">
            <UIcon :name="action.icon" class="size-7" aria-hidden="true" />
          </span>
          <span class="leading-none">{{ action.label }}</span>
        </NuxtLink>
      </li>
      <li v-for="item in right" :key="item.to">
        <NuxtLink :to="item.to" :class="tabClass(item)" :aria-current="isActive(item) ? 'page' : undefined">
          <UIcon :name="isActive(item) ? item.activeIcon : item.icon" class="size-6" aria-hidden="true" />
          <span>{{ item.label }}</span>
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>
