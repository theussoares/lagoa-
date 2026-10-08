<script setup lang="ts">
import type { ViewfinderStatus } from '../../types/checkIn'

interface Props {
  status: ViewfinderStatus
}

interface Emits {
  video: [element: HTMLVideoElement | null]
  typeCode: []
}

const VIEWFINDER_TEXT: Record<ViewfinderStatus, string> = {
  busy: 'checkIn.submitting',
  joining: 'checkIn.submittingJoin',
  scanning: 'checkIn.cameraScanning',
  starting: 'checkIn.cameraStarting',
}

defineProps<Props>()
const emit = defineEmits<Emits>()
const viewfinder = useTemplateRef<{ video: HTMLVideoElement | null }>('viewfinder')

onMounted(() => emit('video', viewfinder.value?.video ?? null))
onBeforeUnmount(() => emit('video', null))
</script>

<template>
  <QrViewfinder ref="viewfinder" :label="$t('checkIn.viewfinderLabel')" :status="status === 'joining' ? 'busy' : status" :status-text="$t(VIEWFINDER_TEXT[status])" />
  <UButton variant="outline" color="neutral" size="xl" block icon="i-ph-keyboard" :label="$t('checkIn.typeVisitCode')" @click="emit('typeCode')" />
</template>
