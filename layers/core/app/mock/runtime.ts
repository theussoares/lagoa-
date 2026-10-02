export interface Clock {
  now(): Date
}

export interface IdGenerator {
  next(prefix: string): string
}

export interface RandomSource {
  /** Inteiro em [0, max). */
  int(max: number): number
}

export const systemClock: Clock = { now: () => new Date() }

export const uuidIds: IdGenerator = { next: (prefix) => `${prefix}_${crypto.randomUUID()}` }

export const cryptoRandom: RandomSource = {
  int: (max) => {
    const buffer = new Uint32Array(1)
    crypto.getRandomValues(buffer)
    return (buffer[0] ?? 0) % max
  },
}

/** Relógio controlável para testes e para simular "amanhã" no mock. */
export function fixedClock(start: Date): Clock & { advanceHours(hours: number): void; set(date: Date): void } {
  let current = new Date(start.getTime())
  return {
    now: () => new Date(current.getTime()),
    advanceHours: (hours) => {
      current = new Date(current.getTime() + hours * 3_600_000)
    },
    set: (date) => {
      current = new Date(date.getTime())
    },
  }
}

export function sequentialIds(): IdGenerator {
  let counter = 0
  return {
    next: (prefix) => {
      counter += 1
      return `${prefix}_${String(counter).padStart(4, '0')}`
    },
  }
}
