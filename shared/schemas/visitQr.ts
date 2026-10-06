import { z } from 'zod'
import { AMOUNT_MAX_CENTS, VISIT_CODE_LENGTH, VISIT_TOKEN_LENGTH } from '../constants/domain'
import { IsoDateTimeSchema, readableCodeSchema } from './common'
import { VisitQrIdSchema } from './ids'
import { CheckInCodeSchema } from './shop'
import { VisitRegisteredSchema } from './visit'

/** Token opaco do QR da visita: 256 bits em base64url, sem padding. Credencial: nunca em log nem em query. */
export const VisitTokenSchema = z
  .string()
  .regex(new RegExp(`^[A-Za-z0-9_-]{${VISIT_TOKEN_LENGTH}}$`))
  .brand<'VisitToken'>()
export type VisitToken = z.infer<typeof VisitTokenSchema>

/** Código curto do QR da visita, para quem digita (câmera negada). */
export const VisitCodeSchema = readableCodeSchema(VISIT_CODE_LENGTH).brand<'VisitCode'>()
export type VisitCode = z.infer<typeof VisitCodeSchema>

export const VisitQrStatusSchema = z.enum(['active', 'claimed', 'expired', 'cancelled'])
export type VisitQrStatus = z.infer<typeof VisitQrStatusSchema>

/** `programChanged` responde `visitQrStale` ao cliente; `merchant` responde `invalidVisitQr`. */
export const VisitQrCancelReasonSchema = z.enum(['merchant', 'programChanged'])
export type VisitQrCancelReason = z.infer<typeof VisitQrCancelReasonSchema>

/** O que a venda rende; mesma forma de `EarnInput` (programStrategies), validada na emissão. */
export const VisitQrEarnSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('visit') }),
  z.object({ kind: z.literal('amount'), amountCents: z.number().int().positive().max(AMOUNT_MAX_CENTS) }),
])
export type VisitQrEarn = z.infer<typeof VisitQrEarnSchema>

/** Lojista gera. Valor só no modo por real; nunca vem do cliente. */
export const VisitQrIssueRequestSchema = z.strictObject({
  amountCents: z.number().int().positive().max(AMOUNT_MAX_CENTS).optional(),
})
export type VisitQrIssueRequest = z.infer<typeof VisitQrIssueRequestSchema>

/** Recusa por janela antifraude: o QR continua ativo e o Balcão mostra até quando. Sem dado do cliente. */
export const VisitQrRefusalSchema = z.object({
  code: z.literal('checkInCooldown'),
  availableAt: IsoDateTimeSchema,
  refusedAt: IsoDateTimeSchema,
})
export type VisitQrRefusal = z.infer<typeof VisitQrRefusalSchema>

/** Visão do lojista. `claim` reaproveita o recibo do Balcão (celular só mascarado). */
export const VisitQrSchema = z.object({
  id: VisitQrIdSchema,
  visitCode: VisitCodeSchema,
  /** `expired` já derivado de `expiresAt` na leitura. */
  status: VisitQrStatusSchema,
  earn: VisitQrEarnSchema,
  createdAt: IsoDateTimeSchema,
  expiresAt: IsoDateTimeSchema,
  claim: VisitRegisteredSchema.nullable(),
  refusal: VisitQrRefusalSchema.nullable(),
})
export type VisitQr = z.infer<typeof VisitQrSchema>

/** Só a resposta da emissão leva o token: o servidor guarda o hash e não consegue devolvê-lo depois. */
export const IssuedVisitQrSchema = VisitQrSchema.extend({ token: VisitTokenSchema })
export type IssuedVisitQr = z.infer<typeof IssuedVisitQrSchema>

/** Credencial já validada (depois do parse): o app manda uma das duas. */
export const VisitQrCredentialSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('token'), token: VisitTokenSchema }),
  z.object({ kind: z.literal('visitCode'), code: VisitCodeSchema }),
])
export type VisitQrCredential = z.infer<typeof VisitQrCredentialSchema>

/** Conteúdo lido pela câmera ou pelo link: QR da loja (entrar) ou QR da visita (ganhar). */
export const ScannedQrSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('shop'), code: CheckInCodeSchema }),
  z.object({ kind: z.literal('visit'), token: VisitTokenSchema }),
])
export type ScannedQr = z.infer<typeof ScannedQrSchema>

/** Rota futura do lojista (`merchant/visit-qrs/:id`). */
export const VisitQrIdParamSchema = z.uuid().pipe(VisitQrIdSchema)
