import { Module } from '@nestjs/common'

/** Painel da rede (`/v1/admin/...`). Cada submódulo importa o `AdminAccessModule` e todo controller leva `@AdminSurface()`. */
@Module({})
export class AdminModule {}
