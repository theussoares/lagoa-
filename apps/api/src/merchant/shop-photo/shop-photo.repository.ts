export abstract class ShopPhotoRepository {
  /** Caminho da foto atual no bucket; `null` sem foto. */
  abstract findPhotoPath(shopId: string): Promise<string | null>
  /** Grava o caminho novo e devolve o anterior (para apagar o arquivo antigo). */
  abstract replacePhotoPath(shopId: string, path: string): Promise<string | null>
}
