import { z } from 'zod'
import { READABLE_CODE_ALPHABET } from '../constants/domain'

export const IsoDateTimeSchema = z.iso.datetime({ offset: true })
export type IsoDateTime = z.infer<typeof IsoDateTimeSchema>

/** Aniversário sem ano (MM-DD): o produto só precisa do dia. */
export const BirthdaySchema = z.string().regex(/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/)
export type Birthday = z.infer<typeof BirthdaySchema>

export const IsoDateSchema = z.iso.date()
export type IsoDate = z.infer<typeof IsoDateSchema>

/** Só letras e números sem sósia (`READABLE_CODE_ALPHABET`): o código é lido em voz alta ou copiado de um cartaz. */
export function readableCodeSchema(length: number): z.ZodString {
  return z
    .string()
    .length(length)
    .refine((code) => [...code].every((char) => READABLE_CODE_ALPHABET.includes(char)))
}
