export type SettlementOutcome = 'rewarded' | 'rejected' | 'none'

/**
 * Paga a indicação pendente depois da primeira visita do indicado. Quem registra a primeira visita
 * (o uso do QR da visita agora, o Balcão depois) chama isto **depois** de confirmar a transação da visita: o bônus vai
 * para o cartão do indicador em transação própria, então nunca se trava dois cartões de uma vez.
 * Idempotente: repetir não paga duas vezes.
 */
export abstract class ReferralSettlement {
  abstract settlePending(referredId: string, shopId: string, now: Date): Promise<SettlementOutcome>
}
