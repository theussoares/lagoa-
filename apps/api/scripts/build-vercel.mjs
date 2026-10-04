// Build da função da Vercel: swc em ESM e extensão `.mjs`. A extensão (e não um `package.json` com
// "type": "module" dentro do dist) é o que garante que o Node trate o código como ESM em produção.
import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const apiDir = resolve(import.meta.dirname, '..')
const root = resolve(apiDir, '../..')
const dist = join(apiDir, 'dist')

rmSync(dist, { recursive: true, force: true })
execFileSync(
  join(apiDir, 'node_modules/.bin/swc'),
  ['apps/api/src', 'shared', '--config-file', 'apps/api/.swcrc.vercel', '-d', 'apps/api/dist', '--ignore', '**/*.test.ts', '--no-swcrc'],
  { cwd: root, stdio: 'inherit' },
)

const RELATIVE_JS_SPECIFIER = /(from\s*|import\s*\(\s*)(["'])(\.{1,2}\/[^"']*)\.js\2/g

function* files(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) yield* files(path)
    else yield path
  }
}

for (const file of files(dist)) {
  if (file.endsWith('.js')) {
    const code = readFileSync(file, 'utf8').replace(RELATIVE_JS_SPECIFIER, '$1$2$3.mjs$2').replace(/\.js\.map$/gm, '.mjs.map')
    writeFileSync(file.replace(/\.js$/, '.mjs'), code)
    rmSync(file)
  } else if (file.endsWith('.js.map')) {
    renameSync(file, file.replace(/\.js\.map$/, '.mjs.map'))
  }
}
