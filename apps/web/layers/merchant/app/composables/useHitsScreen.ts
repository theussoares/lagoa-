import type { MerchantHitItem } from '#shared/schemas/hitItem'
import type { HitItemService } from '../services/HitItemService'
import type { HitItemForm, HitItemSaveState, HitsScreen } from '../types/hitItem'
import type { ShopContactForm, ShopContactMessage } from '../types/shopContact'
import { emptyHitItemForm, formFromItem, saveErrorOf, toHitItemDraft, toHitItemPreview, toHitItemRow } from '../utils/hitItemForm'
import { formatWhatsapp, whatsappDigits } from '../utils/shopContactForm'

type ItemResult = Awaited<ReturnType<HitItemService['archive']>>

/** Tela "Hits": lista os produtos da loja e abre o formulário de novo ou de edição; o que foi digitado vale até salvar ou cancelar. */
export function useHitsScreen(): HitsScreen {
  const { t } = useI18n()
  const { hits } = useMerchantServices()
  const { expire } = useMerchantSession()
  const { state: loaded, set } = useAsyncResult(() => hits.list())
  const state = ref<HitItemSaveState>({ status: 'idle' })
  const message = ref<ShopContactMessage | null>(null)
  const formOpen = ref(false)
  const editingId = ref<string | null>(null)
  const typed = ref<HitItemForm | null>(null)
  const photo = useHitPhoto()

  const items = computed<readonly MerchantHitItem[]>(() => (loaded.value.status === 'success' ? loaded.value.value.items : []))
  const cap = computed(() => (loaded.value.status === 'success' ? loaded.value.value.cap : 0))
  const activeCount = computed(() => items.value.filter((item) => item.status !== 'archived').length)
  const editing = computed(() => items.value.find((item) => item.id === editingId.value) ?? null)
  const form = computed(() => typed.value ?? emptyHitItemForm())
  const photoUrl = computed(() => photo.pendingUrl.value ?? editing.value?.photoUrl ?? null)
  const preview = computed(() => toHitItemPreview(form.value, photoUrl.value, t('shopContact.defaultLabel')))
  const saveError = computed(() => saveErrorOf(state.value))

  watch(loaded, (current) => {
    if (current.status === 'error' && current.error.code === 'unauthorized') expire()
  })

  function upsert(item: MerchantHitItem): void {
    const exists = items.value.some((current) => current.id === item.id)
    set({ items: exists ? items.value.map((current) => (current.id === item.id ? item : current)) : [item, ...items.value], cap: cap.value })
  }

  function close(): void {
    formOpen.value = false
    editingId.value = null
    typed.value = null
    photo.clear()
    state.value = { status: 'idle' }
  }

  function open(item: MerchantHitItem | null): void {
    close()
    message.value = null
    editingId.value = item?.id ?? null
    typed.value = item === null ? null : formFromItem(item)
    formOpen.value = true
  }

  function startEdit(id: string): void {
    const item = items.value.find((current) => current.id === id)
    if (item !== undefined && item.status !== 'archived') open(item)
  }

  function change(patch: Partial<HitItemForm>): void {
    typed.value = { ...form.value, ...patch }
    state.value = { status: 'idle' }
  }

  function changeContact(patch: Partial<ShopContactForm>): void {
    const next = patch.whatsapp === undefined ? patch : { ...patch, whatsapp: formatWhatsapp(whatsappDigits(patch.whatsapp)) }
    change({ contact: { ...form.value.contact, ...next } })
  }

  async function choosePhoto(file: File): Promise<void> {
    const chosen = await photo.choose(file)
    state.value = chosen ? { status: 'idle' } : { status: 'error', code: 'unreadable' }
  }

  function fail(result: Extract<ItemResult, { ok: false }>): Promise<void> | void {
    if (result.error.code === 'unauthorized') return expire()
    state.value = { status: 'error', code: result.error.code }
  }

  async function save(): Promise<void> {
    if (state.value.status === 'saving' || loaded.value.status !== 'success') return
    const draft = toHitItemDraft(form.value, new Date())
    if (!draft.ok) {
      state.value = { status: 'error', code: draft.code }
      return
    }
    if (photo.upload.value === null && editing.value?.photoUrl == null) {
      state.value = { status: 'error', code: 'missingPhoto' }
      return
    }
    const wasApproved = editing.value?.status === 'approved'
    state.value = { status: 'saving' }
    const saved = await (editingId.value === null ? hits.create(draft.draft) : hits.update(editingId.value, draft.draft))
    if (!saved.ok) return fail(saved)
    upsert(saved.value)
    // Já existe no servidor: se a foto falhar, o próximo "Salvar" edita este item em vez de criar outro.
    editingId.value = saved.value.id
    if (photo.upload.value !== null) {
      const sent = await hits.uploadPhoto(saved.value.id, photo.upload.value)
      if (!sent.ok) return fail(sent)
      upsert(sent.value)
    }
    close()
    message.value = { tone: 'success', key: wasApproved ? 'merchantHits.backToReview' : 'merchantHits.sentToReview' }
  }

  async function act(run: () => Promise<ItemResult>, successKey: string): Promise<void> {
    if (state.value.status === 'saving') return
    state.value = { status: 'saving' }
    const result = await run()
    state.value = { status: 'idle' }
    if (result.ok) {
      upsert(result.value)
      message.value = { tone: 'success', key: successKey }
      return
    }
    if (result.error.code === 'unauthorized') return expire()
    message.value = { tone: 'error', key: `errors.${result.error.code}` }
  }

  return reactive({
    loading: computed(() => loaded.value.status === 'loading'),
    loadError: computed(() => (loaded.value.status === 'error' ? loaded.value.error.code : null)),
    rows: computed(() => items.value.map(toHitItemRow)),
    cap,
    activeCount,
    canCreate: computed(() => activeCount.value < cap.value),
    formOpen,
    editingId,
    form,
    photoUrl,
    preview,
    state,
    fieldError: computed(() => saveError.value.field),
    errorKey: computed(() => saveError.value.key),
    message,
    startCreate: () => open(null),
    startEdit,
    cancel: close,
    change,
    changeContact,
    choosePhoto,
    save,
    archive: (id: string) => act(() => hits.archive(id), 'merchantHits.archived'),
    unarchive: (id: string) => act(() => hits.unarchive(id), 'merchantHits.unarchivedToReview'),
  })
}
