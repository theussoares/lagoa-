// Builds the public office (lagoamais.com.br/equipe) into the landing page's static files:
// one bundle with three.js inside (no CDN, so the page runs under `script-src 'self'`), the models and the page.
import { build } from 'esbuild'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, prune, quantize, resample, weld } from '@gltf-transform/functions'
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
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
  // three.js is MIT: its copyright notice must ship with the bundle.
  legalComments: 'eof',
  outfile: join(OUT, 'office.js'),
})

// Models: quantized (KHR_mesh_quantization, decoded by the GPU, no WebAssembly) and with unused clips removed.
// About 3.4 MB → 1.5 MB per first visit. Textures end up embedded in each .glb.
const KEEP_CLIPS = new Set(['idle', 'walk', 'sit', 'interact-right', 'emote-yes', 'jump'])
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
for (const folder of ['characters', 'furniture']) {
  const from = join(DIR, 'models', folder), to = join(OUT, 'models', folder)
  mkdirSync(to, { recursive: true })
  copyFileSync(join(from, 'License.txt'), join(to, 'License.txt'))
  for (const file of readdirSync(from).filter((f) => f.endsWith('.glb'))) {
    const doc = await io.read(join(from, file))
    for (const clip of doc.getRoot().listAnimations()) if (!KEEP_CLIPS.has(clip.getName())) clip.dispose()
    await doc.transform(dedup(), prune(), weld(), resample(), quantize())
    await io.write(join(to, file), doc)
  }
}

const page = readFileSync(join(DIR, 'index.html'), 'utf8')
  .replace('<html lang="pt-BR">', `<html lang="pt-BR" data-mode="public" data-models="${BASE}models/">`)
  .replace(/<script type="importmap">[\s\S]*?<\/script>\n/, '')
  .replace('<script type="module" src="/js/main.js"></script>', `<script type="module" src="${BASE}office.js"></script>`)
  .replace('<meta charset="utf-8" />', `<meta charset="utf-8" />\n<meta http-equiv="Content-Security-Policy" content="script-src 'self'">\n<meta name="description" content="A equipe de agentes do Lagoa+ trabalhando num escritório 3D.">`)
writeFileSync(join(OUT, 'index.html'), page)
console.log(`office built into ${OUT}`)
