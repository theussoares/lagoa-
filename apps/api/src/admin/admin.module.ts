import { Module } from '@nestjs/common'
import { AdminFeaturedModule } from './featured/featured.module'
import { AdminHitsModule } from './hits/hits.module'
import { AdminShopsModule } from './shops/shops.module'

/** Painel da rede (`/v1/admin/...`). Cada submódulo importa o `AdminAccessModule` e todo controller leva `@AdminSurface()`. */
@Module({ imports: [AdminShopsModule, AdminHitsModule, AdminFeaturedModule] })
export class AdminModule {}
