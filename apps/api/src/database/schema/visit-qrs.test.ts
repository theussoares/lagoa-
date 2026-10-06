import { getTableConfig } from 'drizzle-orm/pg-core'
import { describe, expect, it } from 'vitest'
import { VISIT_CODE_LENGTH } from '#shared/constants/domain'
import { visitQrs } from './visit-qrs'

describe('visit_qrs table', () => {
  it('keeps the visit code column as long as the contract says (the schema file cannot import the constant)', () => {
    const column = getTableConfig(visitQrs).columns.find((c) => c.name === 'visit_code')
    expect(column).toMatchObject({ length: VISIT_CODE_LENGTH })
  })
})
