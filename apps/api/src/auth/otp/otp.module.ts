import { Module } from '@nestjs/common'
import { CommonModule } from '../../common/common.module'
import { DrizzleOtpSendLog } from './drizzle-otp-send-log.repository'
import { OtpSendGate } from './otp-send-gate'
import { OtpSendLog } from './otp-send-log.repository'
import { OtpSender } from './otp-sender'
import { SendSmsHookController } from './send-sms-hook.controller'
import { WhatsAppOtpSender } from './whatsapp-otp-sender'

@Module({
  imports: [CommonModule],
  controllers: [SendSmsHookController],
  providers: [
    { provide: OtpSender, useClass: WhatsAppOtpSender },
    { provide: OtpSendLog, useClass: DrizzleOtpSendLog },
    OtpSendGate,
  ],
})
export class OtpModule {}
