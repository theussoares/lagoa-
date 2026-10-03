import { pgEnum } from 'drizzle-orm/pg-core'

export const shopCategory = pgEnum('shop_category', [
  'barbershop', 'beauty', 'cafe', 'bakery', 'pizzeria', 'restaurant', 'petShop', 'gym', 'other',
])
export const shopStatus = pgEnum('shop_status', ['pending', 'approved', 'suspended'])
export const programMode = pgEnum('program_mode', ['stamps', 'pointsPerCurrency', 'pointsPerVisit'])
export const programUnit = pgEnum('program_unit', ['stamp', 'point'])
export const earnPer = pgEnum('earn_per', ['visit', 'real'])
export const expirationKind = pgEnum('expiration_kind', ['never', 'afterInactivity'])
export const ledgerKind = pgEnum('ledger_kind', [
  'visit', 'amount', 'checkIn', 'welcomeBonus', 'referralBonus', 'redemption', 'expiration',
])
export const redemptionStatus = pgEnum('redemption_status', ['active', 'redeemed', 'expired'])
export const referralStatus = pgEnum('referral_status', ['pending', 'rewarded', 'rejected'])
