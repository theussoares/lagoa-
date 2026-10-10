import { z } from 'zod'
import { CHECK_IN_CODE_INPUT_MAX_LENGTH, VISIT_CODE_INPUT_MAX_LENGTH, VISIT_TOKEN_INPUT_MAX_LENGTH } from '../constants/domain'
import { IsoDateTimeSchema } from './common'
import { LoyaltyCardIdSchema, ShopIdSchema, VisitIdSchema } from './ids'
import { MaskedPhoneSchema } from './phone'
import { ProgramUnitSchema } from './program'

export const LedgerKindSchema = z.enum(['visit', 'amount', 'checkIn', 'redemption', 'campaignBonus'])
export type LedgerKind = z.infer<typeof LedgerKindSchema>

/** Linha da caderneta do Balcão. Celular só mascarado. */
export const CounterEntrySchema = z.object({
  id: VisitIdSchema,
  shopId: ShopIdSchema,
  /** `null` = conta apagada ("cliente removido"): o celular dela não existe mais e nunca é decifrado. */
  maskedPhone: MaskedPhoneSchema.nullable(),
  kind: LedgerKindSchema,
  unit: ProgramUnitSchema,
  /** Unidades ganhas (0 no resgate). */
  units: z.number().int().nonnegative(),
  amountCents: z.number().int().positive().nullable(),
  rewardTitle: z.string().nullable(),
  isNewCustomer: z.boolean(),
  createdAt: IsoDateTimeSchema,
})
export type CounterEntry = z.infer<typeof CounterEntrySchema>

/** "Hoje" no Balcão: as mais novas primeiro; `truncated` avisa que o dia teve mais lançamentos do que o teto devolve. */
export const CounterTodaySchema = z.object({
  entries: z.array(CounterEntrySchema),
  truncated: z.boolean(),
})
export type CounterToday = z.infer<typeof CounterTodaySchema>

/** Situação do cartão logo depois de um lançamento, para o Balcão confirmar. */
export const CardProgressSchema = z.object({
  cardId: LoyaltyCardIdSchema,
  unit: ProgramUnitSchema,
  balance: z.number().int().nonnegative(),
  target: z.number().int().positive(),
  rewardReady: z.boolean(),
})
export type CardProgress = z.infer<typeof CardProgressSchema>

export const VisitRegisteredSchema = z.object({
  entry: CounterEntrySchema,
  card: CardProgressSchema,
  unitsEarned: z.number().int().positive(),
  welcomeUnits: z.number().int().nonnegative(),
})
export type VisitRegistered = z.infer<typeof VisitRegisteredSchema>

/** Linha da caderneta do cliente (sem celular). */
export const WalletActivitySchema = z.object({
  id: VisitIdSchema,
  shopId: ShopIdSchema,
  shopName: z.string(),
  kind: LedgerKindSchema,
  unit: ProgramUnitSchema,
  units: z.number().int().nonnegative(),
  rewardTitle: z.string().nullable(),
  createdAt: IsoDateTimeSchema,
})
export type WalletActivity = z.infer<typeof WalletActivitySchema>

/** Corpo de `POST /check-in` (token do QR da visita). Objetos estritos: campo extra (ex.: `amountCents`) é 400 (CA-12). */
export const VisitQrClaimRequestSchema = z.union([
  z.strictObject({ token: z.string().max(VISIT_TOKEN_INPUT_MAX_LENGTH) }),
  /** App antigo mandando o código do cartaz na rota de ganho: responde `shopQrJoinOnly`. */
  z.strictObject({ code: z.string().max(CHECK_IN_CODE_INPUT_MAX_LENGTH) }),
])
export type VisitQrClaimRequest = z.infer<typeof VisitQrClaimRequestSchema>

/** Corpo de `POST /check-in/code` (código curto digitado; rota com limite próprio, P-03). */
export const VisitCodeClaimRequestSchema = z.strictObject({ visitCode: z.string().max(VISIT_CODE_INPUT_MAX_LENGTH) })
export type VisitCodeClaimRequest = z.infer<typeof VisitCodeClaimRequestSchema>

/** Opcional: o app gera um por toque e reenvia o mesmo se a resposta se perder; 16 a 64 caracteres seguros. */
export const IdempotencyKeySchema = z.string().regex(/^[A-Za-z0-9_-]{16,64}$/)
export type IdempotencyKey = z.infer<typeof IdempotencyKeySchema>

export const CheckInResultSchema = z.object({
  activity: WalletActivitySchema,
  card: CardProgressSchema,
  /** Momento a partir do qual uma nova visita nesta loja rende (janela antifraude). */
  nextCheckInAt: IsoDateTimeSchema,
})
export type CheckInResult = z.infer<typeof CheckInResultSchema>
