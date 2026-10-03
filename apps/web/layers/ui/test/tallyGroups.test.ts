import { describe, expect, it } from 'vitest'
import { TALLY_MAX_MARKS, tallyGroups } from '../app/utils/tallyGroups'

describe('tallyGroups', () => {
  it('bundles marks in groups of five', () => {
    expect(tallyGroups(12)).toEqual({ groups: [5, 5, 2], overflow: false })
  })

  it('draws nothing for zero or negative counts', () => {
    expect(tallyGroups(0)).toEqual({ groups: [], overflow: false })
    expect(tallyGroups(-3)).toEqual({ groups: [], overflow: false })
  })

  it('stops at the limit and flags the overflow', () => {
    const tally = tallyGroups(TALLY_MAX_MARKS + 4)
    expect(tally.groups.reduce((sum, marks) => sum + marks, 0)).toBe(TALLY_MAX_MARKS)
    expect(tally.overflow).toBe(true)
  })
})
