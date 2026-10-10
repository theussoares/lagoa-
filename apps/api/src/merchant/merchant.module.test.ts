import { Test } from '@nestjs/testing'
import { describe, expect, it } from 'vitest'
import { Clock } from '../common/clock'
import { CommonModule } from '../common/common.module'
import { PiiService } from '../common/pii.service'
import { DB, SQL } from '../database/database.module'
import { createTestPii } from '../test-support/pii'
import { MerchantModule } from './merchant.module'
import { MerchantShopGuard } from './access/merchant-shop.guard'

/**
 * Os testes http trocam o guard da loja por um falso; este monta o módulo de verdade (só o banco é falso) para
 * pegar controller com `@MerchantSurface()` num módulo que esqueceu de importar o `AccessModule`.
 */
describe('MerchantModule', () => {
  it('resolves every controller guard with the real providers', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [CommonModule, MerchantModule] })
      .overrideProvider(DB)
      .useValue({})
      .overrideProvider(SQL)
      .useValue({ end: async () => {} })
      .overrideProvider(PiiService)
      .useValue(createTestPii())
      .overrideProvider(Clock)
      .useValue({ now: () => new Date() })
      .compile()
    expect(moduleRef.get(MerchantShopGuard, { strict: false })).toBeInstanceOf(MerchantShopGuard)
    await moduleRef.close()
  })
})
