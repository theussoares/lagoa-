import type { Ref } from 'vue'

/** Como a pessoa guarda o app: diálogo nativo (Android) ou passo a passo manual (iPhone). */
export type InstallPlatform = 'android' | 'ios'

/** O que o convite lembra, só neste aparelho. */
export interface InstallInviteMemory {
  readonly dismissedCount: number
  /** Quantos ganhos a pessoa tinha quando dispensou; o convite só volta depois de um novo. */
  readonly earnedAtDismiss: number
  readonly installed: boolean
}

export interface InstallInviteContext {
  readonly platform: InstallPlatform | null
  readonly standalone: boolean
  readonly earnedCount: number
  readonly memory: InstallInviteMemory
}

export interface InstallInviteStore {
  read: () => InstallInviteMemory
  write: (memory: InstallInviteMemory) => void
}

/** O que a tela usa do convite (já sem o `Ref`, dentro do `reactive` da tela). `null` = não mostrar. */
export interface InstallInviteScreen {
  readonly platform: InstallPlatform | null
  readonly install: () => Promise<void>
  readonly dismiss: () => void
}

export interface InstallInviteControl extends Omit<InstallInviteScreen, 'platform'> {
  readonly platform: Readonly<Ref<InstallPlatform | null>>
}

/** Evento do Chrome que guarda o diálogo nativo de instalação; ainda fora do tipo padrão do DOM. */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}
