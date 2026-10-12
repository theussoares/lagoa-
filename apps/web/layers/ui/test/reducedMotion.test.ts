import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('../app/assets/css/main.css', import.meta.url), 'utf8')

const animatedClasses = [...css.matchAll(/^\.([\w-]+)\s*\{[^}]*\banimation:/gm)].map((match) => match[1])

const reducedMotionCss = [...css.matchAll(/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/g)]
  .map((match) => match[1])
  .join('\n')

describe('reduced motion', () => {
  it('finds the animated utility classes it is guarding', () => {
    expect(animatedClasses).toEqual(expect.arrayContaining(['stamp-press', 'ticket-char', 'rise', 'pop-tilt', 'live-dot', 'slow-pan']))
  })

  it.each(animatedClasses)('turns off .%s under prefers-reduced-motion', (name) => {
    expect(reducedMotionCss).toMatch(new RegExp(`\\.${name}\\b`))
  })
})
