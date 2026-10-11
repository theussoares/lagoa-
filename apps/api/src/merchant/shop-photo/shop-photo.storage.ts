/** Onde mora o arquivo da foto (bucket público `shop-assets`); a URL pública sai de `shopAssetUrl`. */
export abstract class ShopPhotoStorage {
  /** `true` quando o arquivo foi gravado. */
  abstract upload(path: string, bytes: Buffer, contentType: string): Promise<boolean>
  /** Melhor esforço: a foto antiga que sobrar não aparece em lugar nenhum. */
  abstract remove(path: string): Promise<void>
}
