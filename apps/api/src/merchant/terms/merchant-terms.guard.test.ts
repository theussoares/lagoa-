import type { ExecutionContext } from '@nestjs/common'
import { describe, expect, it } from 'vitest'
import { MERCHANT_TERMS_VERSION } from '#shared/constants/domain'
import { DomainException } from '../../common/http/domain-exception'
import { MerchantTermsGuard } from './merchant-terms.guard'

const contextOf = (termsVersion: string | null | undefined): ExecutionContext =>
  ({ switchToHttp: () => ({ getRequest: () => ({ merchantShop: termsVersion === undefined ? undefined : { termsVersion } }) }) }) as unknown as ExecutionContext

describe('MerchantTermsGuard', () => {
  it('lets everyone through while the gate is off (the legal text does not exist yet)', () => {
    expect(new MerchantTermsGuard({ MERCHANT_TERMS_REQUIRED: '0' }).canActivate(contextOf(null))).toBe(true)
  })

  it('with the gate on, only a shop that accepted the current version passes', () => {
    const guard = new MerchantTermsGuard({ MERCHANT_TERMS_REQUIRED: '1' })
    expect(guard.canActivate(contextOf(MERCHANT_TERMS_VERSION))).toBe(true)
    for (const version of [null, 'old-version', undefined]) {
      expect(() => guard.canActivate(contextOf(version))).toThrow(DomainException)
    }
  })
})
