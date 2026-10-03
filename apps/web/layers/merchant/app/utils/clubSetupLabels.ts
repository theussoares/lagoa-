export interface SetupStepItem {
  readonly key: string
  readonly label: string
  readonly state: 'done' | 'current' | 'next'
}

export interface ShopFieldsLabels {
  readonly name: string
  readonly namePlaceholder: string
  readonly nameError: string
  readonly category: string
  readonly categoryPlaceholder: string
  readonly categoryError: string
  readonly neighborhood: string
  readonly neighborhoodError: string
  readonly addressLine: string
  readonly addressHint: string
  readonly addressError: string
}

export interface ShopFieldLimits {
  readonly name: number
  readonly neighborhood: number
  readonly addressLine: number
}

export interface PosterStepLabels {
  readonly title: string
  readonly lead: string
  readonly pendingTitle: string
  readonly pendingDescription: string
  readonly approveForTesting: string
  readonly approved: string
  readonly print: string
  readonly goToPanel: string
  readonly loading: string
  readonly loadError: string
  readonly retry: string
}
