import { Module } from '@nestjs/common'
import { AdminShopsModule } from './shops/shops.module'

/** Painel da rede (`/v1/admin/...`). Cada submódulo importa o `AdminAccessModule` e todo controller leva `@AdminSurface()`. */
@Module({ imports: [AdminShopsModule] })
export class AdminModule {}
