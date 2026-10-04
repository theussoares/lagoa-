import type { Ref } from 'vue'
import type { TransportError } from '#shared/types/errors'

export interface DataExportView {
  readonly pending: Ref<boolean>
  /** `null` = arquivo entregue; senão o código do erro para o aviso. */
  readonly download: () => Promise<TransportError['code'] | null>
}
