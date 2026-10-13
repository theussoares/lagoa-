import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import BirthdayForm from '../app/components/profile/BirthdayForm.vue'
import type { BirthdayFormLabels } from '../app/types/profile'

const LABELS: BirthdayFormLabels = {
  legend: 'Aniversário',
  help: 'Ajuda do aniversário',
  day: 'Dia',
  month: 'Mês',
  placeholderDay: 'Dia',
  placeholderMonth: 'Mês',
  partial: 'Escolha o dia e o mês',
  locked: null,
  save: 'Salvar',
  remove: 'Tirar aniversário',
  removeTitle: 'Tirar?',
  removeDescription: 'Descrição',
  removeConfirm: 'Tirar',
  removeCancel: 'Voltar',
}

async function mountForm(props: { birthday: string | null; labels?: Partial<BirthdayFormLabels> }) {
  return mountSuspended(BirthdayForm, { props: { birthday: props.birthday as never, labels: { ...LABELS, ...props.labels }, pending: null } })
}

describe('BirthdayForm accessibility', () => {
  it('describes the fieldset with the help text', async () => {
    const form = await mountForm({ birthday: null })
    expect(form.get('#birthday-help').text()).toBe('Ajuda do aniversário')
    expect(form.get('fieldset').attributes('aria-describedby')).toBe('birthday-help')
    expect(form.find('#birthday-notice').exists()).toBe(false)
  })

  it('links the partial-date notice to the fieldset as a status', async () => {
    const form = await mountForm({ birthday: null })
    form.findAllComponents({ name: 'USelect' })[1]?.vm.$emit('update:modelValue', '3')
    await flushPromises()
    const notice = form.get('#birthday-notice')
    expect(notice.text()).toBe('Escolha o dia e o mês')
    expect(notice.attributes('role')).toBe('status')
    expect(form.get('fieldset').attributes('aria-describedby')).toBe('birthday-help birthday-notice')
  })

  it('shows the release date when locked, without save and with the remove button', async () => {
    const form = await mountForm({ birthday: '03-05', labels: { locked: 'Você pode trocar a data a partir de 2 de out.' } })
    expect(form.get('#birthday-notice').text()).toContain('2 de out.')
    expect(form.get('fieldset').attributes('aria-describedby')).toBe('birthday-help birthday-notice')
    expect(form.text()).not.toContain('Salvar')
    expect(form.text()).toContain('Tirar aniversário')
  })
})

describe('BirthdayForm action roles', () => {
  it('saves as the form primary and removes as an outlined danger action', async () => {
    const form = await mountForm({ birthday: '03-15' })
    const buttons = form.findAll('button')
    expect(buttons.find((b) => b.text() === 'Salvar')?.classes()).toContain('bg-primary')
    expect(buttons.find((b) => b.text() === 'Tirar aniversário')?.classes().join(' ')).toContain('ring-error')
  })
})
