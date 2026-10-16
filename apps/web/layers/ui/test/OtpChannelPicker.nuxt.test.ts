import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import OtpChannelPicker from '../app/components/OtpChannelPicker.vue'
import type { OtpChannelPickerOption } from '../app/types/channel'

const TEST_OPTIONS: readonly OtpChannelPickerOption<'whatsapp' | 'sms'>[] = [
  { value: 'whatsapp', label: 'WhatsApp', icon: 'i-ph-whatsapp-logo' },
  { value: 'sms', label: 'SMS', icon: 'i-ph-chat-circle-dots' },
]

describe('OtpChannelPicker', () => {
  it('renders radio buttons for WhatsApp and SMS with WhatsApp selected by default', async () => {
    const component = await mountSuspended(OtpChannelPicker, {
      props: {
        modelValue: 'whatsapp',
        legend: 'Receber código por',
        options: TEST_OPTIONS,
      },
    })

    expect(component.text()).toContain('Receber código por')
    const inputs = component.findAll('input[type="radio"]')
    expect(inputs).toHaveLength(2)

    const whatsappRadio = inputs[0]
    const smsRadio = inputs[1]

    expect(whatsappRadio?.attributes('value')).toBe('whatsapp')
    expect(smsRadio?.attributes('value')).toBe('sms')
    expect((whatsappRadio?.element as HTMLInputElement).checked).toBe(true)
    expect((smsRadio?.element as HTMLInputElement).checked).toBe(false)
  })

  it('emits update:modelValue when selecting SMS', async () => {
    const component = await mountSuspended(OtpChannelPicker, {
      props: {
        modelValue: 'whatsapp',
        legend: 'Receber código por',
        options: TEST_OPTIONS,
      },
    })

    const smsRadio = component.findAll('input[type="radio"]')[1]
    await smsRadio?.setValue(true)

    expect(component.emitted('update:modelValue')?.[0]).toEqual(['sms'])
  })

  it('disables all radio inputs when disabled prop is true', async () => {
    const component = await mountSuspended(OtpChannelPicker, {
      props: {
        modelValue: 'whatsapp',
        legend: 'Receber código por',
        options: TEST_OPTIONS,
        disabled: true,
      },
    })

    const inputs = component.findAll('input[type="radio"]')
    for (const input of inputs) {
      expect(input.attributes('disabled')).toBeDefined()
    }
  })
})
