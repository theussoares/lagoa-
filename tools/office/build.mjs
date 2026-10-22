// Builds the public office (lagoamais.com.br/equipe) into the landing page's static files:
// one bundle with three.js inside (no CDN, so the page runs under `script-src 'self'`), the models and the page.
import { build } from 'esbuild'
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = dirname(fileURLToPath(import.meta.url))
const BASE = '/equipe/'
const OUT = join(DIR, '../../apps/site/public/equipe')

rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })

await build({
  entryPoints: [join(DIR, 'js/main.js')],
  bundle: true,
  format: 'esm',
  target: 'es2022',
  minify: true,
  legalComments: 'none',
  outfile: join(OUT, 'office.js'),
})

cpSync(join(DIR, 'models'), join(OUT, 'models'), { recursive: true })

const page = readFileSync(join(DIR, 'index.html'), 'utf8')
  .replace('<html lang="pt-BR">', `<html lang="pt-BR" data-mode="public" data-models="${BASE}models/">`)
  .replace(/<script type="importmap">[\s\S]*?<\/script>\n/, '')
  .replace('<script type="module" src="/js/main.js"></script>', `<script type="module" src="${BASE}office.js"></script>`)
  .replace('<meta charset="utf-8" />', `<meta charset="utf-8" />\n<meta http-equiv="Content-Security-Policy" content="script-src 'self'">\n<meta name="description" content="A equipe de agentes do Lagoa+ trabalhando num escritório 3D.">`)
writeFileSync(join(OUT, 'index.html'), page)
console.log(`office built into ${OUT}`)
