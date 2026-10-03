import type { Ref } from 'vue'

export interface Countdown {
  remaining: Readonly<Ref<number>>
  start: (seconds: number) => void
}
