<script setup lang="ts">
import type { CheckInNoticeModel } from '../../types/checkIn'

interface Props {
  notice: CheckInNoticeModel
}

interface Emits {
  recover: []
  typeCode: []
}

defineProps<Props>()
const emit = defineEmits<Emits>()
</script>

<template>
  <div class="flex flex-col gap-5 rounded-(--radius-card) bg-default p-5 shadow-(--lagoa-shadow-card)" role="alert">
    <div class="flex items-start gap-3">
      <UIcon
        :name="notice.icon"
        class="mt-0.5 size-7 shrink-0"
        :class="notice.tone === 'warning' ? 'text-warning' : 'text-error'"
        aria-hidden="true"
      />
      <div class="flex min-w-0 flex-col gap-1">
        <h2 class="text-[1.375rem] leading-tight font-semibold text-highlighted [font-stretch:95%]">{{ notice.title }}</h2>
        <p class="text-pretty text-toned">{{ notice.message }}</p>
      </div>
    </div>
    <div class="flex flex-col gap-3">
      <UButton v-if="notice.recovery === 'wallet'" to="/carteira" size="xl" block :label="$t('checkIn.toWallet')" />
      <template v-else>
        <UButton
          size="xl"
          block
          :icon="notice.recovery === 'retry' ? 'i-ph-arrow-counter-clockwise' : 'i-ph-qr-code'"
          :label="notice.recovery === 'retry' ? $t('common.retry') : $t('checkIn.scanAgain')"
          @click="emit('recover')"
        />
        <UButton variant="outline" color="neutral" size="xl" block icon="i-ph-keyboard" :label="$t('checkIn.typeVisitCode')" @click="emit('typeCode')" />
      </template>
    </div>
  </div>
</template>
