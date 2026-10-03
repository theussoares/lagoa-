import { Global, Module } from '@nestjs/common'
import { Clock, SystemClock } from './clock'
import { PiiService } from './pii.service'

@Global()
@Module({ providers: [PiiService, { provide: Clock, useClass: SystemClock }], exports: [PiiService, Clock] })
export class CommonModule {}
