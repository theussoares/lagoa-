import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { defineComponent } from 'vue'

export interface MountedComposable<T> {
  readonly result: T
  readonly wrapper: VueWrapper
}

/** Roda o composable dentro de um componente real: ciclo de vida, auto-imports e plugins do Nuxt. */
export async function mountComposable<T>(factory: () => T): Promise<MountedComposable<T>> {
  let result: T | undefined
  const wrapper = await mountSuspended(
    defineComponent({
      setup() {
        result = factory()
        return () => null
      },
    }),
  )
  await flushPromises()
  if (result === undefined) throw new Error('composable did not run')
  return { result, wrapper }
}
