import { z } from 'zod'

/** Celular brasileiro só com dígitos: DDD + 9 + 8 dígitos. Dado pessoal (LGPD). */
export const PhoneNumberSchema = z
  .string()
  .regex(/^[1-9]{2}9\d{8}$/)
  .brand<'PhoneNumber'>()
export type PhoneNumber = z.infer<typeof PhoneNumberSchema>

/** Única forma de celular que pode aparecer em lista: `(67) 9••••-0374`. */
export const MaskedPhoneSchema = z
  .string()
  .regex(/^\(\d{2}\) 9••••-\d{4}$/)
  .brand<'MaskedPhone'>()
export type MaskedPhone = z.infer<typeof MaskedPhoneSchema>
