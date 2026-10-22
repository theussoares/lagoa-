<script setup lang="ts">
interface Props {
  open: boolean
}

defineProps<Props>()
const emit = defineEmits<{ 'update:open': [open: boolean] }>()
const { t } = useI18n()

const entries = [
  { to: '/ranking', label: 'moreMenu.ranking', icon: 'i-ph-trophy' },
  { to: '/perfil', label: 'moreMenu.profile', icon: 'i-ph-user-circle' },
] as const
</script>

<template>
  <UDrawer :open="open" :title="t('moreMenu.title')" @update:open="emit('update:open', $event)">
    <template #body>
      <nav :aria-label="t('moreMenu.title')">
        <ul class="flex flex-col divide-y divide-(--lagoa-rule)">
          <li v-for="entry in entries" :key="entry.to">
            <NuxtLink
              :to="entry.to"
              class="flex h-14 items-center gap-4 text-lg text-highlighted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              @click="emit('update:open', false)"
            >
              <span class="grid size-9 shrink-0 place-items-center rounded-xl bg-muted text-primary" aria-hidden="true">
                <UIcon :name="entry.icon" class="size-5" />
              </span>
              <span class="flex-1 font-semibold">{{ t(entry.label) }}</span>
              <UIcon name="i-ph-caret-right" class="size-5 shrink-0 text-muted" aria-hidden="true" />
            </NuxtLink>
          </li>
        </ul>
      </nav>
    </template>
  </UDrawer>
</template>
