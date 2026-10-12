import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const messages: unknown = JSON.parse(readFileSync(fileURLToPath(new URL('../i18n/locales/pt-BR.json', import.meta.url)), 'utf8'))

function pick(path: string): unknown {
  return path.split('.').reduce<unknown>((node, key) => (typeof node === 'object' && node !== null ? (node as Record<string, unknown>)[key] : undefined), messages)
}

function values(node: unknown): string[] {
  if (typeof node === 'string') return [node]
  if (typeof node === 'object' && node !== null) return Object.values(node).flatMap(values)
  return []
}

const EXPECTED: Record<string, string> = {
  'discover.openWallet': 'Ver carteira',
  'checkIn.toWallet': 'Ver carteira',
  'checkIn.joined.toWallet': 'Ver carteira',
  'redemption.backToWallet': 'Voltar para a carteira',
  'redemption.back': 'Voltar para a carteira',
  'wallet.redeem': 'Resgatar prêmio',
  'checkIn.earned.redeem': 'Resgatar prêmio',
  'rewards.redeem': 'Resgatar prêmio',
  'profile.birthday.remove': 'Tirar aniversário',
  'profile.birthday.removeConfirm': 'Tirar aniversário',
  'profile.birthday.removeCancel': 'Manter a data',
  'profile.eraseButton': 'Apagar minha conta',
  'profile.eraseConfirm': 'Apagar minha conta',
  'profile.eraseCancel': 'Manter minha conta',
  'checkIn.typeVisitCode': 'Digitar o código da visita',
  'checkIn.typeShopCode': 'Digitar o código do cartaz da loja',
}

const RETIRED = [
  'Ver na carteira',
  'Abrir a carteira',
  'Mostrar código no balcão',
  'Tirar a data',
  'Manter',
  'Sim, apagar tudo',
  'Tenho o código da visita',
  'Tenho o código do cartaz da loja',
]

describe('label glossary', () => {
  it.each(Object.entries(EXPECTED))('%s reads "%s"', (key, label) => {
    expect(pick(key)).toBe(label)
  })

  it('does not bring retired labels back', () => {
    const all = values(messages)
    expect(RETIRED.filter((label) => all.includes(label))).toEqual([])
  })
})
