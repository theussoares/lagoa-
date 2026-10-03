import type { Countdown } from '../types/countdown'

/** Contagem regressiva em segundos (ex.: "Reenviar código em 24s"). Para sozinha ao desmontar. */
export function useCountdown(): Countdown {
  const remaining = ref(0)
  let timer: ReturnType<typeof setInterval> | undefined

  function start(seconds: number): void {
    clearInterval(timer)
    remaining.value = seconds
    timer = setInterval(() => {
      remaining.value = Math.max(0, remaining.value - 1)
      if (remaining.value === 0) clearInterval(timer)
    }, 1000)
  }

  onScopeDispose(() => clearInterval(timer))
  return { remaining, start }
}
