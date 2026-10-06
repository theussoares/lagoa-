<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import { focusFirstInput, useFocusTarget } from '#layers/ui/app/composables/useFocus'
import type { FocusRequest } from '#layers/ui/app/types/focus'
import type { CameraIssue, CheckInCodeKind, CheckInFocusTarget } from '../../types/checkIn'

interface Props {
  kind: CheckInCodeKind
  length: number
  cameraIssue: CameraIssue | null
  invalid: boolean
  typing: boolean
  focusRequest: FocusRequest<CheckInFocusTarget> | null
}

interface Emits {
  submit: []
  switchToCamera: []
  switchKind: []
}

const KIND_TEXT: Record<CheckInCodeKind, { label: string; invalid: string; submit: string; switchTo: string }> = {
  visit: { label: 'checkIn.visitCodeLabel', invalid: 'checkIn.invalidVisitCode', submit: 'checkIn.submitClaim', switchTo: 'checkIn.typeShopCode' },
  shop: { label: 'checkIn.shopCodeLabel', invalid: 'checkIn.invalidShopCode', submit: 'checkIn.submitJoin', switchTo: 'checkIn.typeVisitCode' },
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const code = defineModel<string[]>('code', { required: true })
const field = useTemplateRef<ComponentPublicInstance>('field')

useFocusTarget(() => props.focusRequest, 'code', () => focusFirstInput(field.value))
</script>

<template>
  <form class="flex flex-col gap-6" novalidate @submit.prevent="emit('submit')">
    <InkNote
      v-if="cameraIssue"
      tone="warning"
      icon="i-ph-camera-slash"
      :description="cameraIssue === 'denied' ? $t('checkIn.cameraDenied') : $t('checkIn.cameraUnavailable')"
    />

    <UFormField
      ref="field"
      :label="$t(KIND_TEXT[kind].label)"
      :error="invalid ? $t(KIND_TEXT[kind].invalid) : undefined"
      name="code"
    >
      <template #error="{ error: message }">
        <FieldErrorMessage :message="typeof message === 'string' ? message : undefined" />
      </template>
      <UPinInput
        :key="kind"
        v-model="code"
        :length="length"
        size="xl"
        autofocus
        :disabled="typing"
        :highlight="invalid"
        :color="invalid ? 'error' : 'primary'"
        :ui="{ root: 'w-full justify-between', base: 'uppercase w-12 [font-stretch:75%] font-semibold' }"
        @complete="emit('submit')"
      />
    </UFormField>

    <div class="flex flex-col gap-3">
      <UButton type="submit" size="xl" block :loading="typing" :label="$t(KIND_TEXT[kind].submit)" />
      <UButton
        variant="outline"
        color="neutral"
        block
        icon="i-ph-keyboard"
        :label="$t(KIND_TEXT[kind].switchTo)"
        @click="emit('switchKind')"
      />
      <UButton
        v-if="cameraIssue !== 'unavailable'"
        variant="ghost"
        color="neutral"
        block
        icon="i-ph-qr-code"
        :label="$t('checkIn.useCamera')"
        @click="emit('switchToCamera')"
      />
    </div>
  </form>
</template>
