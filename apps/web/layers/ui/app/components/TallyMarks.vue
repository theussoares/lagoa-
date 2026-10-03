<script setup lang="ts">
import { TALLY_GROUP, tallyGroups } from '../utils/tallyGroups'

interface Props {
  count: number
}

const props = defineProps<Props>()

const STROKE_GAP = 5

const tally = computed(() => tallyGroups(props.count))
</script>

<template>
  <span class="flex flex-wrap items-center gap-x-2 gap-y-1 text-primary" aria-hidden="true">
    <svg v-for="(marks, index) in tally.groups" :key="index" viewBox="0 0 22 18" class="h-[18px] w-[22px]" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <line v-for="mark in Math.min(marks, TALLY_GROUP - 1)" :key="mark" :x1="mark * STROKE_GAP - 2" y1="2" :x2="mark * STROKE_GAP - 2" y2="16" />
      <line v-if="marks === TALLY_GROUP" x1="1" y1="14" x2="21" y2="4" />
    </svg>
    <span v-if="tally.overflow" class="text-base font-semibold">+</span>
  </span>
</template>
