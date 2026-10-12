<script setup lang="ts">
import { RANKING_NAME_MAX_LENGTH } from '#shared/constants/domain'

interface Props {
  pending: boolean
  labels: { name: string; help: string; submit: string }
}

defineProps<Props>()
const emit = defineEmits<{ join: [name: string] }>()
const name = ref('')
</script>

<template>
  <form class="card flex flex-col gap-3 p-4" @submit.prevent="emit('join', name)">
    <UFormField :label="labels.name" :help="labels.help">
      <UInput v-model="name" size="xl" class="w-full" :maxlength="RANKING_NAME_MAX_LENGTH" autocomplete="off" />
    </UFormField>
    <ActionButton role="primary" size="lg" type="submit" block :loading="pending" :label="labels.submit" />
  </form>
</template>
