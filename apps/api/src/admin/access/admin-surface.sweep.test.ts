import { Controller, Module, type Type } from '@nestjs/common'
import { describe, expect, it } from 'vitest'
import { AdminModule } from '../admin.module'
import { ADMIN_SURFACE, AdminSurface } from './admin-surface.decorator'

const isClass = (value: unknown): value is Type<unknown> => typeof value === 'function'

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

@AdminSurface()
@Controller('fixture/guarded')
class GuardedFixtureController {}

@Controller('fixture/forgotten')
class ForgottenFixtureController {}

@Module({ controllers: [ForgottenFixtureController] })
class NestedFixtureModule {}

@Module({ imports: [{ module: NestedFixtureModule }], controllers: [GuardedFixtureController] })
class FixtureModule {}

/** Controller novo de admin sem `@AdminSurface()` nasceria sem o AdminGuard (e o guard global o fecharia ao admin): aqui ele quebra o teste. */
describe('admin controllers', () => {
  it('walks nested and dynamic imports, so a forgotten controller cannot hide in a submodule', () => {
    const found = controllersOf(FixtureModule)
    expect(found).toEqual([GuardedFixtureController, ForgottenFixtureController])
    expect(found.filter((controller) => Reflect.getMetadata(ADMIN_SURFACE, controller) === undefined)).toEqual([ForgottenFixtureController])
  })

  it('every controller of the AdminModule declares @AdminSurface()', () => {
    const unguarded = controllersOf(AdminModule).filter((controller) => Reflect.getMetadata(ADMIN_SURFACE, controller) === undefined)
    expect(unguarded.map((controller) => controller.name)).toEqual([])
  })
})
