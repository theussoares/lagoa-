import { describe, expect, it } from 'vitest'
import { isReachableForReminder } from './customer'

describe('isReachableForReminder', () => {
  it('only reaches lapsed customers who accepted notifications', () => {
    expect(isReachableForReminder({ isLapsed: true, acceptsNotifications: true })).toBe(true)
    expect(isReachableForReminder({ isLapsed: true, acceptsNotifications: false })).toBe(false)
    expect(isReachableForReminder({ isLapsed: false, acceptsNotifications: true })).toBe(false)
  })
})
