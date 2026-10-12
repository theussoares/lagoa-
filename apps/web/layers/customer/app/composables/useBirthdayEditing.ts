import type { ComputedRef, Ref } from 'vue'
import type { AsyncResultState } from '#layers/core/app/types/asyncResult'
import type { Birthday } from '#shared/schemas/common'
import type { CustomerProfile } from '#shared/schemas/customer'
import type { TransportError } from '#shared/types/errors'
import type { BirthdayAction, BirthdayFormLabels } from '../types/profile'
import { formatBirthday, formatChangeableAt } from '../utils/birthdayModel'

interface BirthdayEditingSource {
  readonly state: ComputedRef<AsyncResultState<CustomerProfile, TransportError>>
  readonly set: (profile: CustomerProfile) => void
  readonly reload: () => Promise<void>
}

interface BirthdayEditingRefs {
  readonly pending: Ref<BirthdayAction | null>
  readonly lockedUntil: ComputedRef<string | null>
  readonly labels: ComputedRef<BirthdayFormLabels>
  readonly save: (birthday: Birthday | null, action: BirthdayAction) => Promise<void>
}

/** Textos e gravação do aniversário no Perfil (a troca fica travada por 365 dias no servidor). */
export function useBirthdayEditing({ state, set, reload }: BirthdayEditingSource): BirthdayEditingRefs {
  const { t } = useI18n()
  const toast = useToast()
  const { profile } = useCustomerServices()
  const pending = ref<BirthdayAction | null>(null)

  const lockedUntil = computed(() => {
    if (state.value.status !== 'success') return null
    const changeableAt = state.value.value.birthdayChangeableAt
    return changeableAt === null ? null : formatChangeableAt(changeableAt)
  })
  const labels = computed<BirthdayFormLabels>(() => ({
    legend: t('profile.birthday.legend'),
    help: t('profile.birthday.help'),
    day: t('profile.birthday.day'),
    month: t('profile.birthday.month'),
    placeholderDay: t('profile.birthday.placeholderDay'),
    placeholderMonth: t('profile.birthday.placeholderMonth'),
    partial: t('profile.birthday.partial'),
    locked: lockedUntil.value === null ? null : t('profile.birthday.lockedUntil', { date: lockedUntil.value }),
    save: t('profile.birthday.save'),
    remove: t('profile.birthday.remove'),
    removeTitle: t('profile.birthday.removeTitle'),
    removeDescription:
      lockedUntil.value === null
        ? t('profile.birthday.removeDescriptionFree')
        : t('profile.birthday.removeDescription', { date: lockedUntil.value }),
    removeConfirm: t('profile.birthday.removeConfirm'),
    removeCancel: t('profile.birthday.removeCancel'),
  }))

  async function save(birthday: Birthday | null, action: BirthdayAction): Promise<void> {
    if (state.value.status !== 'success') return
    pending.value = action
    const result = await profile.updateProfile({ firstName: state.value.value.firstName, birthday })
    pending.value = null
    if (!result.ok) {
      toast.add({ color: 'error', icon: 'i-ph-warning-circle', title: t(`errors.${result.error.code}`) })
      if (result.error.code === 'birthdayLocked') void reload()
      return
    }
    set(result.value)
    const title = birthday === null ? t('profile.birthday.removed') : t('profile.birthday.saved', { date: formatBirthday(birthday) })
    toast.add({ color: 'success', icon: 'i-ph-check-circle', title })
  }

  return { pending, lockedUntil, labels, save }
}
