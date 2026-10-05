import { fileURLToPath } from 'node:url'
import { defineVitestProject } from '@nuxt/test-utils/config'
import { defineConfig } from 'vitest/config'

const fromRoot = (path: string): string => fileURLToPath(new URL(path, import.meta.url))

const alias = {
  '#shared': fromRoot('../../shared'),
  '#layers/core': fromRoot('./layers/core'),
  '#layers/customer': fromRoot('./layers/customer'),
  '#layers/merchant': fromRoot('./layers/merchant'),
  '#layers/ui': fromRoot('./layers/ui'),
}

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: 'unit',
          environment: 'node',
          include: ['../../shared/**/*.test.ts', 'layers/*/test/**/*.test.ts', 'server/test/**/*.test.ts'],
          exclude: ['**/node_modules/**', '**/*.nuxt.test.ts'],
        },
      },
      await defineVitestProject({
        test: {
          name: 'nuxt',
          environment: 'nuxt',
          include: ['layers/*/test/**/*.nuxt.test.ts'],
          environmentOptions: {
            nuxt: {
              domEnvironment: 'happy-dom',
              // Sem atraso artificial: a latência do mock só serve para exercitar loading no navegador.
              overrides: { runtimeConfig: { public: { mockLatencyMs: 0 } } },
            },
          },
        },
      }),
    ],
  },
})
