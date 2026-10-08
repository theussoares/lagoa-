import type { ErrorOf, TransportError } from '#shared/types/errors'
import type { Result } from '#shared/types/result'

export type PosterReprintError = ErrorOf<'unauthorized'> | TransportError

/** Aviso do Início "imprima o cartaz novo": vale até o lojista imprimir o cartaz que só entra no clube. */
export interface PosterReprintService {
  /** `true` enquanto a loja não imprimiu o cartaz novo. */
  isPending(): Promise<Result<boolean, PosterReprintError>>
  /** Marca o cartaz novo como impresso; devolve a situação nova (`false`). */
  markPrinted(): Promise<Result<boolean, PosterReprintError>>
}
