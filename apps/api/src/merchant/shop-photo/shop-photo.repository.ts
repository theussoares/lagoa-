import type { ShopPhotoKind } from '#shared/schemas/shop'

/** Caminhos das imagens no bucket; `null` sem a imagem. */
export type ShopPhotoPaths = Readonly<Record<ShopPhotoKind, string | null>>

export abstract class ShopPhotoRepository {
  abstract findPhotoPaths(shopId: string): Promise<ShopPhotoPaths>
  /** Grava o caminho novo da imagem `kind` e devolve os caminhos de agora e o que foi substituído (para apagar o arquivo). */
  abstract replacePhotoPath(shopId: string, kind: ShopPhotoKind, path: string): Promise<{ readonly paths: ShopPhotoPaths; readonly previous: string | null }>
}
