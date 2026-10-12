import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const WEB_ROOT = fileURLToPath(new URL('../../..', import.meta.url))
const TOKEN_FILE = 'layers/ui/app/assets/css/main.css'

function walk(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    if (name === 'node_modules') return []
    const path = join(directory, name)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
}

const files = ['layers/ui/app', 'layers/customer/app']
  .flatMap((root) => walk(join(WEB_ROOT, root)))
  .map((path) => relative(WEB_ROOT, path))
  .filter((path) => path.endsWith('.vue') || path.endsWith('.css'))

const css = readFileSync(join(WEB_ROOT, TOKEN_FILE), 'utf8')

describe('motion tokens', () => {
  it.each(['--lagoa-dur-enter', '--lagoa-dur-exit', '--lagoa-stagger', '--lagoa-stagger-steps'])('defines %s', (token) => {
    expect(css).toMatch(new RegExp(`${token}:`))
  })

  it('caps the staggered entrance so long lists do not wait', () => {
    expect(css).toMatch(/\.rise\s*\{[^}]*min\(var\(--i, 0\), var\(--lagoa-stagger-steps\)\)/)
    expect(css).toMatch(/\.pop-tilt\s*\{[^}]*min\(var\(--i, 0\), var\(--lagoa-stagger-steps\)\)/)
  })

  it('has no literal millisecond duration outside the tokens', () => {
    const offenders = files.flatMap((path) =>
      readFileSync(join(WEB_ROOT, path), 'utf8')
        .split('\n')
        .filter((line) => /(duration-\[\d+ms\]|transition:[^;]*\d+ms|animation:[^;]*\d+ms|animation-delay:[^;]*\d+ms)/.test(line))
        .map((line) => `${path}: ${line.trim()}`),
    )
    expect(offenders).toEqual([])
  })

  it('guards every animated file with prefers-reduced-motion', () => {
    const unguarded = files.filter((path) => {
      const source = readFileSync(join(WEB_ROOT, path), 'utf8')
      return /(^|\s)animation:|@keyframes/.test(source) && !/prefers-reduced-motion/.test(source)
    })
    expect(unguarded).toEqual([])
  })
})
