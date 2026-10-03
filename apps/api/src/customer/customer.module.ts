import { Module } from '@nestjs/common'
import { ProfileModule } from './profile/profile.module'

/** Superfície do cliente (app mobile). O painel do lojista vive em `merchant/`. */
@Module({ imports: [ProfileModule] })
export class CustomerModule {}
