import type { ErrorOf } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'
import type { JoinableShop } from './shop-join.repository'

/** Quem já é membro nunca é barrado: a entrada desligada só vale para quem ainda não tem cartão. */
export function decideShopJoin(shop: JoinableShop, existingCardId: string | null): Result<'join' | 'alreadyMember', ErrorOf<'checkInDisabled'>> {
  if (existingCardId !== null) return ok('alreadyMember')
  return shop.joinEnabled ? ok('join') : err({ code: 'checkInDisabled' })
}
