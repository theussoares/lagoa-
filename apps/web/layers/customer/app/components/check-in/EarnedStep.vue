<script setup lang="ts">
import { useFocusTarget } from '#layers/ui/app/composables/useFocus'
import type { FocusRequest } from '#layers/ui/app/types/focus'
import type { CheckInEarnedView, CheckInFocusTarget } from '../../types/checkIn'

interface Props {
  earned: CheckInEarnedView
  focusRequest: FocusRequest<CheckInFocusTarget> | null
}

/** A frase de ânimo cai logo depois da impressão grande. */
const CHEER_DELAY_MS = 260

const props = defineProps<Props>()
const heading = useTemplateRef<{ focus: () => void }>('heading')

useFocusTarget(() => props.focusRequest, 'earnedHeading', () => heading.value?.focus())
</script>

<template>
  <section class="flex flex-col gap-6" aria-labelledby="earned-title">
    <PageTitle ref="heading" heading-id="earned-title" :title="earned.text.title" :lead="earned.text.lead" focusable class="pt-2">
      <template #actions>
        <!-- A batida grande: o carimbo cai na página, por cima da régua, antes de passar para o cartão. -->
        <span class="relative z-10 -mt-4 -mb-9 size-24 shrink-0">
          <StampImpression :icon="earned.heroStamp.icon" :tilt="earned.heroStamp.tilt" :tone="earned.heroStamp.tone" pressed />
        </span>
      </template>
      <p
        v-if="earned.text.cheer"
        class="letreiro stamp-press self-start rounded-[6px] px-2.5 py-1 text-xl text-primary ring-2 ring-current [--stamp-tilt:-2deg]"
        :style="{ animationDelay: `${CHEER_DELAY_MS}ms` }"
      >
        {{ earned.text.cheer }}
      </p>
    </PageTitle>

    <StampCard v-if="earned.card" :card="earned.card" />

    <p class="text-base text-muted">{{ earned.text.next }}</p>

    <div class="flex flex-col gap-3">
      <UButton
        v-if="earned.rewardCardId"
        :to="`/premios/${earned.rewardCardId}`"
        color="secondary"
        size="xl"
        block
        icon="i-ph-gift"
        :label="$t('checkIn.earned.redeem')"
      />
      <UButton
        to="/carteira"
        size="xl"
        block
        :variant="earned.rewardCardId ? 'outline' : 'solid'"
        :color="earned.rewardCardId ? 'neutral' : 'primary'"
        :label="$t('checkIn.toWallet')"
      />
    </div>
  </section>
</template>
