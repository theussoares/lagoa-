import type { StampSlotModel } from '#layers/ui/app/types/wallet'

// Inclinações fixas por casa, como no app: cada carimbo cai torto do seu jeito.
const SLOT_TILTS = [-4, 3, -2, 5, -5, 2, -3, 4, -1, 3] as const

/** Casas de um cartão de exemplo; a última carimbada recebe a batida (`fresh`). */
export function sampleSlots(total: number, stamped: number, freshDelayMs: number): StampSlotModel[] {
  return Array.from({ length: total }, (_, index) => {
    const number = index + 1
    return {
      number,
      stamped: number <= stamped,
      isRewardSlot: number === total,
      tilt: SLOT_TILTS[index % SLOT_TILTS.length] ?? 0,
      fresh: number === stamped,
      delayMs: freshDelayMs,
    }
  })
}
