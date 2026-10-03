import { fileURLToPath } from 'node:url'
import swc from 'unplugin-swc'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  resolve: { alias: { '#shared': fileURLToPath(new URL('../../shared', import.meta.url)) } },
  test: { include: ['src/**/*.test.ts', 'test/**/*.test.ts'], environment: 'node' },
})
