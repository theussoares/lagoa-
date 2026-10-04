import { Module } from '@nestjs/common'
import { ComteleSmsSender } from './comtele-sms-sender'
import { SendSmsHookController } from './send-sms-hook.controller'
import { SmsSender } from './sms-sender'

@Module({
  controllers: [SendSmsHookController],
  providers: [{ provide: SmsSender, useClass: ComteleSmsSender }],
})
export class SmsModule {}
