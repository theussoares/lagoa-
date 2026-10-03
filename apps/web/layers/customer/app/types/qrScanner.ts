import type { Ref } from 'vue'

export type QrScannerStatus = 'off' | 'starting' | 'scanning' | 'denied' | 'unavailable'

export interface QrScannerControl {
  status: Readonly<Ref<QrScannerStatus>>
  start: (video: HTMLVideoElement) => Promise<void>
  stop: () => void
}
