import { z } from 'zod'
import { LoyaltyCardIdSchema, ShopIdSchema } from './ids'
import { EarnRateSchema, ProgramUnitSchema } from './program'
import { readableCodeSchema } from './common'
import { PhoneNumberSchema } from './phone'
import { canonicalShopCtaUrl, isPublicHttpsUrl } from '../utils/shopCtaUrl'
import {
  CHECK_IN_CODE_INPUT_MAX_LENGTH,
  CHECK_IN_CODE_LENGTH,
  REWARD_TITLE_MAX_LENGTH,
  SHOP_ADDRESS_MAX_LENGTH,
  SHOP_CTA_LABEL_MAX_LENGTH,
  SHOP_CTA_URL_MAX_LENGTH,
  SHOP_WHATSAPP_MESSAGE_MAX_LENGTH,
  SHOP_NAME_MAX_LENGTH,
  SHOP_NEIGHBORHOOD_MAX_LENGTH,
  SHOP_PHOTO_MAX_BYTES,
} from '../constants/domain'

export const ShopCategorySchema = z.enum([
  'barbershop',
  'beauty',
  'cafe',
  'bakery',
  'pizzeria',
  'restaurant',
  'petShop',
  'gym',
  'clothing',
  'services',
  'home',
  'other',
])
export type ShopCategory = z.infer<typeof ShopCategorySchema>

export const ShopStatusSchema = z.enum(['pending', 'approved', 'suspended'])
export type ShopStatus = z.infer<typeof ShopStatusSchema>

/** Plano da loja (Fundador ou Fundador Pro): decide o que o painel libera (campanhas, destaque no Descobrir). */
export const ShopPlanSchema = z.enum(['founder', 'founderPro'])
export type ShopPlan = z.infer<typeof ShopPlanSchema>

/** Identifica a loja para entrar no clube: vai no QR do cartaz e impresso embaixo dele (nome legado, P-01). */
export const CheckInCodeSchema = readableCodeSchema(CHECK_IN_CODE_LENGTH).brand<'CheckInCode'>()
export type CheckInCode = z.infer<typeof CheckInCodeSchema>

/** Formatos que o bucket `shop-assets` aceita. */
export const ShopPhotoContentTypeSchema = z.enum(['image/jpeg', 'image/png', 'image/webp'])
export type ShopPhotoContentType = z.infer<typeof ShopPhotoContentTypeSchema>

/** Foto enviada pelo painel: bytes em base64 (o corpo é JSON como o resto da API). O servidor confere o tipo pelos bytes. */
export const ShopPhotoUploadSchema = z.strictObject({
  contentType: ShopPhotoContentTypeSchema,
  dataBase64: z.base64().max(Math.ceil(SHOP_PHOTO_MAX_BYTES / 3) * 4),
})
export type ShopPhotoUpload = z.infer<typeof ShopPhotoUploadSchema>

/** Imagens da loja: `logo` (quadrado, no círculo do card) e `banner` (capa do card no Descobrir). */
export const ShopPhotoKindSchema = z.enum(['logo', 'banner'])
export type ShopPhotoKind = z.infer<typeof ShopPhotoKindSchema>

/** Imagens atuais da loja; `null` sem a imagem (o Descobrir usa o carimbo e o fundo da categoria). */
export const ShopPhotosSchema = z.object({ logoUrl: z.string().url().nullable(), bannerUrl: z.string().url().nullable() })
export type ShopPhotos = z.infer<typeof ShopPhotosSchema>

const CtaLabelSchema = z.string().trim().min(1).max(SHOP_CTA_LABEL_MAX_LENGTH)
const WhatsappMessageSchema = z.string().trim().min(1).max(SHOP_WHATSAPP_MESSAGE_MAX_LENGTH)
const StoredCtaUrlSchema = z.string().max(SHOP_CTA_URL_MAX_LENGTH).refine(isPublicHttpsUrl)
/** O que o lojista digita: ganha `https://` se vier sem esquema e só passa se for um site público. */
const TypedCtaUrlSchema = z
  .string()
  .transform((input, ctx) => {
    const canonical = canonicalShopCtaUrl(input)
    if (canonical === null) ctx.addIssue({ code: 'custom', message: 'invalidShopCtaUrl' })
    return canonical ?? ''
  })
  .pipe(StoredCtaUrlSchema)

/**
 * Botão do card da loja (Descobrir e Carteira). Um por loja, em um de dois modos: WhatsApp do negócio (com mensagem
 * pronta opcional; `ctaLabel` `null` usa o texto padrão) ou link de um site (o texto do botão é obrigatório). O
 * WhatsApp é o número do negócio, não de cliente.
 */
export const ShopPublicContactSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('whatsapp'),
    whatsapp: PhoneNumberSchema,
    message: WhatsappMessageSchema.nullable(),
    ctaLabel: CtaLabelSchema.nullable(),
  }),
  z.object({ kind: z.literal('url'), url: StoredCtaUrlSchema, ctaLabel: CtaLabelSchema }),
])
export type ShopPublicContact = z.infer<typeof ShopPublicContactSchema>

/** O que o painel lê: o botão ou nenhum, sempre dentro de um objeto (corpo JSON `null` não passa pelo servidor). */
export const ShopContactSchema = z.object({ contact: ShopPublicContactSchema.nullable() })
export type ShopContact = z.infer<typeof ShopContactSchema>

/** O que o lojista salva em "Botão do card"; `contact: null` tira o botão. */
export const ShopContactUpdateSchema = z.strictObject({
  contact: z
    .discriminatedUnion('kind', [
      z.strictObject({
        kind: z.literal('whatsapp'),
        whatsapp: PhoneNumberSchema,
        message: WhatsappMessageSchema.nullable(),
        ctaLabel: CtaLabelSchema.nullable(),
      }),
      z.strictObject({ kind: z.literal('url'), url: TypedCtaUrlSchema, ctaLabel: CtaLabelSchema }),
    ])
    .nullable(),
})
export type ShopContactUpdate = z.infer<typeof ShopContactUpdateSchema>

/** Vitrine da loja no Descobrir. Tudo opcional: o card só mostra o que existe. */
export const ShopShowcaseSchema = z.object({
  /** Banner (capa do card). */
  imageUrl: z.string().min(1).optional(),
  logoUrl: z.string().min(1).optional(),
  rating: z.number().min(0).max(5).optional(),
  distanceKm: z.number().nonnegative().optional(),
  openNow: z.boolean().optional(),
})
export type ShopShowcase = z.infer<typeof ShopShowcaseSchema>

export const ShopSchema = z.object({
  id: ShopIdSchema,
  name: z.string().min(1).max(SHOP_NAME_MAX_LENGTH),
  category: ShopCategorySchema,
  neighborhood: z.string().min(1).max(SHOP_NEIGHBORHOOD_MAX_LENGTH),
  addressLine: z.string().min(1).max(SHOP_ADDRESS_MAX_LENGTH),
  status: ShopStatusSchema,
  showcase: ShopShowcaseSchema.optional(),
  /** Contato fora do contrato (ex.: formato antigo durante o deploy) some só desta loja, nunca derruba a lista. */
  contact: ShopPublicContactSchema.optional().catch(undefined),
})
export type Shop = z.infer<typeof ShopSchema>

/** O que o cliente vê de uma loja (carteira e Descobrir). */
export const ShopSummarySchema = ShopSchema.pick({
  id: true,
  name: true,
  category: true,
  neighborhood: true,
  addressLine: true,
  showcase: true,
  contact: true,
}).extend({
  program: z.object({
    unit: ProgramUnitSchema,
    target: z.number().int().positive(),
    rewardTitle: z.string().min(1).max(REWARD_TITLE_MAX_LENGTH),
    earnRate: EarnRateSchema,
    /** Unidades que o cartão novo já ganha (0 quando a regra está desligada). */
    welcomeUnits: z.number().int().nonnegative(),
  }),
  /** Hoje é o dia surpresa da loja (rende em dobro). Calculado no servidor; payload antigo sem o campo vale `false`. */
  surpriseDayToday: z.boolean().default(false),
})
export type ShopSummary = z.infer<typeof ShopSummarySchema>

/** O que o lojista preenche na etapa "Loja" do Criar o clube. */
export const ShopProfileDraftSchema = z.object({
  name: z.string().trim().min(1).max(SHOP_NAME_MAX_LENGTH),
  category: ShopCategorySchema,
  neighborhood: z.string().trim().min(1).max(SHOP_NEIGHBORHOOD_MAX_LENGTH),
  addressLine: z.string().trim().min(1).max(SHOP_ADDRESS_MAX_LENGTH),
})
export type ShopProfileDraft = z.infer<typeof ShopProfileDraftSchema>

/** Cartaz do balcão: o QR coloca o cliente no clube desta loja (não rende). */
export const ShopPosterSchema = z.object({
  shopName: z.string().min(1),
  status: ShopStatusSchema,
  checkInCode: CheckInCodeSchema,
  rewardTitle: z.string().min(1),
  unit: ProgramUnitSchema,
  target: z.number().int().positive(),
})
export type ShopPoster = z.infer<typeof ShopPosterSchema>

/** Corpo de `POST /shop-join`: o código do cartaz (QR ou digitado); o servidor normaliza e decide. */
export const ShopJoinRequestSchema = z.strictObject({ code: z.string().max(CHECK_IN_CODE_INPUT_MAX_LENGTH) })
export type ShopJoinRequest = z.infer<typeof ShopJoinRequestSchema>

/** Entrou no clube (ou já era): o app busca o cartão por `GET /wallet/cards/:shopId`. */
export const ShopJoinResultSchema = z.object({
  shopId: ShopIdSchema,
  cardId: LoyaltyCardIdSchema,
  alreadyMember: z.boolean(),
})
export type ShopJoinResult = z.infer<typeof ShopJoinResultSchema>
