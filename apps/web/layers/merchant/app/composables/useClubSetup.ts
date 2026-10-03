import type { ProgramMode } from '#shared/schemas/program'
import { useClubSetupStore } from '../stores/clubSetup'
import {
  firstStepWithErrors,
  programErrorsForSteps,
  shopFieldErrors,
  stepHasErrors,
  toClubSetupDraft,
} from '../utils/clubSetupForm'
import type { ClubSetupFormStep, ClubSetupStep, ShopFieldErrors, ClubSetupSubmitState, ClubPosterState, ClubSetup } from '../types/clubSetup'
import type { ProgramFieldErrors } from '../types/program'
import { switchMode } from '../utils/programForm'

const NEXT_STEP: Readonly<Record<ClubSetupFormStep, ClubSetupFormStep | null>> = { shop: 'rules', rules: 'reward', reward: null }
const PREVIOUS_STEP: Readonly<Record<ClubSetupFormStep, ClubSetupFormStep | null>> = { shop: null, rules: 'shop', reward: 'rules' }

/** Loja → Regra → Prêmio; "Criar o clube" envia tudo de uma vez e mostra o cartaz. */
export function useClubSetup(): ClubSetup {
  const { clubSetup, poster } = useMerchantServices()
  const ticketStore = useClubSetupStore()
  const { form } = storeToRefs(ticketStore)
  const { start } = useMerchantSession()

  const step = ref<ClubSetupStep>('shop')
  const attempted = ref<Set<ClubSetupFormStep>>(new Set())
  const submitState = shallowRef<ClubSetupSubmitState>({ status: 'idle' })
  const posterState = shallowRef<ClubPosterState>({ status: 'loading' })

  const shopErrors = computed<ShopFieldErrors>(() => (attempted.value.has('shop') ? shopFieldErrors(form.value.shop) : {}))
  const programErrors = computed<ProgramFieldErrors>(() => programErrorsForSteps(form.value.program, attempted.value))

  function markAttempted(...steps: ClubSetupFormStep[]): void {
    attempted.value = new Set([...attempted.value, ...steps])
  }

  function next(): void {
    const current = step.value
    if (current === 'poster') return
    markAttempted(current)
    if (stepHasErrors(form.value, current)) return
    const following = NEXT_STEP[current]
    if (following !== null) step.value = following
  }

  function back(): void {
    const current = step.value
    if (current === 'poster') return
    const previous = PREVIOUS_STEP[current]
    if (previous !== null) step.value = previous
  }

  function setMode(mode: ProgramMode): void {
    form.value.program.rules = switchMode(form.value.program.rules, mode)
  }

  async function create(): Promise<void> {
    if (submitState.value.status === 'creating') return
    markAttempted('shop', 'rules', 'reward')
    const pending = firstStepWithErrors(form.value)
    const draft = toClubSetupDraft(form.value)
    if (pending !== null || draft === null) {
      step.value = pending ?? 'shop'
      return
    }
    const ticket = ticketStore.ticket
    if (ticket === null || !ticketStore.hasValidTicket(new Date())) {
      submitState.value = { status: 'error', code: 'signUpExpired' }
      return
    }
    submitState.value = { status: 'creating' }
    const result = await clubSetup.createClub(ticket, draft)
    if (!result.ok) {
      submitState.value = { status: 'error', code: result.error.code }
      return
    }
    ticketStore.finish()
    start(result.value)
    submitState.value = { status: 'idle' }
    step.value = 'poster'
    await loadPoster()
  }

  async function loadPoster(): Promise<void> {
    posterState.value = { status: 'loading' }
    const result = await poster.getPoster()
    posterState.value = result.ok ? { status: 'success', poster: result.value } : { status: 'error' }
  }

  return { step, form, shopErrors, programErrors, submitState, posterState, next, back, setMode, create, loadPoster }
}
