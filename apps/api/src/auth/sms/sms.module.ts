import { Module } from '@nestjs/common'
import { CommonModule } from '../../common/common.module'
import { ComteleSmsSender } from './comtele-sms-sender'
import { DrizzleSmsSendLog } from './drizzle-sms-send-log.repository'
import { SendSmsHookController } from './send-sms-hook.controller'
import { SmsSendGate } from './sms-send-gate'
import { SmsSendLog } from './sms-send-log.repository'
import { SmsSender } from './sms-sender'

@Module({
  imports: [CommonModule],
  controllers: [SendSmsHookController],
  providers: [
    { provide: SmsSender, useClass: ComteleSmsSender },
    { provide: SmsSendLog, useClass: DrizzleSmsSendLog },
    SmsSendGate,
  ],
})
export class SmsModule {}
