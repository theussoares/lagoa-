import type { CustomerSession } from '#shared/schemas/session'

/**
 * Sessão do cliente. Não persiste em lugar nenhum do navegador: quem vale é o cookie httpOnly do BFF.
 * `checked` diz se já perguntamos ao servidor (`GET /api/session`); o estado vai no payload do SSR.
 */
export const useSessionStore = defineStore('session', () => {
  const customer = ref<CustomerSession | null>(null)
  const checked = ref(false)

  function startCustomer(session: CustomerSession): void {
    customer.value = session
    checked.value = true
  }

  function endCustomer(): void {
    customer.value = null
    checked.value = true
  }

  /** O painel do lojista trocou o cookie (entrou ou saiu): o que se sabe do cliente pode ser de outra conta, pergunte de novo. */
  function resetCustomer(): void {
    customer.value = null
    checked.value = false
  }

  return { customer, checked, startCustomer, endCustomer, resetCustomer }
})
