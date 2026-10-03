import type { LeaveGuardOptions } from '../types/browser'

/** Pergunta antes de sair da página enquanto houver algo a perder (e, se pedido, ao fechar a aba). */
export function useLeaveGuard(options: LeaveGuardOptions): void {
  onBeforeRouteLeave((to) => {
    if (!options.when() || options.allow?.(to) === true) return true
    if (!import.meta.client) return true
    return window.confirm(options.message())
  })

  if (!options.warnOnUnload) return

  function warnBeforeUnload(event: BeforeUnloadEvent): void {
    if (options.when()) event.preventDefault()
  }

  onMounted(() => {
    if (import.meta.client) window.addEventListener('beforeunload', warnBeforeUnload)
  })
  onBeforeUnmount(() => {
    if (import.meta.client) window.removeEventListener('beforeunload', warnBeforeUnload)
  })
}
