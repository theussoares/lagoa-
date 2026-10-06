import { SetMetadata } from '@nestjs/common'

export const FAIL_CLOSED_THROTTLE = 'lagoa:failClosedThrottle'

/** Rota cujo limite sustenta uma conta de segurança: se o contador não responder, recusa (429) em vez de deixar passar. */
export const FailClosedThrottle = (): MethodDecorator & ClassDecorator => SetMetadata(FAIL_CLOSED_THROTTLE, true)
