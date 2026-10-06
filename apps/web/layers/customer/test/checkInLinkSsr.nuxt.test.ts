import { describe, expect, it, vi } from 'vitest'
import { createSSRApp, defineComponent, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { useRouter } from '#imports'
import { useCheckInLink } from '../app/composables/useCheckInLink'

const token = 'a'.repeat(43)

describe('useCheckInLink on the server', () => {
  it('sends nothing and leaves the URL alone while rendering on the server', async () => {
    const router = useRouter()
    await router.push(`/check-in#visita=${token}`)
    const replace = vi.spyOn(router, 'replace')
    const send = vi.fn()
    const Page = defineComponent({
      setup() {
        const { pending } = useCheckInLink(send)
        return () => h('p', pending.value ? 'pending' : 'idle')
      },
    })

    const html = await renderToString(createSSRApp(Page))

    expect(html).toContain('pending')
    expect(send).not.toHaveBeenCalled()
    expect(replace).not.toHaveBeenCalled()
  })
})
