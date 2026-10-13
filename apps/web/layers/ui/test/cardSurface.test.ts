import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const WEB_ROOT = fileURLToPath(new URL('../../..', import.meta.url))
const css = readFileSync(join(WEB_ROOT, 'layers/ui/app/assets/css/main.css'), 'utf8')

function walk(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    if (name === 'node_modules') return []
    const path = join(directory, name)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
}

const vueFiles = ['layers/ui/app', 'layers/customer/app']
  .flatMap((root) => walk(join(WEB_ROOT, root)))
  .filter((path) => path.endsWith('.vue'))
  .map((path) => relative(WEB_ROOT, path))

describe('card surface', () => {
  it.each(['card', 'card-tap', 'card-raised'])('defines the %s utility', (name) => {
    expect(css).toMatch(new RegExp(`@utility ${name}\\s*\\{`))
  })

  it('defines the raised shadow in the light and dark themes', () => {
    expect(css.match(/--lagoa-shadow-raised:/g)).toHaveLength(2)
  })

  it('does not repeat the card recipe by hand', () => {
    const offenders = vueFiles.filter((path) => {
      const source = readFileSync(join(WEB_ROOT, path), 'utf8')
      return source.split('\n').some((line) => line.includes('rounded-(--radius-card)') && line.includes('bg-default') && line.includes('shadow-(--lagoa-shadow-card)'))
    })
    expect(offenders).toEqual([])
  })
})
