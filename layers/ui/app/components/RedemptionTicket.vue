<script setup lang="ts">
import type { RedemptionTicketState } from '../types/redemption'

interface Props {
  shopName: string
  icon: string
  reward: string
  codeLabel: string
  state: RedemptionTicketState
}

const props = defineProps<Props>()

const titleId = useId()

const code = computed(() => (props.state.kind === 'redeemed' ? '' : props.state.code))
// Leitor de tela soletra letra por letra, do jeito que o cliente lê em voz alta no balcão.
const spelledCode = computed(() => code.value.split('').join(' '))
const groups = computed(() => [code.value.slice(0, 3), code.value.slice(3)])
</script>

<template>
  <section :aria-labelledby="titleId" class="rounded-(--radius-card) bg-default shadow-(--lagoa-shadow-card)">
    <header class="flex items-center gap-4 px-5 pt-5 pb-5">
      <span class="size-12 shrink-0">
        <StampImpression :icon="icon" :tilt="-5" tone="reward" />
      </span>
      <div class="min-w-0">
        <p class="letreiro truncate text-[1.0625rem] text-toned">{{ shopName }}</p>
        <h2 :id="titleId" class="text-[1.375rem] leading-tight font-semibold text-balance text-highlighted [font-stretch:95%]">
          {{ reward }}
        </h2>
      </div>
    </header>

    <StubPerforation />

    <div class="flex flex-col gap-4 px-5 pt-5 pb-6">
      <template v-if="state.kind === 'redeemed'">
        <div class="flex min-h-[7.5rem] items-center justify-center">
          <RewardSeal :label="state.seal" :tilt="-6" pressed />
        </div>
        <p class="text-center text-pretty text-toned" role="status">{{ state.note }}</p>
      </template>

      <template v-else>
        <div class="flex flex-col items-center gap-1">
          <span class="text-[0.9375rem] font-medium text-muted" aria-hidden="true">{{ codeLabel }}</span>
          <p
            role="img"
            :aria-label="`${codeLabel}: ${spelledCode}`"
            class="ticket-code flex gap-[0.35em] text-[4rem] leading-none font-extrabold uppercase tabular [font-stretch:62%]"
            :class="state.kind === 'active' ? 'text-secondary' : 'text-muted line-through decoration-2'"
          >
            <span v-for="(group, groupIndex) in groups" :key="groupIndex" class="flex gap-[0.08em]">
              <span
                v-for="(char, charIndex) in group"
                :key="`${code}-${groupIndex}-${charIndex}`"
                class="ticket-char"
                :style="{ animationDelay: `${(groupIndex * 3 + charIndex) * 45}ms` }"
              >{{ char }}</span>
            </span>
          </p>
        </div>

        <div v-if="state.kind === 'active'" class="flex flex-col gap-2">
          <p
            class="flex items-center justify-center gap-1.5 text-[0.9375rem] font-medium"
            :class="state.urgent ? 'text-warning' : 'text-toned'"
          >
            <UIcon :name="state.urgent ? 'i-ph-warning-circle' : 'i-ph-timer'" class="size-5" aria-hidden="true" />
            <span>{{ state.clockLabel }}</span>
            <span class="tabular font-semibold" role="timer" aria-live="off">{{ state.clock }}</span>
          </p>
          <!-- Régua do prazo: encolhe junto com a contagem. -->
          <div class="h-1 overflow-hidden rounded-full bg-(--lagoa-rule)" aria-hidden="true">
            <div
              class="h-full origin-left rounded-full transition-transform duration-1000 ease-linear motion-reduce:transition-none"
              :class="state.urgent ? 'bg-warning' : 'bg-secondary'"
              :style="{ transform: `scaleX(${state.remainingFraction})` }"
            />
          </div>
        </div>

        <p v-else class="flex items-start justify-center gap-1.5 text-center text-pretty text-warning">
          <UIcon name="i-ph-warning-circle" class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <span>{{ state.note }}</span>
        </p>
      </template>

      <slot />
    </div>
  </section>
</template>
