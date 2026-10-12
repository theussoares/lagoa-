import type { ActionLook, ActionRole } from '../types/action'

export const ACTION_ROLES: Record<ActionRole, ActionLook> = {
  primary: { color: 'primary', variant: 'solid', size: 'xl' },
  reward: { color: 'secondary', variant: 'solid', size: 'xl' },
  secondary: { color: 'neutral', variant: 'outline', size: 'lg' },
  quiet: { color: 'neutral', variant: 'ghost', size: 'lg' },
  danger: { color: 'error', variant: 'outline', size: 'lg' },
  dangerConfirm: { color: 'error', variant: 'solid', size: 'lg' },
  inline: { color: 'primary', variant: 'link', size: 'lg' },
}
