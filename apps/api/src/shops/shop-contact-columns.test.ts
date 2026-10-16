import { describe, expect, it } from 'vitest'
import { contactFromColumns, columnsFromContact, type ShopContactColumns } from './shop-contact-columns'

const empty: ShopContactColumns = { ctaKind: null, whatsapp: null, whatsappMessage: null, ctaUrl: null, ctaLabel: null }

describe('contactFromColumns', () => {
  it('is null without a kind', () => {
    expect(contactFromColumns(empty)).toBeNull()
  })
  it('builds the whatsapp kind, with or without message and label', () => {
    expect(contactFromColumns({ ...empty, ctaKind: 'whatsapp', whatsapp: '67991234567' })).toEqual({
      kind: 'whatsapp', whatsapp: '67991234567', message: null, ctaLabel: null,
    })
    expect(
      contactFromColumns({ ...empty, ctaKind: 'whatsapp', whatsapp: '67991234567', whatsappMessage: 'Oi', ctaLabel: 'Chamar agora' }),
    ).toEqual({ kind: 'whatsapp', whatsapp: '67991234567', message: 'Oi', ctaLabel: 'Chamar agora' })
  })
  it('builds the url kind', () => {
    expect(contactFromColumns({ ...empty, ctaKind: 'url', ctaUrl: 'https://loja.com', ctaLabel: 'Comprar agora' })).toEqual({
      kind: 'url', url: 'https://loja.com', ctaLabel: 'Comprar agora',
    })
  })
  it('drops a row the domain does not recognise instead of failing', () => {
    expect(contactFromColumns({ ...empty, ctaKind: 'whatsapp', whatsapp: '123' })).toBeNull()
    expect(contactFromColumns({ ...empty, ctaKind: 'url', ctaUrl: 'http://loja.com', ctaLabel: 'x' })).toBeNull()
    expect(contactFromColumns({ ...empty, ctaKind: 'url', ctaUrl: 'https://loja.com', ctaLabel: null })).toBeNull()
  })
})

describe('columnsFromContact', () => {
  it('clears every column for no button', () => {
    expect(columnsFromContact(null)).toEqual(empty)
  })
  it('fills only the columns of the chosen kind', () => {
    expect(columnsFromContact({ kind: 'url', url: 'https://loja.com', ctaLabel: 'Comprar agora' })).toEqual({
      ...empty, ctaKind: 'url', ctaUrl: 'https://loja.com', ctaLabel: 'Comprar agora',
    })
    expect(
      columnsFromContact({ kind: 'whatsapp', whatsapp: '67991234567' as never, message: 'Oi', ctaLabel: null }),
    ).toEqual({ ...empty, ctaKind: 'whatsapp', whatsapp: '67991234567', whatsappMessage: 'Oi' })
  })
})
