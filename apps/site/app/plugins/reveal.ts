import type { ObjectDirective } from 'vue'

/**
 * `v-reveal`: o bloco sobe e aparece quando entra na tela. O HTML pré-renderizado
 * chega visível; só o cliente esconde o que ainda está abaixo da dobra, então sem
 * JS (ou com movimento reduzido) nada fica invisível.
 */
const reveal: ObjectDirective<HTMLElement> = {
  getSSRProps: () => ({}),
  mounted(element) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (element.getBoundingClientRect().top < window.innerHeight) return

    element.classList.add('reveal-pending')
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        element.classList.replace('reveal-pending', 'reveal-shown')
        observer.disconnect()
      },
      { rootMargin: '0px 0px -10% 0px' },
    )
    observer.observe(element)
  },
}

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('reveal', reveal)
})
