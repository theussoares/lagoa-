import type { WalletActivity } from '#shared/schemas/visit'
import type { InstallInviteContext, InstallInviteMemory } from '../types/installInvite'

/** Dispensas que o convite aceita: a primeira e as duas voltas depois de um novo ganho. */
export const INSTALL_INVITE_MAX_DISMISSALS = 3

export const EMPTY_INSTALL_MEMORY: InstallInviteMemory = { dismissedCount: 0, earnedAtDismiss: 0, installed: false }

/** Mostra o convite só depois do 1º ganho, uma vez, e volta só a cada novo ganho até o limite. */
export function shouldShowInstallInvite(context: InstallInviteContext): boolean {
  const { platform, standalone, earnedCount, memory } = context
  if (platform === null || standalone || memory.installed) return false
  if (earnedCount < 1) return false
  if (memory.dismissedCount === 0) return true
  if (memory.dismissedCount >= INSTALL_INVITE_MAX_DISMISSALS) return false
  return earnedCount > memory.earnedAtDismiss
}

/** Ganhos da pessoa na caderneta: resgate não conta, só o que rendeu carimbo ou ponto. */
export function countEarnings(activities: readonly Pick<WalletActivity, 'kind'>[]): number {
  return activities.filter((activity) => activity.kind === 'visit' || activity.kind === 'amount' || activity.kind === 'checkIn').length
}
