import { describe, expect, it } from 'vitest'
import { MODULE_METADATA } from '@nestjs/common/constants'
import { AppModule } from './app.module'

describe('AppModule wiring', () => {
  it('registers login attempt protection and OTP channel controllers', () => {
    const rawImports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, AppModule) as readonly unknown[] | undefined
    const imports = rawImports ?? []
    const importedModules = imports.map((item) => {
      if (typeof item === 'function') return item.name
      if (typeof item === 'object' && item !== null && 'module' in item && typeof item.module === 'function') {
        return item.module.name
      }
      return undefined
    })

    expect(importedModules).toContain('LoginAttemptsModule')
    expect(importedModules).toContain('OtpModule')
    expect(importedModules).toContain('AuthModule')
  })
})
