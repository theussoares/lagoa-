import type { Program, ProgramDraft, ProgramMode } from '#shared/schemas/program'
import type { TransportError } from '#shared/types/errors'
import { ok } from '#shared/types/result'
import type { Result } from '#shared/types/result'
import type { AsyncResultState } from '#layers/core/app/composables/useAsyncResult'
import type { UpdateProgramError } from '../services/ProgramService'
import { isSameDraft, programFieldErrors, switchMode, toProgramDraft } from '../utils/programForm'
import type { ProgramFieldErrors } from '../utils/programForm'

interface ProgramSnapshot {
  readonly program: Program
  readonly activeCards: number
}

export type ProgramSaveState =
  | { status: 'idle' }
  | { status: 'saving' }
  | { status: 'saved' }
  | { status: 'error'; code: UpdateProgramError['code'] }

export interface ProgramEditor {
  state: ComputedRef<AsyncResultState<ProgramSnapshot, TransportError>>
  /** Rascunho editável; `null` até o programa carregar. */
  draft: Ref<ProgramDraft | null>
  modeLocked: ComputedRef<boolean>
  isDirty: ComputedRef<boolean>
  /** Só aparecem depois da primeira tentativa de salvar. */
  fieldErrors: ComputedRef<ProgramFieldErrors>
  saveState: Readonly<Ref<ProgramSaveState>>
  reload: () => Promise<void>
  setMode: (mode: ProgramMode) => void
  save: () => Promise<void>
  discard: () => void
}

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

  const saved = computed(() => (state.value.status === 'success' ? toProgramDraft(state.value.value.program) : null))

  watch(saved, (current) => {
    draft.value = current === null ? null : structuredClone(current)
    triedToSave.value = false
  })

  const modeLocked = computed(() => state.value.status === 'success' && state.value.value.activeCards > 0)
  const isDirty = computed(() => draft.value !== null && saved.value !== null && !isSameDraft(draft.value, saved.value))
  const fieldErrors = computed<ProgramFieldErrors>(() =>
    triedToSave.value && draft.value !== null ? programFieldErrors(draft.value) : {},
  )

  // Qualquer edição depois de salvar tira o "Salvo" da tela.
  watch(draft, () => {
    if (saveState.value.status === 'saved' || saveState.value.status === 'error') saveState.value = { status: 'idle' }
  }, { deep: true })

  function setMode(mode: ProgramMode): void {
    if (draft.value === null || modeLocked.value) return
    draft.value.rules = switchMode(draft.value.rules, mode)
  }

  async function save(): Promise<void> {
    if (draft.value === null || state.value.status !== 'success' || saveState.value.status === 'saving') return
    triedToSave.value = true
    if (Object.keys(programFieldErrors(draft.value)).length > 0) {
      saveState.value = { status: 'error', code: 'invalidProgram' }
      return
    }
    const activeCards = state.value.value.activeCards
    saveState.value = { status: 'saving' }
    const result = await programService.updateProgram(draft.value)
    if (!result.ok) {
      saveState.value = { status: 'error', code: result.error.code }
      return
    }
    set({ program: result.value, activeCards })
    await nextTick()
    saveState.value = { status: 'saved' }
  }

  function discard(): void {
    if (saved.value === null) return
    draft.value = structuredClone(saved.value)
    triedToSave.value = false
  }

  return { state, draft, modeLocked, isDirty, fieldErrors, saveState, reload, setMode, save, discard }
}
