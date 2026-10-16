import { describe, expect, it } from 'vitest'
import { PhoneNumberSchema } from '#shared/schemas/phone'
import { ctaLabelPresets, isFormErrorCode, emptyContactForm, formFromContact, formatWhatsapp, toContactPreview, toContactUpdate, whatsappDigits } from '../app/utils/shopContactForm'

describe('whatsappDigits', () => {
  it('keeps only the digits and drops the country code of a pasted number', () => {
    expect(whatsappDigits('(67) 99123-4567')).toBe('67991234567')
    expect(whatsappDigits('+55 67 99123-4567')).toBe('67991234567')
  })
})

describe('formatWhatsapp', () => {
  it('shapes the number while it is typed', () => {
    expect(formatWhatsapp('6')).toBe('6')
    expect(formatWhatsapp('67991')).toBe('(67) 991')
    expect(formatWhatsapp('67991234567')).toBe('(67) 99123-4567')
    expect(formatWhatsapp('679912345678888')).toBe('(67) 99123-4567')
  })
})

const whatsappForm = { ...emptyContactForm('whatsapp'), whatsapp: '(67) 99123-4567' }
const urlForm = { ...emptyContactForm('url'), url: 'www.loja.com.br/cardapio', ctaLabel: 'Ver cardápio' }

describe('formFromContact', () => {
  it('starts on WhatsApp with empty fields when the shop has no button', () => {
    expect(formFromContact(null)).toEqual(emptyContactForm('whatsapp'))
  })

  it('fills only the fields of the saved kind, with the number formatted', () => {
    expect(formFromContact({ kind: 'whatsapp', whatsapp: PhoneNumberSchema.parse('67991234567'), message: 'Oi', ctaLabel: null })).toEqual({
      ...emptyContactForm('whatsapp'),
      whatsapp: '(67) 99123-4567',
      message: 'Oi',
    })
    expect(formFromContact({ kind: 'url', url: 'https://loja.com', ctaLabel: 'Comprar agora' })).toEqual({
      ...emptyContactForm('url'),
      url: 'https://loja.com',
      ctaLabel: 'Comprar agora',
    })
  })
})

describe('toContactUpdate', () => {
  it('builds the WhatsApp button; empty message and text become null', () => {
    expect(toContactUpdate(whatsappForm)).toEqual({
      ok: true,
      update: { contact: { kind: 'whatsapp', whatsapp: '67991234567', message: null, ctaLabel: null } },
    })
    expect(toContactUpdate({ ...whatsappForm, message: ' Oi!\nQuero agendar ', ctaLabel: '  Agendar agora ' })).toEqual({
      ok: true,
      update: { contact: { kind: 'whatsapp', whatsapp: '67991234567', message: 'Oi!\nQuero agendar', ctaLabel: 'Agendar agora' } },
    })
  })

  it('refuses a WhatsApp that is empty or not a mobile', () => {
    expect(toContactUpdate({ ...whatsappForm, whatsapp: '' })).toEqual({ ok: false, code: 'invalidWhatsapp' })
    expect(toContactUpdate({ ...whatsappForm, whatsapp: '6733211234' })).toEqual({ ok: false, code: 'invalidWhatsapp' })
  })

  it('builds the link button, adding https:// to a link typed without it', () => {
    expect(toContactUpdate(urlForm)).toEqual({
      ok: true,
      update: { contact: { kind: 'url', url: 'https://www.loja.com.br/cardapio', ctaLabel: 'Ver cardápio' } },
    })
  })

  it.each(['', 'http://loja.com', 'javascript:alert(1)', 'https://localhost', 'https://127.0.0.1', 'sem espaço no meio'])(
    'refuses the link %j',
    (url) => {
      expect(toContactUpdate({ ...urlForm, url })).toEqual({ ok: false, code: 'invalidUrl' })
    },
  )

  it('requires the button text for a link', () => {
    expect(toContactUpdate({ ...urlForm, ctaLabel: '   ' })).toEqual({ ok: false, code: 'missingLabel' })
  })

  it('cuts message and text by code point, so an emoji is never split', () => {
    const emoji = toContactUpdate({ ...whatsappForm, message: '😀'.repeat(301), ctaLabel: '😀'.repeat(30) })
    expect(emoji.ok && emoji.update.contact?.kind === 'whatsapp' && Array.from(emoji.update.contact.message ?? '')).toHaveLength(300)
    expect(emoji.ok && Array.from(emoji.update.contact?.ctaLabel ?? '')).toHaveLength(24)
  })

  it('cuts the text at the limit instead of failing', () => {
    const result = toContactUpdate({ ...urlForm, ctaLabel: 'x'.repeat(40) })
    expect(result.ok && result.update.contact?.ctaLabel).toHaveLength(24)
  })
})

describe('toContactPreview', () => {
  it('is null while the form cannot be saved', () => {
    expect(toContactPreview(emptyContactForm('whatsapp'), 'Falar no WhatsApp')).toBeNull()
  })

  it('shows the WhatsApp button with the default text and the ready message in the link', () => {
    expect(toContactPreview({ ...whatsappForm, message: 'Oi' }, 'Falar no WhatsApp')).toEqual({
      label: 'Falar no WhatsApp',
      icon: 'i-ph-whatsapp-logo',
      href: 'https://wa.me/5567991234567?text=Oi',
    })
  })

  it('shows the link button with the text typed', () => {
    expect(toContactPreview(urlForm, 'Falar no WhatsApp')).toEqual({
      label: 'Ver cardápio',
      icon: 'i-ph-arrow-square-out',
      href: 'https://www.loja.com.br/cardapio',
    })
  })
})

describe('isFormErrorCode', () => {
  it('knows exactly the form error codes', () => {
    expect(isFormErrorCode('invalidUrl')).toBe(true)
    expect(isFormErrorCode('notFound')).toBe(false)
  })
})

describe('ctaLabelPresets', () => {
  it('suggests other texts for a link than for WhatsApp', () => {
    expect(ctaLabelPresets('whatsapp')).toEqual(['call', 'schedule', 'order', 'talk'])
    expect(ctaLabelPresets('url')).toEqual(['buy', 'schedule', 'menu', 'order'])
  })
})
