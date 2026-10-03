<script setup lang="ts">
import { charPosition, groupCode, spellCode } from '../utils/ticketCode'

interface Props {
  code: string
  codeLabel: string
  active: boolean
}

const props = defineProps<Props>()

const spelledCode = computed(() => spellCode(props.code))
const groups = computed(() => groupCode(props.code))
</script>

<template>
  <div class="flex flex-col items-center gap-1">
    <span class="text-base font-medium text-muted" aria-hidden="true">{{ codeLabel }}</span>
    <p
      role="img"
      :aria-label="`${codeLabel}: ${spelledCode}`"
      class="ticket-code flex gap-[0.35em] text-[4rem] leading-none font-extrabold uppercase tabular [font-stretch:62%]"
      :class="active ? 'text-secondary' : 'text-muted line-through decoration-2'"
    >
      <span v-for="(group, groupIndex) in groups" :key="groupIndex" class="flex gap-[0.08em]">
        <span
          v-for="(char, charIndex) in group"
          :key="`${code}-${groupIndex}-${charIndex}`"
          class="ticket-char"
          :style="{ animationDelay: `${charPosition(groupIndex, charIndex) * 45}ms` }"
        >{{ char }}</span>
      </span>
    </p>
  </div>
</template>
