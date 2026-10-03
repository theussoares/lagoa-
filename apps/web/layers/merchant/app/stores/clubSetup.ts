import type { IsoDateTime } from '#shared/schemas/common'
import type { SignUpTicket } from '#shared/schemas/session'
import { emptyClubSetupForm } from '../utils/clubSetupForm'
import type { ClubSetupForm } from '../utils/clubSetupForm'

/**
 * Criar o clube, só em memória: recarregar a página volta para o login, onde o
 * celular é confirmado de novo. O celular nunca passa por aqui.
 * O rascunho sobrevive a um ticket vencido: confirmar o celular de novo não
 * apaga o que o lojista já preencheu.
 */
export const useClubSetupStore = defineStore('clubSetup', () => {
  const ticket = ref<SignUpTicket | null>(null)
  const expiresAt = ref<IsoDateTime | null>(null)
  const form = ref<ClubSetupForm>(emptyClubSetupForm())

  function begin(next: SignUpTicket, until: IsoDateTime): void {
    ticket.value = next
    expiresAt.value = until
  }

  function hasValidTicket(now: Date): boolean {
    return ticket.value !== null && expiresAt.value !== null && new Date(expiresAt.value) > now
  }

  /** Clube criado, outro lojista entrou ou saiu: nada do cadastro fica para a próxima pessoa no balcão. */
  function finish(): void {
    ticket.value = null
    expiresAt.value = null
    form.value = emptyClubSetupForm()
  }

  return { ticket, expiresAt, form, begin, hasValidTicket, finish }
})
