import { describe, expect, it } from 'vitest'
import { PhoneNumberSchema } from '#shared/schemas/phone'
import type { OtpChannel } from '#shared/schemas/session'
import { OtpChannelChoice } from './otp-channel-choice'
import { OtpChannelStore } from './otp-channel.store'

const PHONE = PhoneNumberSchema.parse('67991230374')
const OTHER = PhoneNumberSchema.parse('67991230375')
const NOW = new Date('2026-10-13T12:00:00Z')

class MemoryStore extends OtpChannelStore {
  rows = new Map<string, { channel: OtpChannel; at: Date }>()
  broken = false
  async save(hash: Buffer, channel: OtpChannel, now: Date): Promise<void> {
    this.rows.set(hash.toString('hex'), { channel, at: now })
  }
  async find(hash: Buffer, notBefore: Date): Promise<OtpChannel | null> {
    if (this.broken) throw new Error('db down')
    const row = this.rows.get(hash.toString('hex'))
    return row !== undefined && row.at > notBefore ? row.channel : null
  }
}

const pii = { hashPhone: (phone: string) => Buffer.from(phone) }

function build(now: () => Date) {
  const store = new MemoryStore()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const choice = new OtpChannelChoice(store, pii as any, { now } as any)
  return { store, choice }
}

describe('OtpChannelChoice', () => {
  it('defaults to WhatsApp without a choice', async () => {
    expect(await build(() => NOW).choice.current(PHONE)).toBe('whatsapp')
  })

  it('returns the most recent choice for that phone only', async () => {
    const { choice } = build(() => NOW)
    await choice.choose(PHONE, 'sms')
    expect(await choice.current(PHONE)).toBe('sms')
    expect(await choice.current(OTHER)).toBe('whatsapp')
    await choice.choose(PHONE, 'whatsapp')
    expect(await choice.current(PHONE)).toBe('whatsapp')
  })

  it('forgets the choice after the code lifetime', async () => {
    let current = NOW
    const { choice } = build(() => current)
    await choice.choose(PHONE, 'sms')
    current = new Date(NOW.getTime() + 6 * 60_000)
    expect(await choice.current(PHONE)).toBe('whatsapp')
  })

  it('propagates read failures instead of silently defaulting', async () => {
    const { choice, store } = build(() => NOW)
    store.broken = true
    await expect(choice.current(PHONE)).rejects.toThrow('db down')
  })
})
