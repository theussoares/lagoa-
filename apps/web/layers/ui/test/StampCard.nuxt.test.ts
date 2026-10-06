import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import StampCard from '../app/components/StampCard.vue'
import type { StampCardModel } from '../app/types/wallet'

function model(note: string | null): StampCardModel {
  return {
    id: 'card_1',
    shopName: 'Barbearia Navalha',
    shopDetail: 'Centro',
    icon: 'i-ph-scissors',
    progress: '00/10',
    body: { kind: 'ruler', balance: 0, target: 10, label: '0 de 10 carimbos' },
    status: { kind: 'remaining', count: '10', unitLine: 'carimbos para', reward: 'Corte grátis' },
    peek: 'Faltam 10 carimbos',
    summary: 'Barbearia Navalha: 0 de 10.',
    rewardReady: false,
    note,
  }
}

describe('StampCard note', () => {
  it('shows the note as readable text, not hidden from screen readers', async () => {
    const wrapper = await mountSuspended(StampCard, { props: { card: model('Peça o QR da visita no caixa para ganhar.') } })
    const note = wrapper.findAll('p').find((paragraph) => paragraph.text().includes('QR da visita'))
    expect(note?.exists()).toBe(true)
    expect(note?.attributes('aria-hidden')).toBeUndefined()
    expect(note?.classes()).toContain('text-toned')
  })

  it('renders no note paragraph when the card already has a visit', async () => {
    const wrapper = await mountSuspended(StampCard, { props: { card: model(null) } })
    expect(wrapper.text()).not.toContain('QR da visita')
    expect(wrapper.find('.border-dashed').exists()).toBe(false)
  })
})
