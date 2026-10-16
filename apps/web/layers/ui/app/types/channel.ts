export interface OtpChannelPickerOption<T extends string = string> {
  readonly value: T
  readonly label: string
  readonly icon?: string
}

export interface OtpChannelPickerProps<T extends string = string> {
  readonly legend: string
  readonly options: readonly OtpChannelPickerOption<T>[]
  readonly disabled?: boolean
}
