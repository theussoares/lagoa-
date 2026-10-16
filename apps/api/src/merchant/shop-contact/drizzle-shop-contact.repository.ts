import { Inject, Injectable } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import type { ShopContact } from '#shared/schemas/shop'
import { DB, type Database } from '../../database/database.module'
import { shops } from '../../database/schema'
import { columnsFromContact, contactFromColumns } from '../../shops/shop-contact-columns'
import { ShopContactRepository } from './shop-contact.repository'

const COLUMNS = {
  ctaKind: shops.ctaKind,
  whatsapp: shops.whatsapp,
  whatsappMessage: shops.whatsappMessage,
  ctaUrl: shops.ctaUrl,
  ctaLabel: shops.ctaLabel,
}

@Injectable()
export class DrizzleShopContactRepository extends ShopContactRepository {
  constructor(@Inject(DB) private readonly db: Database) {
    super()
  }

  async find(shopId: string): Promise<ShopContact | null> {
    const [row] = await this.db.select(COLUMNS).from(shops).where(eq(shops.id, shopId)).limit(1)
    return row === undefined ? null : { contact: contactFromColumns(row) }
  }

  async replace(shopId: string, { contact }: ShopContact): Promise<ShopContact | null> {
    const [row] = await this.db.update(shops).set(columnsFromContact(contact)).where(eq(shops.id, shopId)).returning(COLUMNS)
    return row === undefined ? null : { contact: contactFromColumns(row) }
  }
}
