<script setup lang="ts">
import { useFocusTarget } from '#layers/ui/app/composables/useFocus'
import type { FocusRequest } from '#layers/ui/app/types/focus'
import type { CheckInEarnedView, CheckInFocusTarget } from '../../types/checkIn'

interface Props {
  earned: CheckInEarnedView
  image: string
  focusRequest: FocusRequest<CheckInFocusTarget> | null
}

/** A frase de ânimo cai logo depois da impressão grande. */
const CHEER_DELAY_MS = 260

const props = defineProps<Props>()
const heading = useTemplateRef<{ focus: () => void }>('heading')

useFocusTarget(() => props.focusRequest, 'earnedHeading', () => heading.value?.focus())
</script>

<template>
  <section aria-labelledby="earned-title">
    <ScreenHeader
      ref="heading"
      heading-id="earned-title"
      :title="earned.text.title"
      :lead="earned.text.lead"
      :image="image"
      :overlap="Boolean(earned.card)"
      focusable
    >
      <template #actions>
        <!-- A batida grande: o carimbo cai na faixa antes de passar para o cartão. -->
        <span class="relative z-10 size-24 shrink-0">
          <StampImpression :icon="earned.heroStamp.icon" :tilt="earned.heroStamp.tilt" :tone="earned.heroStamp.tone" pressed />
        </span>
      </template>
      <p
        v-if="earned.text.cheer"
        class="letreiro stamp-press self-start rounded-[6px] px-2.5 py-1 text-xl text-white ring-2 ring-current [--stamp-tilt:-2deg]"
        :style="{ animationDelay: `${CHEER_DELAY_MS}ms` }"
      >
        {{ earned.text.cheer }}
      </p>
    </ScreenHeader>

    <div class="flex flex-col gap-6" :class="{ 'relative -mt-10': earned.card }">
      <StampCard v-if="earned.card" :card="earned.card" />

      <p class="text-base text-muted">{{ earned.text.next }}</p>

      <div class="flex flex-col gap-3">
        <ActionButton
          v-if="earned.rewardCardId"
          role="reward"
          :to="`/premios/${earned.rewardCardId}`"
          block
          icon="i-ph-gift"
          :label="$t('checkIn.earned.redeem')"
        />
        <ActionButton
          :role="earned.rewardCardId ? 'secondary' : 'primary'"
          to="/carteira"
          size="xl"
          block
          :label="$t('checkIn.toWallet')"
        />
      </div>
    </div>
  </section>
</template>
