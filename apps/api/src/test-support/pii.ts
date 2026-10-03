import { randomBytes } from 'node:crypto'
import type { Env } from '../config/env'
import { PiiService } from '../common/pii.service'

export function createTestPii(): PiiService {
  return new PiiService({
    PII_ENCRYPTION_KEY: randomBytes(32).toString('base64'),
    PII_HASH_PEPPER: 'a-long-enough-test-pepper',
  } as Env)
}
