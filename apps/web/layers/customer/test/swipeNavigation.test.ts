import { describe, expect, it } from 'vitest'
import { swipeTarget } from '../app/utils/swipeNavigation'

const TABS = ['/carteira', '/descobrir', '/premios', '/perfil']
const swipe = (dx: number, dy = 0, durationMs = 200) => ({ dx, dy, durationMs })

describe('swipeTarget', () => {
  it('goes to the next tab swiping left and to the previous swiping right', () => {
    expect(swipeTarget(TABS, '/descobrir', swipe(-120))).toBe('/premios')
    expect(swipeTarget(TABS, '/descobrir', swipe(120))).toBe('/carteira')
  })

  it('stays put at the first and last tab', () => {
    expect(swipeTarget(TABS, '/carteira', swipe(120))).toBeNull()
    expect(swipeTarget(TABS, '/perfil', swipe(-120))).toBeNull()
  })

  it('works from a page inside a tab', () => {
    expect(swipeTarget(TABS, '/premios/card_1', swipe(-120))).toBe('/perfil')
  })

  it('ignores short, slow or mostly vertical gestures', () => {
    expect(swipeTarget(TABS, '/descobrir', swipe(-40))).toBeNull()
    expect(swipeTarget(TABS, '/descobrir', swipe(-120, 0, 900))).toBeNull()
    expect(swipeTarget(TABS, '/descobrir', swipe(-120, 110))).toBeNull()
  })

  it('does nothing outside the tabs (check-in, sign-in)', () => {
    expect(swipeTarget(TABS, '/check-in', swipe(-120))).toBeNull()
  })
})
