import { describe, expect, it } from 'vitest'
import { dayOptions, daysInMonth, formatBirthday, formatChangeableAt, joinBirthday, monthOptions, splitBirthday } from '../app/utils/birthdayModel'

describe('birthdayModel', () => {
  it('counts February 29 as a real birthday', () => {
    expect(daysInMonth(2)).toBe(29)
    expect(joinBirthday({ day: 29, month: 2 })).toBe('02-29')
  })

  it('rejects a day the month does not have', () => {
    expect(joinBirthday({ day: 31, month: 4 })).toBeNull()
  })

  it('waits for both day and month', () => {
    expect(joinBirthday({ day: 12, month: null })).toBeNull()
    expect(joinBirthday({ day: null, month: 3 })).toBeNull()
  })

  it('round-trips the stored MM-DD format', () => {
    expect(splitBirthday('03-12')).toEqual({ day: 12, month: 3 })
    expect(splitBirthday(null)).toEqual({ day: null, month: null })
    expect(joinBirthday(splitBirthday('11-05'))).toBe('11-05')
  })

  it('names the months in Portuguese and limits days to the month', () => {
    expect(monthOptions()[2]).toEqual({ label: 'março', value: '3' })
    expect(dayOptions(4)).toHaveLength(30)
    expect(dayOptions(null)).toHaveLength(31)
  })

  it('reads the birthday the way people say it', () => {
    expect(formatBirthday('03-12')).toBe('12 de março')
  })

  it('writes the unlock date in full, with the year', () => {
    expect(formatChangeableAt('2027-10-02T16:00:00Z')).toBe('2 de outubro de 2027')
  })
})
