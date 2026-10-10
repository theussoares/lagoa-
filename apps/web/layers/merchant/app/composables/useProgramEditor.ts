import type { Program, ProgramDraft, ProgramMode } from '#shared/schemas/program'
import type { TransportError } from '#shared/types/errors'
import { ok } from '#shared/types/result'
import type { Result } from '#shared/types/result'
import { isSameDraft, programFieldErrors, switchMode, toProgramDraft } from '../utils/programForm'
import type { ProgramFieldErrors, ProgramSaveState, ProgramEditor, ProgramSnapshot } from '../types/program'

export function useProgramEditor(): ProgramEditor {
  const { program: programService } = useMerchantServices()

  const { state, reload, set } = useAsyncResult(async (): Promise<Result<ProgramSnapshot, TransportError>> => {
    const [program, activeCards] = await Promise.all([programService.getProgram(), programService.countActiveCards()])
    if (!program.ok) return program
    if (!activeCards.ok) return activeCards
    return ok({ program: program.value, activeCards: activeCards.value })
  })

  const draft = ref<ProgramDraft | null>(null)
  const saveState = shallowRef<ProgramSaveState>({ status: 'idle' })
  const triedToSave = ref(false)

  const savedProgram = computed(() => (state.value.status === 'success' ? state.value.value.program : null))
  const saved = computed(() => (savedProgram.value === null ? null : toProgramDraft(savedProgram.value)))

  // Só um programa novo do servidor troca o rascunho; atualizar a contagem de cartões não apaga o que foi digitado.
  watch(savedProgram, () => {
    draft.value = saved.value === null ? null : structuredClone(saved.value)
    triedToSave.value = false
  })

  // Cartão em andamento termina na versão em que nasceu: com clientes, mudar a meta só vale para os cartões novos.
  const hasActiveCards = computed(() => state.value.status === 'success' && state.value.value.activeCards > 0)
  const targetChanged = computed(
    () =>
      hasActiveCards.value &&
      draft.value !== null &&
      saved.value !== null &&
      draft.value.rules.target !== saved.value.rules.target,
  )
  const pointsToStampsChanged = computed(
    () =>
      hasActiveCards.value &&
      draft.value !== null &&
      saved.value !== null &&
      saved.value.rules.mode === 'pointsPerCurrency' &&
      draft.value.rules.mode === 'stamps',
  )
  const isDirty = computed(() => draft.value !== null && saved.value !== null && !isSameDraft(draft.value, saved.value))
  const fieldErrors = computed<ProgramFieldErrors>(() =>
    triedToSave.value && draft.value !== null ? programFieldErrors(draft.value) : {},
  )

  // Voltar a editar depois de salvar tira o "Salvo" da tela.
  watch(isDirty, (dirty) => {
    if (dirty && saveState.value.status === 'saved') saveState.value = { status: 'idle' }
  })

  function setMode(mode: ProgramMode): void {
    if (draft.value === null) return
    draft.value.rules = switchMode(draft.value.rules, mode)
  }

  async function save(): Promise<void> {
    if (draft.value === null || state.value.status !== 'success' || saveState.value.status === 'saving') return
    triedToSave.value = true
    if (Object.keys(programFieldErrors(draft.value)).length > 0) {
      saveState.value = { status: 'error', code: 'invalidProgram' }
      return
    }
    const { program, activeCards } = state.value.value
    saveState.value = { status: 'saving' }
    const result = await programService.updateProgram(draft.value)
    if (!result.ok) {
      saveState.value = { status: 'error', code: result.error.code }
      return
    }
    set({ program: result.value, activeCards })
    saveState.value = { status: 'saved' }
  }

  async function refreshActiveCards(program: Program): Promise<void> {
    const count = await programService.countActiveCards()
    if (count.ok) set({ program, activeCards: count.value })
  }

  function discard(): void {
    if (saved.value === null) return
    draft.value = structuredClone(saved.value)
    triedToSave.value = false
  }

  return { state, draft, targetChanged, pointsToStampsChanged, isDirty, fieldErrors, saveState, reload, setMode, save, discard }
}
