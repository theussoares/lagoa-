import { describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { useNuxtApp } from '#imports'
import { mountComposable } from '#layers/core/test/composableHarness.nuxt'
import type { MerchantHitItem } from '#shared/schemas/hitItem'
import { useHitsScreen } from '../app/composables/useHitsScreen'
import { MockHitItemService } from '../app/services/mock/MockHitItemService'
import { draft, upload } from './hitItemContract'

const { current } = vi.hoisted(() => ({ current: { service: undefined as unknown, photo: undefined as unknown } }))

mockNuxtImport('useMerchantServices', () => () => ({ hits: current.service }))
mockNuxtImport('useImageResize', () => () => ({ toPhotoUpload: () => Promise.resolve(current.photo) }))

function t(key: string): string {
  return useNuxtApp().$i18n.t(key)
}

const stored: MerchantHitItem = {
  ...draft,
  id: '0190b0c0-1111-7000-8000-000000000001',
  status: 'approved',
  rejectionReason: null,
  photoUrl: 'https://cdn.test/a.webp',
  createdAt: '2026-10-01T12:00:00.000Z',
  updatedAt: '2026-10-01T12:00:00.000Z',
}

async function setup(seed: readonly MerchantHitItem[], photo: unknown = upload) {
  current.service = new MockHitItemService({ cap: 5, seed })
  current.photo = photo
  const { result } = await mountComposable(() => useHitsScreen())
  return result
}

describe('useHitsScreen', () => {
  it('lists the items with the active count against the cap', async () => {
    const screen = await setup([stored, { ...stored, id: '0190b0c0-1111-7000-8000-000000000002', status: 'archived' }])
    expect(screen.rows).toHaveLength(2)
    expect(screen.activeCount).toBe(1)
    expect(screen.cap).toBe(5)
    expect(screen.canCreate).toBe(true)
  })

  it('shows the rejection reason of a rejected item', async () => {
    const screen = await setup([{ ...stored, status: 'rejected', rejectionReason: 'Foto escura demais' }])
    expect(screen.rows[0]).toMatchObject({ status: 'rejected', rejectionReason: 'Foto escura demais' })
  })

  it('warns that an approved item went back to review after it is saved', async () => {
    const screen = await setup([stored])
    screen.startEdit(stored.id)
    expect(screen.form.title).toBe('Corte masculino')
    screen.change({ title: 'Corte e barba' })
    await screen.save()
    await flushPromises()
    expect(screen.message).toEqual({ tone: 'success', key: 'merchantHits.backToReview' })
    expect(t('merchantHits.backToReview')).toContain('volta para a análise')
    expect(screen.rows[0]).toMatchObject({ status: 'pending' })
    expect(screen.rows[0]?.item.title).toBe('Corte e barba')
    expect(screen.formOpen).toBe(false)
  })

  it('creates a new item and sends the chosen photo right after', async () => {
    const screen = await setup([])
    screen.startCreate()
    screen.change({ title: 'Escova' })
    await screen.save()
    expect(screen.fieldError).toBe('missingPhoto')
    await screen.choosePhoto(new File(['x'], 'a.jpg'))
    await screen.save()
    await flushPromises()
    expect(screen.message).toEqual({ tone: 'success', key: 'merchantHits.sentToReview' })
    expect(screen.rows).toHaveLength(1)
    expect(screen.rows[0]).toMatchObject({ status: 'pending', missingPhoto: false })
  })

  it('keeps the form open on the created item when the photo upload fails, so saving again does not duplicate it', async () => {
    const service = new MockHitItemService({ cap: 5 })
    vi.spyOn(service, 'uploadPhoto').mockResolvedValueOnce({ ok: false, error: { code: 'invalidShopPhoto' } })
    current.service = service
    current.photo = upload
    const { result: retry } = await mountComposable(() => useHitsScreen())
    retry.startCreate()
    retry.change({ title: 'Escova' })
    await retry.choosePhoto(new File(['x'], 'a.jpg'))
    await retry.save()
    await flushPromises()
    expect(retry.formOpen).toBe(true)
    expect(retry.errorKey).toBe('errors.invalidShopPhoto')
    expect(retry.rows[0]).toMatchObject({ missingPhoto: true })
    await retry.save()
    await flushPromises()
    expect(retry.rows).toHaveLength(1)
    expect(retry.rows[0]?.missingPhoto).toBe(false)
  })

  it('reports an image the browser cannot open', async () => {
    const screen = await setup([], null)
    screen.startCreate()
    await screen.choosePhoto(new File(['x'], 'a.jpg'))
    expect(screen.errorKey).toBe('merchantHits.errors.unreadable')
  })

  it('archives and unarchives, and blocks a new item at the cap', async () => {
    const screen = await setup([stored])
    await screen.archive(stored.id)
    await flushPromises()
    expect(screen.rows[0]).toMatchObject({ status: 'archived' })
    expect(screen.activeCount).toBe(0)
    await screen.unarchive(stored.id)
    await flushPromises()
    expect(screen.message).toEqual({ tone: 'success', key: 'merchantHits.unarchivedToReview' })
    expect(screen.rows[0]).toMatchObject({ status: 'pending' })
  })

  it('does not open archived items for editing', async () => {
    const screen = await setup([{ ...stored, status: 'archived' }])
    screen.startEdit(stored.id)
    expect(screen.formOpen).toBe(false)
  })
})
