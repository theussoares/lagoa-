<script setup lang="ts">
import type { HitItemCardModel } from '../../types/hits'

interface Props {
  item: HitItemCardModel
}

defineProps<Props>()
</script>

<template>
  <article class="card flex h-full flex-col overflow-hidden">
    <img :src="item.photoUrl" alt="" loading="lazy" class="aspect-square w-full bg-(--color-tinta-100) object-cover dark:bg-(--color-tinta-900)" />
    <div class="flex flex-1 flex-col gap-1 px-3 pt-3 pb-3">
      <h3 class="text-base leading-snug font-semibold text-balance text-highlighted">{{ item.title }}</h3>
      <p class="truncate text-sm text-muted">{{ item.shopName }}</p>
      <p class="font-display mt-1 text-lg font-bold text-highlighted tabular-nums">{{ item.price }}</p>
      <p v-if="item.earning" class="flex flex-wrap gap-1">
        <span class="rounded-full bg-(--color-sol-100) px-2 py-0.5 text-sm font-bold text-(--color-sol-900) dark:bg-(--color-sol-900) dark:text-(--color-sol-200)">
          {{ item.earning.label }}
        </span>
        <span v-if="item.earning.doubled" class="rounded-full bg-(--color-sol-400) px-2 py-0.5 text-sm font-bold text-(--color-sol-900)">
          {{ item.earning.doubled }}
        </span>
      </p>
      <ActionButton
        v-if="item.contact"
        role="secondary"
        :to="item.contact.href"
        target="_blank"
        rel="noopener noreferrer nofollow"
        external
        block
        :icon="item.contact.icon"
        :label="item.contact.label"
        :aria-label="item.contact.accessibleLabel"
        class="mt-auto min-h-11"
      />
    </div>
  </article>
</template>
