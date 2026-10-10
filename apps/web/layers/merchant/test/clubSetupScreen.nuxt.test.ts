import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { computed, ref } from 'vue'
import type { Ref } from 'vue'
import { useNuxtApp } from '#imports'
import { EXAMPLE_IDS } from '#layers/core/app/mock'
import { mountComposable } from '#layers/core/test/composableHarness.nuxt'
import { resetWorld, restoreClock } from '#layers/core/test/pageHarness.nuxt'
import type { LeaveGuardOptions } from '#layers/core/app/types/browser'
import type { ProgramDraft } from '#shared/schemas/program'
import { useMerchantServices } from '../app/composables/useMerchantServices'
import { useClubSetupScreen } from '../app/composables/useClubSetupScreen'
import { useProgramFieldOptions } from '../app/composables/useProgramFieldOptions'
import { useClubSetupStore } from '../app/stores/clubSetup'
import { useMerchantSessionStore } from '../app/stores/merchantSession'
import { emptyClubSetupForm } from '../app/utils/clubSetupForm'

const { approveMock, printMock, leaveGuard } = vi.hoisted(() => ({
  approveMock: vi.fn(),
  printMock: vi.fn(),
  leaveGuard: { options: undefined as LeaveGuardOptions | undefined },
}))

mockNuxtImport('useShopStatus', () => () => ({ status: { value: 'pending' }, refresh: vi.fn(), approveForTesting: approveMock }))
mockNuxtImport('usePrint', () => () => ({ print: printMock }))
mockNuxtImport('useLeaveGuard', () => (options: LeaveGuardOptions) => {
  leaveGuard.options = options
})

function t(key: string, named?: Record<string, unknown>, plural?: number): string {
  return useNuxtApp().$i18n.t(key, named ?? {}, plural ?? 1)
}

/** Celular confirmado sem loja: o login do mock devolve o ticket do cadastro. */
async function beginSignUp(): Promise<void> {
  const { $merchantAuth, $mockBackend } = useNuxtApp()
  const phone = EXAMPLE_IDS.phones.lucas
  await $merchantAuth.requestLoginCode(phone)
  const result = await $merchantAuth.signInMerchant(phone, $mockBackend.loginCode)
  if (!result.ok || result.value.kind !== 'signUp') throw new Error('expected a sign-up ticket')
  useMerchantSessionStore().startWithoutShop()
}

function fillShop(): void {
  const { shop } = useClubSetupStore().form
  shop.name = '  Lava-jato Brilho  '
  shop.category = 'other'
  shop.neighborhood = 'Centro'
  shop.addressLine = 'Rua de exemplo, 100'
}

function fillReward(): void {
  useClubSetupStore().form.program.reward.title = 'Lavagem simples grátis'
}

function addToBody(html: string): HTMLElement {
  const holder = document.createElement('div')
  holder.innerHTML = html
  document.body.append(holder)
  return holder
}

beforeEach(async () => {
  resetWorld()
  useClubSetupStore().finish()
  await beginSignUp()
  approveMock.mockReset()
  printMock.mockReset()
  leaveGuard.options = undefined
})

afterEach(() => {
  document.body.innerHTML = ''
  restoreClock()
})

describe('useClubSetupScreen: steps', () => {
  it('starts on the shop step with the four steps laid out and nothing loaded', async () => {
    const { result } = await mountComposable(useClubSetupScreen)
    expect(result.step).toBe('shop')
    expect(result.steps).toEqual([
      { key: 'shop', state: 'current' },
      { key: 'rules', state: 'next' },
      { key: 'reward', state: 'next' },
      { key: 'poster', state: 'next' },
    ])
    expect(result.creating).toBe(false)
    expect(result.submitError).toBeNull()
    expect(result.posterStatus).toBe('loading')
    expect(result.poster).toBeNull()
    expect(result.isPending).toBe(false)
    expect(result.canApprove).toBe(true)
  })

  it('trims the shop name and uses it in the preview, falling back while it is empty', async () => {
    const { result } = await mountComposable(useClubSetupScreen)
    expect(result.shopName).toBe('')
    expect(result.preview.card.shopName).toBe(t('clubSetup.preview.shopFallback'))
    fillShop()
    expect(result.shopName).toBe('Lava-jato Brilho')
    expect(result.preview.card.shopName).toBe('Lava-jato Brilho')
  })

  it('stays on the step and shows field errors only after trying to continue', async () => {
    const { result } = await mountComposable(useClubSetupScreen)
    expect(result.shopErrors).toEqual({})
    await result.submitStep()
    expect(result.step).toBe('shop')
    expect(result.shopErrors).toMatchObject({ name: true, category: true })
  })

  it('focuses the first invalid field when continuing does not advance', async () => {
    addToBody('<form><input aria-invalid="false" id="ok"><input aria-invalid="true" id="bad"></form>')
    const { result } = await mountComposable(useClubSetupScreen)
    await result.submitStep()
    expect(document.activeElement?.id).toBe('bad')
  })

  it('advances one step at a time and marks the finished steps as done', async () => {
    const { result } = await mountComposable(useClubSetupScreen)
    fillShop()
    await result.submitStep()
    expect(result.step).toBe('rules')
    expect(result.steps.map((item) => item.state)).toEqual(['done', 'current', 'next', 'next'])
    await result.submitStep()
    expect(result.step).toBe('reward')
    expect(result.steps.map((item) => item.state)).toEqual(['done', 'done', 'current', 'next'])
  })

  it('moves the focus to the title of the new step', async () => {
    addToBody('<h1 tabindex="-1" id="title">Título</h1>')
    const { result } = await mountComposable(useClubSetupScreen)
    fillShop()
    await result.submitStep()
    await vi.waitFor(() => expect(document.activeElement?.id).toBe('title'))
  })

  it('goes back keeping what was typed', async () => {
    const { result } = await mountComposable(useClubSetupScreen)
    fillShop()
    await result.submitStep()
    result.back()
    expect(result.step).toBe('shop')
    expect(result.form.shop.neighborhood).toBe('Centro')
  })

  it('switches the program mode and the unit that the options expose', async () => {
    const { result } = await mountComposable(useClubSetupScreen)
    expect(result.fieldOptions.unit).toBe('stamp')
    result.setMode('pointsPerCurrency')
    expect(result.form.program.rules.mode).toBe('pointsPerCurrency')
    expect(result.fieldOptions.unit).toBe('point')
    expect(result.preview.earnLine).toBeTruthy()
  })
})

describe('useClubSetupScreen: creating the club', () => {
  async function reachRewardStep(): Promise<Awaited<ReturnType<typeof mountComposable<ReturnType<typeof useClubSetupScreen>>>>> {
    const mounted = await mountComposable(useClubSetupScreen)
    fillShop()
    await mounted.result.submitStep()
    await mounted.result.submitStep()
    return mounted
  }

  it('does not create the club without a reward and goes back to the field that needs it', async () => {
    const { result } = await reachRewardStep()
    await result.submitStep()
    expect(result.step).toBe('reward')
    expect(result.programErrors).toMatchObject({ rewardTitle: true })
    expect(result.creating).toBe(false)
  })

  it('reports an expired sign-up when the server no longer knows the confirmed phone', async () => {
    const { result } = await reachRewardStep()
    await useNuxtApp().$mockBackend.run((ctx) => {
      ctx.state.signUpTickets = []
    })
    fillShop()
    fillReward()
    await result.submitStep()
    expect(result.submitError).toBe('signUpExpired')
    expect(result.step).toBe('reward')
  })

  it('creates the club, shows the poster of a shop awaiting approval and stops guarding the exit', async () => {
    const { result } = await reachRewardStep()
    fillReward()
    const pending = result.submitStep()
    await vi.waitFor(() => expect(result.creating).toBe(true))
    await pending
    await flushPromises()
    expect(result.step).toBe('poster')
    expect(result.creating).toBe(false)
    expect(result.posterStatus).toBe('success')
    expect(result.poster?.shopName).toBe('Lava-jato Brilho')
    expect(result.isPending).toBe(true)
    expect(result.steps.map((item) => item.state)).toEqual(['done', 'done', 'done', 'current'])
    expect(leaveGuard.options?.when()).toBe(false)
  })

  it('reloads the poster after approving for testing, and only then', async () => {
    const { result } = await reachRewardStep()
    fillReward()
    await result.submitStep()
    await flushPromises()
    const getPoster = vi.spyOn(useMerchantServices().poster, 'getPoster')
    approveMock.mockResolvedValueOnce(false)
    await result.approve()
    expect(approveMock).toHaveBeenCalledTimes(1)
    expect(getPoster).not.toHaveBeenCalled()
    approveMock.mockResolvedValueOnce(true)
    await result.approve()
    await flushPromises()
    expect(approveMock).toHaveBeenCalledTimes(2)
    expect(getPoster).toHaveBeenCalledTimes(1)
    expect(result.posterStatus).toBe('success')
  })

  it('prints through the print composable', async () => {
    const { result } = await mountComposable(useClubSetupScreen)
    result.print()
    expect(printMock).toHaveBeenCalledTimes(1)
  })
})

describe('useClubSetupScreen: leaving the page', () => {
  it('asks before leaving while the club is not created, except to go back to the sign-in', async () => {
    await mountComposable(useClubSetupScreen)
    const options = leaveGuard.options
    if (!options) throw new Error('leave guard not registered')
    expect(options.when()).toBe(true)
    expect(options.warnOnUnload).toBe(true)
    expect(options.message()).toBe(t('clubSetup.leaveConfirm'))
    const to = (path: string): Parameters<NonNullable<LeaveGuardOptions['allow']>>[0] => ({ path }) as Parameters<NonNullable<LeaveGuardOptions['allow']>>[0]
    expect(options.allow?.(to('/balcao/entrar'))).toBe(true)
    expect(options.allow?.(to('/painel'))).toBe(false)
  })
})

describe('useProgramFieldOptions', () => {
  function draftWith(change: (draft: ProgramDraft) => void): Ref<ProgramDraft | null> {
    const draft = emptyClubSetupForm().program
    change(draft)
    return ref(draft)
  }

  it('has stamp defaults and no summaries while the draft is not loaded', async () => {
    const { result } = await mountComposable(() => useProgramFieldOptions(ref(null)))
    expect(result.value.unit).toBe('stamp')
    expect(result.value.summaries).toBeNull()
    expect(result.value.limits.target.min).toBeLessThanOrEqual(result.value.limits.target.max)
  })

  it('uses the points unit and a higher target limit outside the stamp mode', async () => {
    const draft = draftWith(() => undefined)
    const { result } = await mountComposable(() => useProgramFieldOptions(draft))
    const stampsMax = result.value.limits.target.max
    draft.value = draftWith((value) => {
      value.rules = { mode: 'pointsPerVisit', pointsPerVisit: 10, target: 100 }
    }).value
    expect(result.value.unit).toBe('point')
    expect(result.value.limits.target.max).toBeGreaterThan(stampsMax)
  })

  it('keeps welcome units one below the target, never below the minimum', async () => {
    const draft = draftWith((value) => {
      value.rules = { mode: 'stamps', target: 3 }
    })
    const { result } = await mountComposable(() => useProgramFieldOptions(draft))
    expect(result.value.limits.welcomeUnits.max).toBe(2)
    draft.value = draftWith((value) => {
      value.rules = { mode: 'stamps', target: 2 }
    }).value
    expect(result.value.limits.welcomeUnits).toEqual({ min: 1, max: 1 })
  })

  it('keeps a saved value outside the list selectable, in order', async () => {
    const draft = draftWith((value) => {
      value.checkIn = { enabled: true, cooldownHours: 5, cooldownMode: 'rolling' }
      value.expirationPolicy = { kind: 'afterInactivity', months: 7 }
    })
    const { result } = await mountComposable(() => useProgramFieldOptions(draft))
    const cooldownValues = result.value.cooldownOptions.map((option) => option.value)
    const expirationValues = result.value.expirationOptions.map((option) => option.value)
    expect(cooldownValues).toContain('5')
    const hourValues = cooldownValues.filter((value) => value !== 'calendarDay')
    expect(hourValues).toEqual([...hourValues].sort((a, b) => Number(a) - Number(b)))
    expect(cooldownValues.indexOf('calendarDay')).toBe(cooldownValues.indexOf('24') + 1)
    expect(expirationValues).toContain('7')
    expect(expirationValues[0]).toBe('never')
  })

  it('offers never plus the fixed month choices when the policy never expires', async () => {
    const draft = draftWith((value) => {
      value.expirationPolicy = { kind: 'never' }
    })
    const { result } = await mountComposable(() => useProgramFieldOptions(draft))
    expect(result.value.expirationOptions[0]).toEqual({ label: t('program.visitRules.expirationNever'), value: 'never' })
    expect(result.value.expirationOptions.length).toBeGreaterThan(1)
  })

  it('summarises the closed sections from the current draft', async () => {
    const draft = draftWith(() => undefined)
    const { result } = await mountComposable(() => useProgramFieldOptions(draft))
    const before = result.value.summaries
    expect(before?.bonus).toBeTruthy()
    expect(before?.visitRules).toBeTruthy()
    draft.value = draftWith((value) => {
      value.bonusRules.welcomeBonus = { enabled: false, units: 2 }
      value.bonusRules.birthdayMultiplier = { enabled: false, multiplier: 2 }
    }).value
    expect(result.value.summaries?.bonus).not.toBe(before?.bonus)
  })

  it('is a computed that follows the draft ref', async () => {
    const draft = ref<ProgramDraft | null>(null)
    const { result } = await mountComposable(() => useProgramFieldOptions(computed(() => draft.value)))
    expect(result.value.summaries).toBeNull()
    draft.value = emptyClubSetupForm().program
    expect(result.value.summaries).not.toBeNull()
  })
})
