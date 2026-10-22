import { z } from 'zod'
import { HitsBannerSchema, PublicHitItemPageSchema, type HitsQuery } from '#shared/schemas/showcase'
import { transportOnly, type ApiClient } from '#layers/core/app/services/http/ApiClient'
import type { HitsService } from '../HitsService'

export class HttpHitsService implements HitsService {
  constructor(private readonly api: ApiClient) {}

  async list(query: HitsQuery) {
    const search = new URLSearchParams()
    if (query.group !== undefined) search.set('group', query.group)
    if (query.cursor !== undefined) search.set('cursor', query.cursor)
    const suffix = search.size === 0 ? '' : `?${search.toString()}`
    return transportOnly(await this.api.get(`/hits${suffix}`, PublicHitItemPageSchema))
  }

  async banners() {
    return transportOnly(await this.api.get('/hits/banners', z.array(HitsBannerSchema)))
  }
}
