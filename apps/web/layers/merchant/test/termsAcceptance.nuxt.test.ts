import { afterEach, describe, expect, it } from 'vitest'
import { mountComponent, unmountAll } from '#layers/core/test/componentHarness.nuxt'
import TermsAcceptance from '../app/components/home/TermsAcceptance.vue'

afterEach(unmountAll)

const props = { version: '2026-10-pilot', accepting: false, errorCode: null }

describe('HomeTermsAcceptance', () => {
  it('shows the terms text with its version', async () => {
    const page = await mountComponent(TermsAcceptance, props)
    expect(page.text()).toContain('Termo de uso do lojista')
    expect(page.text()).toContain('Gerar o QR da visita somente no momento de uma venda real')
    expect(page.text()).toContain('Versão 2026-10-pilot')
  })

  it('only accepts after the checkbox is ticked', async () => {
    const page = await mountComponent(TermsAcceptance, props)
    expect(page.get('button[type="submit"]').attributes('disabled')).toBeDefined()
    await page.get('input[type="checkbox"]').setValue(true)
    expect(page.get('button[type="submit"]').attributes('disabled')).toBeUndefined()
    await page.get('form').trigger('submit')
    expect(page.emitted('accept')).toHaveLength(1)
  })

  it('asks for a reload when the server refused the shown version', async () => {
    const page = await mountComponent(TermsAcceptance, { ...props, errorCode: 'merchantTermsNotAccepted' })
    expect(page.get('[role="alert"]').text()).toContain('Recarregue a página')
  })

  it('shows the generic error text for other failures', async () => {
    const page = await mountComponent(TermsAcceptance, { ...props, errorCode: 'network' })
    expect(page.find('[role="alert"]').exists()).toBe(true)
  })
})
