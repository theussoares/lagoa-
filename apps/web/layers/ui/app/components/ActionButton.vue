<script setup lang="ts">
import type { ActionRole, ActionSize, ActionSurface } from '../types/action'
import { ACTION_ROLES } from '../utils/actionRole'

interface Props {
  role: ActionRole
  surface?: ActionSurface
  size?: ActionSize
}

const props = withDefaults(defineProps<Props>(), { surface: 'light', size: undefined })
const look = computed(() => ACTION_ROLES[props.role])
</script>

<template>
  <UButton
    :color="look.color"
    :variant="look.variant"
    :size="size ?? look.size"
    class="cursor-pointer transition-all duration-150 active:scale-[0.98]"
    :class="surface === 'dark' ? 'focus-visible:outline-white' : undefined"
  />
</template>
