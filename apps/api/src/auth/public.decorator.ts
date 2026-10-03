import { SetMetadata } from '@nestjs/common'

export const IS_PUBLIC = 'isPublic'

/** Rotas são autenticadas por padrão; só o que for explicitamente público dispensa o JWT. */
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC, true)
