import { z } from 'zod'
import type { BeforeInstallPromptEvent, InstallInviteControl, InstallInviteMemory, InstallInviteStore, InstallPlatform } from '../types/installInvite'
import { detectInstallPlatform } from '../utils/installPlatform'
import { EMPTY_INSTALL_MEMORY, shouldShowInstallInvite } from '../utils/installInviteRule'

const STORAGE_KEY = 'lagoa:install-invite'
const MemorySchema = z.object({
  dismissedCount: z.number().int().nonnegative(),
  earnedAtDismiss: z.number().int().nonnegative(),
  installed: z.boolean(),
})

function useInstallInviteStore(): InstallInviteStore {
  function read(): InstallInviteMemory {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      const parsed = raw === null ? null : MemorySchema.safeParse(JSON.parse(raw))
      return parsed?.success ? parsed.data : EMPTY_INSTALL_MEMORY
    } catch {
      return EMPTY_INSTALL_MEMORY
    }
  }
  function write(memory: InstallInviteMemory): void {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(memory))
    } catch {
      // Sem armazenamento: o convite pode voltar na próxima visita.
    }
  }
  return { read, write }
}

/**
 * Convite para guardar o Lagoa+ na tela inicial. No servidor e na hidratação nada aparece (HTML igual nos dois lados);
 * depois de montar, olha aparelho, modo instalado e o que a pessoa já respondeu. `earnedCount` é o total de ganhos dela.
 */
export function useInstallPrompt(earnedCount: () => number): InstallInviteControl {
  const store = useInstallInviteStore()
  const device = shallowRef<{ platform: InstallPlatform | null; standalone: boolean } | null>(null)
  const memory = shallowRef<InstallInviteMemory>(EMPTY_INSTALL_MEMORY)
  // No Android o convite só existe se o Chrome entregou o diálogo nativo; sem ele o toque não faria nada.
  const nativePrompt = shallowRef<BeforeInstallPromptEvent | null>(null)

  function onBeforeInstallPrompt(event: Event): void {
    event.preventDefault()
    nativePrompt.value = event as BeforeInstallPromptEvent
  }
  function onInstalled(): void {
    remember({ ...memory.value, installed: true })
  }
  function remember(next: InstallInviteMemory): void {
    memory.value = next
    store.write(next)
  }

  onMounted(() => {
    device.value = {
      platform: detectInstallPlatform(navigator.userAgent, navigator.maxTouchPoints),
      standalone: window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && navigator.standalone === true),
    }
    memory.value = store.read()
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onInstalled)
  })
  onBeforeUnmount(() => {
    window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.removeEventListener('appinstalled', onInstalled)
  })

  const platform = computed<InstallPlatform | null>(() => {
    const current = device.value
    if (current === null) return null
    if (current.platform === 'android' && nativePrompt.value === null) return null
    const visible = shouldShowInstallInvite({ ...current, earnedCount: earnedCount(), memory: memory.value })
    return visible ? current.platform : null
  })

  function dismiss(): void {
    remember({ ...memory.value, dismissedCount: memory.value.dismissedCount + 1, earnedAtDismiss: earnedCount() })
  }

  async function install(): Promise<void> {
    const event = nativePrompt.value
    if (event === null) return
    nativePrompt.value = null
    await event.prompt()
    const { outcome } = await event.userChoice
    if (outcome === 'accepted') remember({ ...memory.value, installed: true })
    else dismiss()
  }

  return { platform, install, dismiss }
}
