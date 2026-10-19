import { z } from 'zod'
import {
  ADMIN_NAME_MAX_LENGTH,
  ADMIN_SHOPS_SEARCH_MAX_LENGTH,
  ADMIN_NAME_MIN_LENGTH,
  ADMIN_REASON_MAX_LENGTH,
  EMAIL_MAX_LENGTH,
  HIT_ITEM_REJECTION_REASON_MAX_LENGTH,
} from '../constants/domain'
import { IsoDateTimeSchema } from './common'
import { PhoneNumberSchema } from './phone'
import { HitItemStatusSchema } from './hitItem'
import { ShopCategorySchema, ShopPlanSchema, ShopPublicContactSchema, ShopStatusSchema } from './shop'

const ReasonSchema = z.string().trim().min(1).max(ADMIN_REASON_MAX_LENGTH)

export const AdminUserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.email().max(EMAIL_MAX_LENGTH),
  disabledAt: IsoDateTimeSchema.nullable(),
  createdAt: IsoDateTimeSchema,
})
export type AdminUser = z.infer<typeof AdminUserSchema>

export const AdminInviteSchema = z.strictObject({
  name: z.string().trim().min(ADMIN_NAME_MIN_LENGTH).max(ADMIN_NAME_MAX_LENGTH),
  email: z.string().trim().toLowerCase().pipe(z.email().max(EMAIL_MAX_LENGTH)),
})
export type AdminInvite = z.infer<typeof AdminInviteSchema>

/** O que fica em `admin_events.kind`: quem convidou, desativou, reativou ou zerou o MFA de quem. */
export const AdminEventKindSchema = z.enum(['invite', 'disable', 'reactivate', 'resetMfa'])
export type AdminEventKind = z.infer<typeof AdminEventKindSchema>

/** O BFF do admin reserva a tentativa de login antes de mandar a senha ao Supabase. Só o e-mail, normalizado. */
export const AdminLoginAttemptSchema = z.strictObject({
  email: z.string().trim().toLowerCase().pipe(z.email().max(EMAIL_MAX_LENGTH)),
})
export type AdminLoginAttempt = z.infer<typeof AdminLoginAttemptSchema>

/** Ação do admin sobre uma loja. Suspender exige o motivo. */
export const AdminShopActionSchema = z.discriminatedUnion('action', [
  z.strictObject({ action: z.literal('approve') }),
  z.strictObject({ action: z.literal('suspend'), reason: ReasonSchema }),
  z.strictObject({ action: z.literal('reactivate') }),
  z.strictObject({ action: z.literal('changePlan'), plan: ShopPlanSchema }),
])
export type AdminShopAction = z.infer<typeof AdminShopActionSchema>

/** Linha da lista de lojas da rede. Nunca leva contato do dono: isso só sai no detalhe. */
export const AdminShopRowSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  category: ShopCategorySchema,
  neighborhood: z.string(),
  status: ShopStatusSchema,
  plan: ShopPlanSchema,
  createdAt: IsoDateTimeSchema,
})
export type AdminShopRow = z.infer<typeof AdminShopRowSchema>

/** Cursor da lista: `<0 ou 1 (pendente primeiro)>:<id da última loja da página>`. */
export const AdminShopCursorSchema = z.string().regex(/^[01]:[0-9a-f-]{36}$/)

export const AdminShopListQuerySchema = z.strictObject({
  status: ShopStatusSchema.optional(),
  q: z.string().trim().min(1).max(ADMIN_SHOPS_SEARCH_MAX_LENGTH).optional(),
  cursor: AdminShopCursorSchema.optional(),
})
export type AdminShopListQuery = z.infer<typeof AdminShopListQuerySchema>

export const AdminShopListSchema = z.object({
  shops: z.array(AdminShopRowSchema),
  nextCursor: AdminShopCursorSchema.nullable(),
})
export type AdminShopList = z.infer<typeof AdminShopListSchema>

export const AdminShopStatusEventSchema = z.object({
  id: z.uuid(),
  fromStatus: ShopStatusSchema,
  toStatus: ShopStatusSchema,
  plan: ShopPlanSchema,
  /** Nome do admin do painel, ou o apelido do operador quando foi pelo script. */
  actorName: z.string(),
  reason: z.string().nullable(),
  createdAt: IsoDateTimeSchema,
})
export type AdminShopStatusEvent = z.infer<typeof AdminShopStatusEventSchema>

/** Detalhe da loja para a rede. O contato do dono (celular completo) só existe aqui; `null` se a conta do dono foi apagada. */
export const AdminShopDetailSchema = AdminShopRowSchema.extend({
  addressLine: z.string(),
  program: z.object({ rewardTitle: z.string(), mode: z.enum(['stamps', 'pointsPerCurrency', 'pointsPerVisit']), target: z.number().int() }).nullable(),
  owner: z.object({ phone: PhoneNumberSchema, email: z.email().nullable() }).nullable(),
  stats: z.object({ customers: z.number().int().min(0), visitsLast30Days: z.number().int().min(0) }),
  history: z.array(AdminShopStatusEventSchema),
})
export type AdminShopDetail = z.infer<typeof AdminShopDetailSchema>

/** Moderação de um produto do Hits. `expectedVersion` barra aprovar o que o lojista editou depois de o admin abrir. */
export const HitItemReviewSchema = z.discriminatedUnion('action', [
  z.strictObject({ action: z.literal('approve'), expectedVersion: z.number().int().min(1) }),
  z.strictObject({
    action: z.literal('reject'),
    reason: z.string().trim().min(1).max(HIT_ITEM_REJECTION_REASON_MAX_LENGTH),
  }),
  z.strictObject({
    action: z.literal('takeDown'),
    reason: z.string().trim().min(1).max(HIT_ITEM_REJECTION_REASON_MAX_LENGTH),
  }),
])
export type HitItemReview = z.infer<typeof HitItemReviewSchema>

/** Abas da fila de moderação: o que espera decisão e o que está na vitrine. */
export const AdminHitItemTabSchema = z.enum(['pending', 'approved'])
export type AdminHitItemTab = z.infer<typeof AdminHitItemTabSchema>

/** Cursor da fila: o id do último produto da página; a posição (data + id) é lida do banco. */
export const AdminHitItemListQuerySchema = z.strictObject({
  status: AdminHitItemTabSchema.default('pending'),
  cursor: z.uuid().optional(),
})
export type AdminHitItemListQuery = z.infer<typeof AdminHitItemListQuerySchema>

/**
 * Produto na fila do admin. `contact` é o botão que o cliente veria: o do produto, ou o da loja quando o produto não tem
 * (`contactSource`). Sem nenhum dos dois, `contact` é `null` e a origem fica `shop`.
 */
export const AdminHitItemSchema = z.object({
  id: z.uuid(),
  version: z.number().int().min(1),
  title: z.string(),
  description: z.string().nullable(),
  priceCents: z.number().int().nullable(),
  endsAt: IsoDateTimeSchema.nullable(),
  status: HitItemStatusSchema,
  rejectionReason: z.string().nullable(),
  photoUrl: z.url().nullable(),
  contact: ShopPublicContactSchema.nullable(),
  contactSource: z.enum(['item', 'shop']),
  shop: z.object({ id: z.uuid(), name: z.string(), status: ShopStatusSchema }),
  createdAt: IsoDateTimeSchema,
  approvedAt: IsoDateTimeSchema.nullable(),
})
export type AdminHitItem = z.infer<typeof AdminHitItemSchema>

export const AdminHitItemListSchema = z.object({
  items: z.array(AdminHitItemSchema),
  nextCursor: z.uuid().nullable(),
})
export type AdminHitItemList = z.infer<typeof AdminHitItemListSchema>
