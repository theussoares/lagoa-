import { describe, expect, it } from 'vitest'
import { AppModule } from './app.module'
import { MODULE_METADATA } from '@nestjs/common/constants'

describe('AppModule wiring', () => {
  it('registers login attempt protection and OTP channel controllers', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const imports: any[] = Reflect.getMetadata(MODULE_METADATA.IMPORTS, AppModule) ?? []
    const importedModules = imports.map((item) => (typeof item === 'function' ? item.name : item?.module?.name))

    expect(importedModules).toContain('LoginAttemptsModule')
    expect(importedModules).toContain('OtpModule')
    expect(importedModules).toContain('AuthModule')
  })
})
