import { cityHeaderImageUrl } from '../utils/cityHeaderImage'

export function useCityHeaderImage(): string {
  return cityHeaderImageUrl(useRuntimeConfig().public.supabaseUrl)
}
