import { afterEach, describe, expect, it } from 'vitest'
import { mountComponent, unmountAll } from '#layers/core/test/componentHarness.nuxt'
import RankingLink from '../app/components/profile/RankingLink.vue'
import EraseAccount from '../app/components/profile/EraseAccount.vue'

afterEach(unmountAll)

describe('profile actions', () => {
  it('ranking is a real link with a touch target of at least 44px', async () => {
    const row = await mountComponent(RankingLink, {})
    const link = row.get('a')
    expect(link.attributes('href')).toBe('/ranking')
    expect(link.text()).toBe('Ranking da cidade')
    expect(link.classes()).toContain('min-h-12')
  })

  it('erasing starts as an outlined danger action and confirms with a solid one', async () => {
    const labels = { help: 'h', button: 'Apagar minha conta', confirmTitle: 't', confirmDescription: 'd', confirm: 'Confirmar apagar', cancel: 'Manter minha conta' }
    const erase = await mountComponent(EraseAccount, { pending: false, labels })
    const trigger = erase.get('button')
    expect(trigger.classes().join(' ')).toContain('ring-error')
    await trigger.trigger('click')
    const buttons = Array.from(document.body.querySelectorAll('button'))
    expect(buttons.find((b) => b.textContent?.includes('Confirmar apagar'))?.className).toContain('bg-error')
    expect(buttons.find((b) => b.textContent?.includes('Manter minha conta'))?.className).toContain('ring-accented')
  })
})
