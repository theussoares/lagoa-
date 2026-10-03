import { fileURLToPath } from 'node:url'

const fromLayer = (path: string): string => fileURLToPath(new URL(path, import.meta.url))

export default defineNuxtConfig({
  modules: ['@nuxt/ui'],
  css: [fromLayer('./app/assets/css/main.css')],
  ui: {
    // Archivo é self-hosted via @fontsource-variable (main.css); nada de provedor externo.
    fonts: false,
    theme: {
      colors: ['primary', 'secondary', 'success', 'info', 'warning', 'error'],
    },
  },
  // Abre no claro; o escuro é escolha da pessoa (Perfil / Configurações), não do sistema.
  colorMode: {
    preference: 'light',
    fallback: 'light',
  },
  icon: {
    // Só Phosphor, servido do pacote local (@iconify-json/ph).
    serverBundle: { collections: ['ph'] },
    clientBundle: { scan: true },
  },
})
