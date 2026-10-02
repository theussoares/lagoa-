export type InkNoteTone = 'ink' | 'warning' | 'error' | 'success' | 'pencil'

export interface InkNoteAction {
  readonly label: string
  readonly to?: string
  readonly onClick?: () => void | Promise<void>
}
