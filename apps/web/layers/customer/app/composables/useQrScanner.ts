import type QrScanner from 'qr-scanner'

/** A cada quanto a câmera tenta ler; mais que isso só gasta bateria. */
const MAX_SCANS_PER_SECOND = 8

export type QrScannerStatus = 'off' | 'starting' | 'scanning' | 'denied' | 'unavailable'

export interface QrScannerControl {
  status: Readonly<Ref<QrScannerStatus>>
  start: (video: HTMLVideoElement) => Promise<void>
  stop: () => void
}

function isPermissionError(error: unknown): boolean {
  return error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'SecurityError')
}

/**
 * Câmera traseira lendo QR. A biblioteca só é baixada quando a câmera abre e
 * usa o leitor nativo do navegador quando existe. Lido um QR, a câmera desliga:
 * quem decide o que fazer depois é a tela.
 */
export function useQrScanner(onDecode: (content: string) => void): QrScannerControl {
  const status = ref<QrScannerStatus>('off')
  let scanner: QrScanner | undefined
  // Cada start/stop invalida o anterior: a câmera pode responder depois de a tela mudar.
  let generation = 0

  function release(): void {
    scanner?.destroy()
    scanner = undefined
  }

  function stop(): void {
    generation += 1
    release()
    status.value = 'off'
  }

  async function start(video: HTMLVideoElement): Promise<void> {
    stop()
    const current = generation
    status.value = 'starting'
    // Sem HTTPS (ou em navegador antigo) não existe câmera para a página.
    if (navigator.mediaDevices?.getUserMedia === undefined) {
      status.value = 'unavailable'
      return
    }
    // Sem rede para baixar o leitor, o caminho é o mesmo de quem não tem câmera: digitar.
    const loaded = await import('qr-scanner').catch(() => null)
    if (current !== generation) return
    if (loaded === null) {
      status.value = 'unavailable'
      return
    }
    scanner = new loaded.default(
      video,
      (result) => {
        stop()
        onDecode(result.data)
      },
      { returnDetailedScanResult: true, preferredCamera: 'environment', maxScansPerSecond: MAX_SCANS_PER_SECOND },
    )
    try {
      await scanner.start()
      if (current === generation) status.value = 'scanning'
    } catch (error) {
      if (current !== generation) return
      release()
      status.value = isPermissionError(error) ? 'denied' : 'unavailable'
    }
  }

  onScopeDispose(stop)

  return { status, start, stop }
}
