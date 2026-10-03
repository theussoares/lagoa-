import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { barbershopSession } from '#layers/core/test/fixtures'
import { resetWorld, restoreClock, typeInto, visibleText } from '#layers/core/test/pageHarness.nuxt'
import ProgramPage from '../app/pages/program.vue'

let wrapper: VueWrapper | undefined

async function mountProgram(): Promise<VueWrapper> {
  wrapper = await mountSuspended(ProgramPage, { attachTo: document.body })
  await vi.waitFor(() => expect(wrapper?.find('form').exists()).toBe(true))
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  resetWorld({ merchant: barbershopSession })
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
  restoreClock()
})

describe('program page: text', () => {
  it('renders the loaded program with every field', async () => {
    const page = await mountProgram()
    expect(visibleText(page)).toMatchSnapshot()
  })

  it('renders the reward title error after saving without a title', async () => {
    const page = await mountProgram()
    const title = page.find('form input[name="rewardTitle"]').element
    if (!(title instanceof HTMLInputElement)) throw new Error('reward title field missing')
    await typeInto(title, '')
    await page.find('form').trigger('submit')
    await flushPromises()
    expect(visibleText(page)).toMatchSnapshot()
  })
})
