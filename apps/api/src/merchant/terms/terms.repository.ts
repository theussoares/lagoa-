export abstract class MerchantTermsRepository {
  /** Grava a versão aceita (idempotente: o instante do primeiro aceite da versão é mantido). `false` sem loja. */
  abstract accept(ownerUserId: string, version: string, now: Date): Promise<boolean>
}
