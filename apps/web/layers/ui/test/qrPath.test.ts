import { describe, expect, it } from 'vitest'
import { qrPath } from '../app/utils/qrPath'

describe('qrPath', () => {
  it('draws the QR with a 4-module quiet zone and the finder pattern in the corner', () => {
    const { size, d } = qrPath('https://lagoa.test/check-in?loja=NAV4K7')
    // Versão mínima do QR tem 21 módulos; com a margem de 4 dos dois lados, 29.
    expect(size).toBeGreaterThanOrEqual(29)
    expect(d.startsWith('M4 4h1v1h-1z')).toBe(true)
    expect(d).not.toContain('M0 0')
  })
})
