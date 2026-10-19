import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { Controller, Get, Module, type Type } from '@nestjs/common'
import { PATH_METADATA } from '@nestjs/common/constants'
import { describe, expect, it } from 'vitest'
import { IS_PUBLIC } from '../../auth/public.decorator'
import { AdminModule } from '../admin.module'
import { ADMIN_SURFACE, AdminSurface, isAdminPath } from './admin-surface.decorator'

const SRC_ROOT = join(__dirname, '..', '..')
const ADMIN_ROOT = join(__dirname, '..')

const isClass = (value: unknown): value is Type<unknown> => typeof value === 'function'
const isController = (value: unknown): value is Type<unknown> => isClass(value) && Reflect.getMetadata(PATH_METADATA, value) !== undefined
const hasAdminSurface = (controller: Type<unknown>): boolean => Reflect.getMetadata(ADMIN_SURFACE, controller) === true
const underAdminPath = (controller: Type<unknown>): boolean => isAdminPath(Reflect.getMetadata(PATH_METADATA, controller))

/** Todos os controllers de um módulo e dos que ele importa (estáticos ou `{ module }` dinâmicos). */
function controllersOf(root: Type<unknown>, seen = new Set<unknown>()): Type<unknown>[] {
  if (seen.has(root)) return []
  seen.add(root)
  const own: Type<unknown>[] = Reflect.getMetadata('controllers', root) ?? []
  const imports: unknown[] = Reflect.getMetadata('imports', root) ?? []
  const children = imports.flatMap((entry) => {
    const module = typeof entry === 'object' && entry !== null && 'module' in entry ? entry.module : entry
    return isClass(module) ? controllersOf(module, seen) : []
  })
  return [...own, ...children]
}

function controllerFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return controllerFiles(path)
    return entry.name.endsWith('.controller.ts') ? [path] : []
  })
}

async function controllersInFiles(files: readonly string[]): Promise<Type<unknown>[]> {
  const modules = await Promise.all(files.map(async (file) => (await import(file)) as Record<string, unknown>))
  return modules.flatMap((module) => Object.values(module).filter(isController))
}

/** Rota `@Public()` não lê o JWT: no painel da rede ela pularia o papel e o MFA. */
function isPublicAnywhere(controller: Type<unknown>): boolean {
  if (Reflect.getMetadata(IS_PUBLIC, controller) === true) return true
  const prototype: object = controller.prototype
  return Object.getOwnPropertyNames(prototype).some((name) => {
    const handler: unknown = Reflect.get(prototype, name)
    return typeof handler === 'function' && Reflect.getMetadata(IS_PUBLIC, handler) === true
  })
}

/** Controller com caminho e marca desencontrados: um lado sem o AdminGuard, o outro fechado para quem devia usar. */
const mismatched = (controllers: readonly Type<unknown>[]): string[] =>
  controllers.filter((controller) => underAdminPath(controller) !== hasAdminSurface(controller)).map((controller) => controller.name)

@AdminSurface()
@Controller('fixture/guarded')
class GuardedFixtureController {}

@Controller('fixture/forgotten')
class ForgottenFixtureController {
  @Get()
  open(): void {}
}

@Module({ controllers: [ForgottenFixtureController] })
class NestedFixtureModule {}

@Module({ imports: [{ module: NestedFixtureModule }], controllers: [GuardedFixtureController] })
class FixtureModule {}

describe('admin controllers', () => {
  it('walks nested and dynamic imports, so a forgotten controller cannot hide in a submodule', () => {
    const found = controllersOf(FixtureModule)
    expect(found).toEqual([GuardedFixtureController, ForgottenFixtureController])
    expect(found.filter((controller) => !hasAdminSurface(controller))).toEqual([ForgottenFixtureController])
  })

  it('reads admin paths with or without a leading slash, and only the first segment', () => {
    expect([isAdminPath('admin'), isAdminPath('/admin/shops'), isAdminPath(['x', 'admin/y'])]).toEqual([true, true, true])
    expect([isAdminPath('administrator'), isAdminPath('merchant/admin'), isAdminPath(undefined)]).toEqual([false, false, false])
  })

  it('every controller of the AdminModule declares @AdminSurface() under an admin path, with no public route', () => {
    const controllers = controllersOf(AdminModule)
    expect(controllers.filter((controller) => !hasAdminSurface(controller)).map((controller) => controller.name)).toEqual([])
    expect(mismatched(controllers)).toEqual([])
    expect(controllers.filter(isPublicAnywhere).map((controller) => controller.name)).toEqual([])
  })

  it('every controller file under src/admin declares @AdminSurface() under an admin path, with no public route', async () => {
    const controllers = await controllersInFiles(controllerFiles(ADMIN_ROOT))
    expect(controllers.filter((controller) => !hasAdminSurface(controller)).map((controller) => controller.name)).toEqual([])
    expect(controllers.filter(isPublicAnywhere).map((controller) => controller.name)).toEqual([])
  })

  it('no controller anywhere in src has an admin path without @AdminSurface(), or the other way round', async () => {
    const controllers = await controllersInFiles(controllerFiles(SRC_ROOT))
    expect(controllers.length).toBeGreaterThanOrEqual(20)
    expect(mismatched(controllers)).toEqual([])
  })

  it('flags a public handler on a fixture', () => {
    expect(isPublicAnywhere(ForgottenFixtureController)).toBe(false)
    Reflect.defineMetadata(IS_PUBLIC, true, ForgottenFixtureController.prototype.open)
    expect(isPublicAnywhere(ForgottenFixtureController)).toBe(true)
  })
})
