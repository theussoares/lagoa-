/** Bucket público (leitura) de logos; só o Nest escreve. Ver `docs/database-model.md`. */
export const SHOP_ASSETS_BUCKET = 'shop-assets'

/** `Shop.logoPath` guarda só o caminho; a URL é montada aqui, nunca gravada. */
export function shopAssetUrl(supabaseUrl: string, path: string): string {
  return `${supabaseUrl}/storage/v1/object/public/${SHOP_ASSETS_BUCKET}/${path}`
}
