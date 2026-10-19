import { afterEach, describe, expect, it } from 'vitest'
import { mountComponent, unmountAll } from '#layers/core/test/componentHarness.nuxt'
import Form from '../app/components/hits/Form.vue'
import List from '../app/components/hits/List.vue'
import StatusBadge from '../app/components/hits/StatusBadge.vue'
import { emptyHitItemForm, toHitItemRow } from '../app/utils/hitItemForm'
import { draft } from './hitItemContract'

afterEach(unmountAll)

const item = {
  ...draft,
  id: '0190b0c0-1111-7000-8000-000000000001',
  status: 'pending' as const,
  rejectionReason: null,
  photoUrl: null,
  createdAt: '2026-10-01T12:00:00.000Z',
  updatedAt: '2026-10-01T12:00:00.000Z',
}

describe('HitsStatusBadge', () => {
  it('names each status and the rejection reason', async () => {
    expect((await mountComponent(StatusBadge, { status: 'pending', reason: null, missingPhoto: false })).text()).toBe('Em análise')
    expect((await mountComponent(StatusBadge, { status: 'approved', reason: null, missingPhoto: false })).text()).toBe('No ar')
    expect((await mountComponent(StatusBadge, { status: 'rejected', reason: 'Foto escura', missingPhoto: false })).text()).toBe('Recusado: Foto escura')
    expect((await mountComponent(StatusBadge, { status: 'archived', reason: null, missingPhoto: false })).text()).toBe('Arquivado')
  })

  it('says when the photo is missing', async () => {
    expect((await mountComponent(StatusBadge, { status: 'pending', reason: null, missingPhoto: true })).text()).toContain('Falta a foto')
  })
})

describe('HitsList', () => {
  it('shows price or "Sob consulta" and offers the right actions per item', async () => {
    const rows = [toHitItemRow({ ...item, priceCents: null }), toHitItemRow({ ...item, id: 'b', status: 'archived' })]
    const page = await mountComponent(List, { rows, busy: false })
    expect(page.text()).toContain('Sob consulta')
    expect(page.text()).toContain('Editar')
    expect(page.text()).toContain('Desarquivar')
    await page.findAll('button').find((button) => button.text() === 'Editar')?.trigger('click')
    expect(page.emitted('edit')?.[0]).toEqual([item.id])
  })

  it('tells there is nothing yet', async () => {
    expect((await mountComponent(List, { rows: [], busy: false })).text()).toContain('ainda não cadastrou')
  })
})

describe('HitsForm', () => {
  const props = { form: emptyHitItemForm(), photoUrl: null, saving: false, fieldError: null, errorKey: null }

  it('defaults to the shop button and shows the own-button fields only when chosen', async () => {
    const page = await mountComponent(Form, props)
    expect(page.text()).toContain('Usar o botão da loja')
    expect(page.text()).not.toContain('Tipo de botão')
    const own = await mountComponent(Form, { ...props, form: { ...props.form, useShopButton: false } })
    expect(own.text()).toContain('Tipo de botão')
  })

  it('marks the field that failed and submits on save', async () => {
    const page = await mountComponent(Form, { ...props, fieldError: 'missingTitle' })
    expect(page.text()).toContain('Escreva o nome do produto.')
    await page.get('form').trigger('submit')
    expect(page.emitted('save')).toHaveLength(1)
  })
})
