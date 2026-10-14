import { Inject, Injectable } from '@nestjs/common'
import { and, eq, gt } from 'drizzle-orm'
import { OtpChannelSchema, type OtpChannel } from '#shared/schemas/session'
import { DB, type Database } from '../../database/database.module'
import { otpChannelChoices } from '../../database/schema'
import { OtpChannelStore } from './otp-channel.store'

@Injectable()
export class DrizzleOtpChannelStore extends OtpChannelStore {
  constructor(@Inject(DB) private readonly db: Database) {
    super()
  }

  async save(phoneHash: Buffer, channel: OtpChannel, now: Date): Promise<void> {
    await this.db
      .insert(otpChannelChoices)
      .values({ phoneHash, channel, chosenAt: now })
      .onConflictDoUpdate({ target: otpChannelChoices.phoneHash, set: { channel, chosenAt: now } })
  }

  async find(phoneHash: Buffer, notBefore: Date): Promise<OtpChannel | null> {
    const rows = await this.db
      .select({ channel: otpChannelChoices.channel })
      .from(otpChannelChoices)
      .where(and(eq(otpChannelChoices.phoneHash, phoneHash), gt(otpChannelChoices.chosenAt, notBefore)))
      .limit(1)
    const parsed = OtpChannelSchema.safeParse(rows[0]?.channel)
    return parsed.success ? parsed.data : null
  }
}
