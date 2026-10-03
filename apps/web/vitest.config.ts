import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const fromRoot = (path: string): string => fileURLToPath(new URL(path, import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '#shared': fromRoot('../../shared'),
      '#layers/core': fromRoot('./layers/core'),
      '#layers/customer': fromRoot('./layers/customer'),
      '#layers/merchant': fromRoot('./layers/merchant'),
      '#layers/ui': fromRoot('./layers/ui'),
    },
  },
  test: {
    include: ['../../shared/**/*.test.ts', 'layers/*/test/**/*.test.ts'],
  },
})
