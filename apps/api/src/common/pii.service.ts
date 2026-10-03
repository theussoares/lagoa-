import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto'
import { Inject, Injectable } from '@nestjs/common'
import type { PhoneNumber } from '#shared/schemas/phone'
import { ENV } from '../config/config.module'
import type { Env } from '../config/env'

const IV_BYTES = 12
const TAG_BYTES = 16

/** Cifra (AES-256-GCM) e indexa (HMAC com pepper) celular e e-mail. Nunca loga o valor. */
@Injectable()
export class PiiService {
  private readonly key: Buffer
  private readonly pepper: Buffer

  constructor(@Inject(ENV) env: Env) {
    this.key = Buffer.from(env.PII_ENCRYPTION_KEY, 'base64')
    this.pepper = Buffer.from(env.PII_HASH_PEPPER)
  }

  encrypt(plain: string): Buffer {
    const iv = randomBytes(IV_BYTES)
    const cipher = createCipheriv('aes-256-gcm', this.key, iv)
    const body = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
    return Buffer.concat([iv, cipher.getAuthTag(), body])
  }

  decrypt(payload: Buffer): string {
    const iv = payload.subarray(0, IV_BYTES)
    const tag = payload.subarray(IV_BYTES, IV_BYTES + TAG_BYTES)
    const body = payload.subarray(IV_BYTES + TAG_BYTES)
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(body), decipher.final()]).toString('utf8')
  }

  /** Único formato de hash do celular (11 dígitos): cadastro e Balcão têm de achar a mesma linha. */
  hashPhone(phone: PhoneNumber): Buffer {
    return this.hash(`phone:${phone}`)
  }

  hashEmail(email: string): Buffer {
    return this.hash(`email:${email.trim().toLowerCase()}`)
  }

  /** Determinístico, com prefixo por tipo (um e-mail nunca colide com um celular): serve para busca e unicidade (`phone_hash`, `email_hash`). */
  private hash(normalized: string): Buffer {
    return createHmac('sha256', this.pepper).update(normalized).digest()
  }
}
