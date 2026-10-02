import { describe, expect, it, vi } from 'vitest'
import { ok } from '#shared/types/result'
import type { Result } from '#shared/types/result'
import { useAsyncResult } from '../app/composables/useAsyncResult'

function deferred(): { promise: Promise<Result<string, never>>; resolve: (value: string) => void } {
  let resolve: (value: string) => void = () => {}
  const promise = new Promise<Result<string, never>>((done) => {
    resolve = (value) => done(ok(value))
  })
  return { promise, resolve }
}

describe('useAsyncResult', () => {
  it('ignores a response that arrives after a newer request', async () => {
    // Fora de um componente o onMounted só avisa; o teste chama reload na mão.
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const first = deferred()
    const second = deferred()
    const load = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const { state, reload } = useAsyncResult<string, never>(load)

    const older = reload()
    const newer = reload()
    second.resolve('rewardReady')
    await newer
    first.resolve('lapsed')
    await older

    expect(state.value).toEqual({ status: 'success', value: 'rewardReady' })
  })
})
