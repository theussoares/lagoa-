import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { MERCHANT_SURFACE } from './merchant-surface.decorator'

const MERCHANT_ROOT = join(__dirname, '..')

function controllerFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return controllerFiles(path)
    return entry.name.endsWith('.controller.ts') ? [path] : []
  })
}

/** Controller novo sem `@MerchantSurface()` nasceria sem checar a loja do dono: aqui ele quebra o teste. */
describe('merchant controllers', () => {
  const files = controllerFiles(MERCHANT_ROOT)

  it('finds the panel controllers', () => {
    expect(files.length).toBeGreaterThanOrEqual(8)
  })

  it.each(files.map((file) => [file.slice(MERCHANT_ROOT.length + 1), file] as const))('%s declares @MerchantSurface()', async (_name, file) => {
    const module = (await import(file)) as Record<string, unknown>
    const controllers = Object.values(module).filter((value): value is new () => unknown => typeof value === 'function')
    expect(controllers.length).toBeGreaterThan(0)
    for (const controller of controllers) {
      expect(Reflect.getMetadata(MERCHANT_SURFACE, controller), controller.name).toBeDefined()
    }
  })
})
