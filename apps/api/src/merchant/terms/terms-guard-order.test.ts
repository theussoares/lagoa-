import { GUARDS_METADATA } from '@nestjs/common/constants'
import { describe, expect, it } from 'vitest'
import { CounterRedemptionsController } from '../counter/counter-redemptions.controller'
import { VisitQrsController } from '../visit-qrs/visit-qrs.controller'
import { MerchantShopGuard } from '../access/merchant-shop.guard'
import { MerchantTermsGuard } from './merchant-terms.guard'

const guardsOf = (target: object): unknown[] => Reflect.getMetadata(GUARDS_METADATA, target) ?? []

describe('merchant terms guard order', () => {
  it('runs the shop guard before the terms guard (the terms guard reads request.merchantShop)', () => {
    const issue = VisitQrsController.prototype.issue
    const order = [...guardsOf(VisitQrsController), ...guardsOf(issue)]
    expect(order.indexOf(MerchantShopGuard)).toBeLessThan(order.indexOf(MerchantTermsGuard))
    const redemptions = guardsOf(CounterRedemptionsController)
    expect(redemptions.indexOf(MerchantShopGuard)).toBeGreaterThanOrEqual(0)
    expect(redemptions.indexOf(MerchantShopGuard)).toBeLessThan(redemptions.indexOf(MerchantTermsGuard))
  })
})
