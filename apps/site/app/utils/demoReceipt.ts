import type { CounterDemoReceiptModel } from '../types/counterDemo'
import { sampleSlots } from './sampleSlots'

type Translate = (key: string, params?: Record<string, unknown>) => string

const TOTAL_SLOTS = 10
const REWARD_FRESH_DELAY_MS = 350
const STAMP_TILT = -6
const MAX_AMOUNT_DIGITS = 5

/** Só dígitos, no máximo 5: o campo de valor da demonstração. */
export function sanitizeAmount(value: string | number): string {
  return String(value).replace(/\D/g, '').slice(0, MAX_AMOUNT_DIGITS)
}

export const EXAMPLE_POINTS_PER_REAL = 2
const EXAMPLE_POINTS_BEFORE = 100
const EXAMPLE_POINTS_TARGET = 300

export function stampReceipt(t: Translate): CounterDemoReceiptModel {
  return {
    tone: 'reward',
    tilt: STAMP_TILT,
    title: t('counter.demo.stampTitle'),
    detail: t('counter.demo.stampDetail'),
    body: { kind: 'slots', slots: sampleSlots(TOTAL_SLOTS, TOTAL_SLOTS, REWARD_FRESH_DELAY_MS) },
  }
}

export function valueReceipt(reais: number, t: Translate): CounterDemoReceiptModel {
  const points = reais * EXAMPLE_POINTS_PER_REAL
  const balance = Math.min(EXAMPLE_POINTS_BEFORE + points, EXAMPLE_POINTS_TARGET)
  const params = { points, amount: reais, rate: EXAMPLE_POINTS_PER_REAL, balance, target: EXAMPLE_POINTS_TARGET }
  return {
    tone: balance >= EXAMPLE_POINTS_TARGET ? 'reward' : 'ink',
    tilt: STAMP_TILT,
    title: t('counter.demo.valueTitle', params),
    detail: t('counter.demo.valueDetail', params),
    body: { kind: 'ruler', balance, target: EXAMPLE_POINTS_TARGET, label: t('counter.demo.valueRuler', params) },
  }
}
