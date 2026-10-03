import { describe, expect, it } from 'vitest'
import type { Translate } from '../app/types/i18n'
import { unitsText } from '../app/utils/units'

const t: Translate = (key, named, plural) => `${key}|${JSON.stringify(named ?? {})}|${plural ?? ''}`

describe('unitsText', () => {
  it('asks the plural form of the unit key with the count', () => {
    expect(unitsText(t, 'stamp', 3)).toBe('units.stamp|{"count":3}|3')
    expect(unitsText(t, 'point', 1)).toBe('units.point|{"count":1}|1')
  })

  it('keeps zero as a count too', () => {
    expect(unitsText(t, 'stamp', 0)).toBe('units.stamp|{"count":0}|0')
  })
})
