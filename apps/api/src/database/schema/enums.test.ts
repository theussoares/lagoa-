import { describe, expect, it } from 'vitest'
import { ShopCategorySchema, ShopStatusSchema } from '#shared/schemas/shop'
import { VisitQrCancelReasonSchema, VisitQrEarnSchema, VisitQrStatusSchema } from '#shared/schemas/visitQr'
import { shopCategory, shopStatus, visitQrCancelReason, visitQrEarnKind, visitQrStatus } from './enums'

describe('db enums stay in sync with shared schemas', () => {
  it('shop category', () => expect(shopCategory.enumValues).toEqual(ShopCategorySchema.options))
  it('shop status', () => expect(shopStatus.enumValues).toEqual(ShopStatusSchema.options))
  it('visit QR status', () => expect(visitQrStatus.enumValues).toEqual(VisitQrStatusSchema.options))
  it('visit QR cancel reason', () => expect(visitQrCancelReason.enumValues).toEqual(VisitQrCancelReasonSchema.options))
  it('visit QR earn kind', () => expect(visitQrEarnKind.enumValues).toEqual(VisitQrEarnSchema.options.map((option) => option.shape.kind.value)))
})
