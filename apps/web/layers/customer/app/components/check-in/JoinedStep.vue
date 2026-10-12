<script setup lang="ts">
import { useFocusTarget } from '#layers/ui/app/composables/useFocus'
import type { FocusRequest } from '#layers/ui/app/types/focus'
import type { CheckInFocusTarget, CheckInJoinedView } from '../../types/checkIn'

interface Props {
  joined: CheckInJoinedView
  image: string
  focusRequest: FocusRequest<CheckInFocusTarget> | null
}

const props = defineProps<Props>()
const heading = useTemplateRef<{ focus: () => void }>('heading')

useFocusTarget(() => props.focusRequest, 'joinedHeading', () => heading.value?.focus())
</script>

<template>
  <section aria-labelledby="joined-title">
    <ScreenHeader
      ref="heading"
      heading-id="joined-title"
      :title="joined.text.title"
      :lead="joined.text.lead"
      :image="image"
      :overlap="Boolean(joined.card)"
      focusable
    />

    <!-- Só um cartão sobe sobre a faixa; sem ele o texto escuro começa abaixo dela. -->
    <div class="flex flex-col gap-6" :class="{ 'relative -mt-10': joined.card }">
      <StampCard v-if="joined.card" :card="joined.card" />

      <div class="flex flex-col gap-2 text-base text-muted">
        <p v-if="joined.text.welcome">{{ joined.text.welcome }}</p>
        <p>{{ joined.text.next }}</p>
      </div>

      <UButton to="/carteira" size="xl" block :label="$t('checkIn.joined.toWallet')" />
    </div>
  </section>
</template>
