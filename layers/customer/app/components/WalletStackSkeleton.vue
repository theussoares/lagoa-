<script setup lang="ts">
const SLOTS = 10
const PEEKS = 2
</script>

<template>
  <div class="flex flex-col" aria-hidden="true">
    <div class="rounded-(--radius-card) bg-default shadow-(--lagoa-shadow-card)">
      <div class="flex items-center gap-3 px-5 pt-5 pb-4">
        <USkeleton class="size-6 rounded-full" />
        <div class="flex flex-col gap-2">
          <USkeleton class="h-5 w-40" />
          <USkeleton class="h-4 w-24" />
        </div>
      </div>
      <div class="grid grid-cols-5 gap-3 border-t border-(--lagoa-rule) px-5 py-5">
        <USkeleton v-for="slot in SLOTS" :key="slot" class="aspect-square rounded-full" />
      </div>
      <div class="flex items-center gap-4 border-t border-(--lagoa-rule) px-5 pt-4 pb-5">
        <USkeleton class="h-14 w-10" />
        <div class="flex flex-col gap-2">
          <USkeleton class="h-4 w-28" />
          <USkeleton class="h-6 w-36" />
        </div>
      </div>
    </div>
    <div
      v-for="peek in PEEKS"
      :key="peek"
      class="-mt-3 h-15 rounded-b-(--radius-card) bg-default shadow-(--lagoa-shadow-card)"
      :style="{ marginInline: `${peek * 6}px`, zIndex: -peek }"
    />
  </div>
</template>
