import { z } from 'zod'
import { BirthdaySchema, IsoDateTimeSchema } from '#shared/schemas/common'
import { CampaignSchema } from '#shared/schemas/campaign'
import { ChallengeSchema } from '#shared/schemas/discover'
import { ConsentSchema } from '#shared/schemas/customer'
import { CustomerIdSchema, MerchantIdSchema, ProgramIdSchema, ShopIdSchema, VisitIdSchema, VisitQrIdSchema } from '#shared/schemas/ids'
import { LoyaltyCardSchema } from '#shared/schemas/loyaltyCard'
import { PhoneNumberSchema } from '#shared/schemas/phone'
import { ProgramSchema, ProgramUnitSchema } from '#shared/schemas/program'
import { RedemptionSchema } from '#shared/schemas/redemption'
import { LoginCodeSchema, SignUpTicketSchema } from '#shared/schemas/session'
import { CheckInCodeSchema, ShopSchema } from '#shared/schemas/shop'
import { CardProgressSchema, LedgerKindSchema } from '#shared/schemas/visit'
import {
  VisitCodeSchema,
  VisitQrCancelReasonSchema,
  VisitQrEarnSchema,
  VisitQrRefusalSchema,
  VisitQrStatusSchema,
  VisitTokenSchema,
} from '#shared/schemas/visitQr'

/**
 * Banco do backend falso. Só existe no mock: é o "servidor" que guarda o
 * celular completo. Nada daqui sai para a UI sem passar pelos handlers.
 */
export const MOCK_STATE_VERSION = 9

export const ShopRecordSchema = ShopSchema.extend({
  checkInCode: CheckInCodeSchema,
  /** O lojista já imprimiu o cartaz novo (só entra no clube). Futuro: coluna em `shops`. */
  posterReprinted: z.boolean(),
})
export type ShopRecord = z.infer<typeof ShopRecordSchema>

export const CustomerRecordSchema = z.object({
  id: CustomerIdSchema,
  phone: PhoneNumberSchema,
  firstName: z.string().nullable(),
  birthday: BirthdaySchema.nullable(),
  /** Última vez que uma data foi salva (tirar a data não conta). */
  birthdayChangedAt: IsoDateTimeSchema.nullable(),
  consent: ConsentSchema,
  termsAcceptedAt: IsoDateTimeSchema.nullable(),
  createdAt: IsoDateTimeSchema,
})
export type CustomerRecord = z.infer<typeof CustomerRecordSchema>

export const MerchantRecordSchema = z.object({
  id: MerchantIdSchema,
  phone: PhoneNumberSchema,
  shopId: ShopIdSchema,
})
export type MerchantRecord = z.infer<typeof MerchantRecordSchema>

export const LedgerRecordSchema = z.object({
  id: VisitIdSchema,
  shopId: ShopIdSchema,
  customerId: CustomerIdSchema,
  kind: LedgerKindSchema,
  unit: ProgramUnitSchema,
  units: z.number().int().nonnegative(),
  amountCents: z.number().int().positive().nullable(),
  rewardTitle: z.string().nullable(),
  isNewCustomer: z.boolean(),
  createdAt: IsoDateTimeSchema,
})
export type LedgerRecord = z.infer<typeof LedgerRecordSchema>

export const RedemptionRecordSchema = RedemptionSchema.extend({ customerId: CustomerIdSchema })
export type RedemptionRecord = z.infer<typeof RedemptionRecordSchema>

export const LoginChallengeRecordSchema = z.object({
  phone: PhoneNumberSchema,
  code: LoginCodeSchema,
  expiresAt: IsoDateTimeSchema,
})
export type LoginChallengeRecord = z.infer<typeof LoginChallengeRecordSchema>

/** Celular confirmado sem loja: só o servidor sabe de quem é o ticket. */
export const SignUpTicketRecordSchema = z.object({
  ticket: SignUpTicketSchema,
  phone: PhoneNumberSchema,
  expiresAt: IsoDateTimeSchema,
})
export type SignUpTicketRecord = z.infer<typeof SignUpTicketRecordSchema>

export const ChallengeRecordSchema = ChallengeSchema.omit({ visitedShopIds: true })
export type ChallengeRecord = z.infer<typeof ChallengeRecordSchema>

/** Quem recebeu fica só no servidor: serve para a janela de lembrete, nunca vai para a tela. */
export const CampaignRecordSchema = CampaignSchema.extend({ recipientIds: z.array(CustomerIdSchema) })
export type CampaignRecord = z.infer<typeof CampaignRecordSchema>

/**
 * QR da visita no servidor falso. EXCEÇÃO DO MOCK: o `token` fica em claro no estado (`localStorage`) porque não há hash
 * síncrono no navegador e o mock não é um servidor de verdade; a API do lojista guarda só o hash e some com este registro.
 */
export const VisitQrRecordSchema = z.object({
  id: VisitQrIdSchema,
  shopId: ShopIdSchema,
  programId: ProgramIdSchema,
  issuedBy: MerchantIdSchema,
  token: VisitTokenSchema,
  visitCode: VisitCodeSchema,
  earn: VisitQrEarnSchema,
  /** Como gravado: `active` vencido só vira `expired` na leitura (`visitQrStatusAt`). */
  status: VisitQrStatusSchema,
  cancelReason: VisitQrCancelReasonSchema.nullable(),
  createdAt: IsoDateTimeSchema,
  expiresAt: IsoDateTimeSchema,
  claimedBy: CustomerIdSchema.nullable(),
  claimedAt: IsoDateTimeSchema.nullable(),
  ledgerEntryId: VisitIdSchema.nullable(),
  /** Só do mock: o recibo do ganho (cartão logo depois e boas-vindas) para o replay e o Balcão devolverem o mesmo. */
  cardAfter: CardProgressSchema.nullable(),
  welcomeUnits: z.number().int().nonnegative(),
  refusal: VisitQrRefusalSchema.nullable(),
})
export type VisitQrRecord = z.infer<typeof VisitQrRecordSchema>

export const MockStateSchema = z.object({
  version: z.literal(MOCK_STATE_VERSION),
  shops: z.array(ShopRecordSchema),
  programs: z.array(ProgramSchema),
  customers: z.array(CustomerRecordSchema),
  merchants: z.array(MerchantRecordSchema),
  cards: z.array(LoyaltyCardSchema),
  ledger: z.array(LedgerRecordSchema),
  redemptions: z.array(RedemptionRecordSchema),
  loginChallenges: z.array(LoginChallengeRecordSchema),
  challenges: z.array(ChallengeRecordSchema),
  campaigns: z.array(CampaignRecordSchema),
  signUpTickets: z.array(SignUpTicketRecordSchema),
  visitQrs: z.array(VisitQrRecordSchema),
})
export type MockState = z.infer<typeof MockStateSchema>
