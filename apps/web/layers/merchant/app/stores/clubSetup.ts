import { emptyClubSetupForm } from '../utils/clubSetupForm'
import type { ClubSetupForm } from '../types/clubSetup'

/**
 * Rascunho do Criar o clube, só em memória: recarregar a página perde o que foi digitado, mas não a sessão
 * (o servidor sabe que o celular está confirmado). O celular nunca passa por aqui.
 */
export const useClubSetupStore = defineStore('clubSetup', () => {
  const form = ref<ClubSetupForm>(emptyClubSetupForm())

  /** Clube criado, outro lojista entrou ou saiu: nada do cadastro fica para a próxima pessoa no balcão. */
  function finish(): void {
    form.value = emptyClubSetupForm()
  }

  return { form, finish }
})
