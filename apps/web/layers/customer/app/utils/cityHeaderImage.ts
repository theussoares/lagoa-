const LOCAL_CITY_HEADER_IMAGE = '/example/city.svg'
const CITY_HEADER_PATH = 'shop-assets/city/discover-header.webp'

/** Foto do bucket público do Supabase; sem a URL do projeto (modo mock), cai na ilustração local. */
export function cityHeaderImageUrl(supabaseUrl: string): string {
  if (!supabaseUrl) return LOCAL_CITY_HEADER_IMAGE
  return `${supabaseUrl.replace(/\/+$/, '')}/storage/v1/object/public/${CITY_HEADER_PATH}`
}
