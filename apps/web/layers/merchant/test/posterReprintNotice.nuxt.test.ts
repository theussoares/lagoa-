import { afterEach, describe, expect, it } from 'vitest'
import { mountComponent, unmountAll } from '#layers/core/test/componentHarness.nuxt'
import PosterReprintNotice from '../app/components/home/PosterReprintNotice.vue'

afterEach(unmountAll)

describe('HomePosterReprintNotice', () => {
  it('shows the notice text and a real button', async () => {
    const page = await mountComponent(PosterReprintNotice)
    expect(page.text()).toContain('Imprima o cartaz novo')
    expect(page.text()).toContain('só coloca o cliente no clube')
    expect(page.get('button').text()).toBe('Imprimir cartaz')
  })

  it('emits print when the button is pressed', async () => {
    const page = await mountComponent(PosterReprintNotice)
    await page.get('button').trigger('click')
    expect(page.emitted('print')).toHaveLength(1)
  })
})
