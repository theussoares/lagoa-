import { afterEach, describe, expect, it, vi } from 'vitest'
import { useHaptics } from '../app/composables/useHaptics'

function stubVibrate(vibrate: ((pattern: VibratePattern) => boolean) | undefined): void {
  Object.defineProperty(navigator, 'vibrate', { configurable: true, writable: true, value: vibrate })
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'vibrate')
})

describe('useHaptics', () => {
  it('vibrates with a single duration', () => {
    const vibrate = vi.fn<(pattern: VibratePattern) => boolean>(() => true)
    stubVibrate(vibrate)
    useHaptics().vibrate(40)
    expect(vibrate).toHaveBeenCalledWith(40)
  })

  it('passes a read-only pattern as a plain array', () => {
    const vibrate = vi.fn<(pattern: VibratePattern) => boolean>(() => true)
    stubVibrate(vibrate)
    const pattern: readonly number[] = [30, 60, 30]
    useHaptics().vibrate(pattern)
    expect(vibrate).toHaveBeenCalledWith([30, 60, 30])
  })

  it('does nothing when the browser has no vibration support', () => {
    stubVibrate(undefined)
    expect(() => useHaptics().vibrate(40)).not.toThrow()
  })
})
