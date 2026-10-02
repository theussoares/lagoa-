import { describe, expect, it } from 'vitest'
import { emptyClubSetupForm, firstStepWithErrors, programErrorsForSteps, shopFieldErrors, stepHasErrors, toClubSetupDraft } from '../app/utils/clubSetupForm'

function filledForm() {
  const form = emptyClubSetupForm()
  form.shop = { name: 'Lava-jato Brilho', category: 'other', neighborhood: 'Centro', addressLine: 'Rua de exemplo, 100' }
  form.program.reward.title = 'Lavagem simples grátis'
  return form
}

describe('club setup form', () => {
  it('starts with a valid program but asks for the shop and the reward', () => {
    const form = emptyClubSetupForm()
    expect(shopFieldErrors(form.shop)).toEqual({ name: true, category: true, neighborhood: true, addressLine: true })
    expect(stepHasErrors(form, 'rules')).toBe(false)
    expect(stepHasErrors(form, 'reward')).toBe(true)
    expect(firstStepWithErrors(form)).toBe('shop')
    expect(toClubSetupDraft(form)).toBeNull()
  })

  it('only shows program errors for steps the merchant already tried to pass', () => {
    const form = emptyClubSetupForm()
    expect(programErrorsForSteps(form.program, new Set(['shop', 'rules']))).toEqual({})
    expect(programErrorsForSteps(form.program, new Set(['reward']))).toEqual({ rewardTitle: true })
  })

  it('points to the step that still needs fixing', () => {
    const form = filledForm()
    form.program.bonusRules.welcomeBonus.units = form.program.rules.target
    expect(firstStepWithErrors(form)).toBe('reward')
  })

  it('builds the draft sent to the server, trimmed', () => {
    const form = filledForm()
    form.shop.name = '  Lava-jato Brilho  '
    expect(toClubSetupDraft(form)?.shop.name).toBe('Lava-jato Brilho')
  })
})
