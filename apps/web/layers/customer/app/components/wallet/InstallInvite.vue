<script setup lang="ts">
import type { InstallPlatform } from '../../types/installInvite'

interface Props {
  platform: InstallPlatform
  title: string
  lead: string
  action: string
  dismissLabel: string
  stepsTitle: string
  steps: readonly string[]
}

defineProps<Props>()
const emit = defineEmits<{ install: []; dismiss: [] }>()
const stepsOpen = ref(false)

function accept(platform: InstallPlatform): void {
  if (platform === 'android') emit('install')
  else stepsOpen.value = !stepsOpen.value
}
</script>

<template>
  <section class="card flex flex-col gap-4 px-5 py-5" aria-labelledby="install-invite-title">
    <div class="flex flex-col gap-1">
      <h2 id="install-invite-title" class="type-h2">{{ title }}</h2>
      <p class="text-pretty text-toned">{{ lead }}</p>
    </div>
    <ol v-if="platform === 'ios' && stepsOpen" class="flex list-decimal flex-col gap-2 pl-5 text-toned" :aria-label="stepsTitle">
      <li v-for="step in steps" :key="step">{{ step }}</li>
    </ol>
    <div class="flex flex-col gap-2">
      <ActionButton
        role="primary"
        block
        icon="i-ph-device-mobile"
        :label="action"
        :aria-expanded="platform === 'ios' ? stepsOpen : undefined"
        @click="accept(platform)"
      />
      <ActionButton role="secondary" block :label="dismissLabel" @click="emit('dismiss')" />
    </div>
  </section>
</template>
