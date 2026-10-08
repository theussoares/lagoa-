import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { vi } from 'vitest'
import { useNuxtApp } from '#imports'
import { useSessionStore } from '#layers/core/app/stores/session'
import { useMerchantSessionStore } from '#layers/merchant/app/stores/merchantSession'
import { createMockCustomerServices } from '#layers/core/test/mockCustomerServices'
import { TEST_NOW } from '#layers/core/test/fixtures'
import type { CustomerSession, MerchantSession } from '#shared/schemas/session'

interface World {
  customer?: CustomerSession
  merchant?: MerchantSession
}

/**
 * Estado limpo para cada teste de página: relógio fixo, `localStorage` vazio, mock
 * backend com a seed de exemplo e só as sessões pedidas.
 */
export function resetWorld(world: World = {}): void {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(TEST_NOW)
  window.localStorage.clear()
  useNuxtApp().$mockBackend.reset()
  const sessions = useSessionStore()
  const merchants = useMerchantSessionStore()
  sessions.endCustomer()
  merchants.endMerchant()
  if (world.customer) sessions.startCustomer(world.customer)
  if (world.merchant) merchants.startMerchant(world.merchant)
  // O app do cliente só fala com o BFF; nos testes de página os services HTTP dão lugar ao mock em memória.
  const { $mockBackend, $customerServices } = useNuxtApp()
  Object.assign($customerServices, createMockCustomerServices($mockBackend, { current: () => sessions.customer }))
}

export function restoreClock(): void {
  vi.useRealTimers()
}

/** Texto visível em uma linha só: o que um snapshot de texto compara. */
export function visibleText(wrapper: VueWrapper): string {
  return wrapper.text().replace(/\s+/g, ' ').trim()
}

/** Digita no campo real: o mesmo evento que o navegador dispara. */
export async function typeInto(input: HTMLInputElement, value: string): Promise<void> {
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
  await flushPromises()
}

/** Preenche as casas de um código (UPinInput), uma por uma, como quem digita. */
export async function typeCode(root: ParentNode, code: string): Promise<void> {
  for (const [index, char] of [...code].entries()) {
    const cell = root.querySelectorAll('input')[index]
    if (!(cell instanceof HTMLInputElement)) throw new Error(`no code cell at ${index}`)
    await typeInto(cell, char)
  }
  await flushPromises()
}
