import { customType, timestamp, uuid } from 'drizzle-orm/pg-core'
import { uuidv7 } from 'uuidv7'

export const bytea = customType<{ data: Buffer }>({
  dataType: () => 'bytea',
})

export const primaryId = () =>
  uuid('id')
    .primaryKey()
    .$defaultFn(() => uuidv7())

export const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
