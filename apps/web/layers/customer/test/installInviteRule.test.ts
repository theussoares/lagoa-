import { describe, expect, it } from 'vitest'
import type { InstallInviteContext } from '../app/types/installInvite'
import { countEarnings, EMPTY_INSTALL_MEMORY, shouldShowInstallInvite } from '../app/utils/installInviteRule'
import { detectInstallPlatform } from '../app/utils/installPlatform'

const base: InstallInviteContext = { platform: 'android', standalone: false, earnedCount: 1, memory: EMPTY_INSTALL_MEMORY }
const show = (patch: Partial<InstallInviteContext>) => shouldShowInstallInvite({ ...base, ...patch })

describe('shouldShowInstallInvite', () => {
  it('waits for the first earning', () => {
    expect(show({ earnedCount: 0 })).toBe(false)
    expect(show({ earnedCount: 1 })).toBe(true)
  })

  it('never shows when installed, standalone or on an unsupported device', () => {
    expect(show({ standalone: true })).toBe(false)
    expect(show({ platform: null })).toBe(false)
    expect(show({ memory: { ...EMPTY_INSTALL_MEMORY, installed: true } })).toBe(false)
  })

  it('comes back only after a new earning, at most twice', () => {
    const dismissed = (count: number, earned: number) => ({ dismissedCount: count, earnedAtDismiss: earned, installed: false })
    expect(show({ earnedCount: 1, memory: dismissed(1, 1) })).toBe(false)
    expect(show({ earnedCount: 2, memory: dismissed(1, 1) })).toBe(true)
    expect(show({ earnedCount: 3, memory: dismissed(2, 2) })).toBe(true)
    expect(show({ earnedCount: 4, memory: dismissed(3, 3) })).toBe(false)
  })
})

describe('countEarnings', () => {
  it('counts what earned stamps or points, not redemptions', () => {
    expect(countEarnings([{ kind: 'visit' }, { kind: 'checkIn' }, { kind: 'redemption' }, { kind: 'campaignBonus' }])).toBe(2)
  })
})

describe('detectInstallPlatform', () => {
  const iphoneSafari = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'
  it('recognises Safari on iPhone and Chrome on Android', () => {
    expect(detectInstallPlatform(iphoneSafari, 5)).toBe('ios')
    expect(detectInstallPlatform('Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/124.0 Mobile Safari/537.36', 5)).toBe('android')
  })
  it('skips other iOS browsers, in-app browsers and desktops', () => {
    expect(detectInstallPlatform(`${iphoneSafari} CriOS/124`, 5)).toBeNull()
    expect(detectInstallPlatform(`${iphoneSafari} Instagram 300`, 5)).toBeNull()
    expect(detectInstallPlatform('Mozilla/5.0 (Windows NT 10.0) Chrome/124.0 Safari/537.36', 0)).toBeNull()
  })
})
