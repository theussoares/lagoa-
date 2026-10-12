export type ActionRole = 'primary' | 'reward' | 'secondary' | 'quiet' | 'danger' | 'dangerConfirm' | 'inline'
export type ActionSurface = 'light' | 'dark'
export type ActionSize = 'lg' | 'xl'

export interface ActionLook {
  readonly color: 'primary' | 'secondary' | 'neutral' | 'error'
  readonly variant: 'solid' | 'outline' | 'ghost' | 'link'
  readonly size: ActionSize
}
