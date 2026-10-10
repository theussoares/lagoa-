import { afterEach, describe, expect, it } from 'vitest'
import { mountComponent, unmountAll } from '#layers/core/test/componentHarness.nuxt'
import ShopPhoto from '../app/components/settings/ShopPhoto.vue'

afterEach(unmountAll)

const idle = { imageUrl: null, loading: false, send: { status: 'idle' } }

describe('SettingsShopPhoto', () => {
  it('says there is no photo yet and offers a real file input with a label', async () => {
    const page = await mountComponent(ShopPhoto, idle)
    expect(page.text()).toContain('Sua loja ainda não tem foto.')
    const input = page.get('input[type="file"]')
    expect(page.get(`label[for="${input.attributes('id')}"]`).text()).toContain('Escolher foto')
  })

  it('shows the current photo and offers to change it', async () => {
    const page = await mountComponent(ShopPhoto, { ...idle, imageUrl: 'https://example.test/photo.webp' })
    expect(page.get('img').attributes('src')).toBe('https://example.test/photo.webp')
    expect(page.text()).toContain('Trocar foto')
  })

  it('emits the chosen file', async () => {
    const page = await mountComponent(ShopPhoto, idle)
    const input = page.get('input[type="file"]')
    const file = new File(['x'], 'loja.jpg', { type: 'image/jpeg' })
    Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
    await input.trigger('change')
    expect(page.emitted('choose')?.[0]).toEqual([file])
  })

  it('explains an unreadable image and a refused one', async () => {
    const unreadable = await mountComponent(ShopPhoto, { ...idle, send: { status: 'error', code: 'unreadable' } })
    expect(unreadable.text()).toContain('Não deu para abrir essa imagem')
    const refused = await mountComponent(ShopPhoto, { ...idle, send: { status: 'error', code: 'invalidShopPhoto' } })
    expect(refused.text()).toContain('JPG, PNG ou WebP')
  })
})
