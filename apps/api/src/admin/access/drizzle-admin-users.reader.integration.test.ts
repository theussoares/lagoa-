import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { TEST_DATABASE_URL, TestDatabase } from '../../test-support/test-database'
import { DrizzleAdminUsersReader } from './drizzle-admin-users.reader'

describe.skipIf(!TEST_DATABASE_URL)('DrizzleAdminUsersReader (integration)', () => {
  let testDb: TestDatabase
  let reader: DrizzleAdminUsersReader

  beforeAll(() => {
    testDb = new TestDatabase(TEST_DATABASE_URL as string)
    reader = new DrizzleAdminUsersReader(testDb.db)
  })
  afterAll(async () => {
    await testDb.cleanup()
    await testDb.close()
  })

  it('knows an active admin', async () => {
    const { id } = await testDb.createAdminUser()
    expect(await reader.isActiveAdmin(id)).toBe(true)
  })

  it('refuses a disabled admin', async () => {
    const { id } = await testDb.createAdminUser({ disabledAt: new Date() })
    expect(await reader.isActiveAdmin(id)).toBe(false)
  })

  it('refuses someone who was never invited', async () => {
    expect(await reader.isActiveAdmin(randomUUID())).toBe(false)
  })
})
