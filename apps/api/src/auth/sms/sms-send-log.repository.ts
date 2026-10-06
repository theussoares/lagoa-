export abstract class SmsSendLog {
  /**
   * Grava o envio só se o celular ainda não passou de `max` desde `windowStart`; `false` = limite atingido.
   * Envios fora da janela já podem ser apagados.
   */
  abstract tryRecord(phoneHash: Buffer, now: Date, windowStart: Date, max: number): Promise<boolean>
}
