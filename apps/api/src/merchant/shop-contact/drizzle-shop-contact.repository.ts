import { Inject, Injectable } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { PhoneNumberSchema } from '#shared/schemas/phone'
import type { ShopContact } from '#shared/schemas/shop'
import { DB, type Database } from '../../database/database.module'
import { shops } from '../../database/schema'
import { ShopContactRepository } from './shop-contact.repository'

const COLUMNS = { whatsapp: shops.whatsapp, ctaLabel: shops.ctaLabel }

/** Número que o CHECK do banco deixaria passar mas o domínio não reconhece vira "sem WhatsApp", nunca um erro na tela. */
function toContact(row: { whatsapp: string | null; ctaLabel: string | null }): ShopContact {
  const whatsapp = PhoneNumberSchema.safeParse(row.whatsapp)
  return whatsapp.success ? { whatsapp: whatsapp.data, ctaLabel: row.ctaLabel } : { whatsapp: null, ctaLabel: null }
}

@Injectable()
export class DrizzleShopContactRepository extends ShopContactRepository {
  constructor(@Inject(DB) private readonly db: Database) {
    super()
  }

  async find(shopId: string): Promise<ShopContact | null> {
    const [row] = await this.db.select(COLUMNS).from(shops).where(eq(shops.id, shopId)).limit(1)
    return row === undefined ? null : toContact(row)
  }

  async replace(shopId: string, contact: ShopContact): Promise<ShopContact | null> {
    const [row] = await this.db.update(shops).set({ whatsapp: contact.whatsapp, ctaLabel: contact.ctaLabel }).where(eq(shops.id, shopId)).returning(COLUMNS)
    return row === undefined ? null : toContact(row)
  }
}
