import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const css = readFileSync(fileURLToPath(new URL('../app/assets/css/main.css', import.meta.url)), 'utf8')

function hex(token: string): string {
  const match = new RegExp(`--color-${token}:\\s*(#[0-9A-Fa-f]{6})`).exec(css)
  if (match?.[1] === undefined) throw new Error(`token ${token} not found`)
  return match[1]
}

function luminance(color: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16) / 255)
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (light + 0.05) / (dark + 0.05)
}

describe('action contrast', () => {
  it('keeps white text readable on the solid primary and reward buttons (4.5:1)', () => {
    expect(contrast('#FFFFFF', hex('tinta-700'))).toBeGreaterThanOrEqual(4.5)
    expect(contrast('#FFFFFF', hex('carimbo-600'))).toBeGreaterThanOrEqual(4.5)
  })

  it('keeps the white focus ring visible on the dark header strip (3:1)', () => {
    expect(contrast('#FFFFFF', hex('tinta-800'))).toBeGreaterThanOrEqual(3)
  })
})
