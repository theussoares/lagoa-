import { Module } from '@nestjs/common'
import { CommonModule } from '../../common/common.module'
import { ComteleSmsSender } from './comtele-sms-sender'
import { DrizzleOtpChannelStore } from './drizzle-otp-channel.store'
import { DrizzleOtpSendLog } from './drizzle-otp-send-log.repository'
import { OtpChannelChoice } from './otp-channel-choice'
import { OtpChannelController } from './otp-channel.controller'
import { OtpChannelStore } from './otp-channel.store'
import { OtpSendGate } from './otp-send-gate'
import { OtpSendLog } from './otp-send-log.repository'
import { OtpSenders } from './otp-senders'
import { SendSmsHookController } from './send-sms-hook.controller'
import { WhatsAppOtpSender } from './whatsapp-otp-sender'

@Module({
  imports: [CommonModule],
  controllers: [SendSmsHookController, OtpChannelController],
  providers: [
    WhatsAppOtpSender,
    ComteleSmsSender,
    OtpSenders,
    { provide: OtpChannelStore, useClass: DrizzleOtpChannelStore },
    OtpChannelChoice,
    { provide: OtpSendLog, useClass: DrizzleOtpSendLog },
    OtpSendGate,
  ],
})
export class OtpModule {}
