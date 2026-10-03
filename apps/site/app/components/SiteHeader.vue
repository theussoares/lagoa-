<script setup lang="ts">
const { t } = useI18n()
const { appUrl } = useRuntimeConfig().public

const menuOpen = ref(false)
const menuId = useId()

const links = computed(() => [
  { href: '#balcao', label: t('nav.counter') },
  { href: '#sumidos', label: t('nav.lapsed') },
  { href: '#como-funciona', label: t('nav.how') },
  { href: '#preco', label: t('nav.pricing') },
  { href: '#duvidas', label: t('nav.faq') },
])

function closeMenu(): void {
  menuOpen.value = false
}
</script>

<template>
  <!-- Barra sempre de tinta escura: os tokens do .dark valem só aqui dentro. -->
  <header class="dark fixed inset-x-0 top-3 z-50 px-4" @keydown.esc="closeMenu">
    <div class="mx-auto max-w-6xl rounded-[1.75rem] bg-(--lagoa-header) text-default shadow-(--lagoa-shadow-card)">
      <div class="flex items-center justify-between gap-3 py-2 pr-2 pl-5">
        <a href="#inicio" class="inline-flex min-h-11 items-center font-display text-2xl font-bold text-highlighted" :aria-label="t('nav.home')">
          Lagoa<span class="text-(--color-lima-200)">+</span>
        </a>

        <nav :aria-label="t('nav.label')" class="hidden lg:block">
          <ul class="flex items-center gap-1">
            <li v-for="link in links" :key="link.href">
              <a :href="link.href" class="inline-flex min-h-11 items-center rounded-full px-3 text-[0.9375rem] text-toned transition-colors duration-(--lagoa-dur-fast) hover:text-highlighted">
                {{ link.label }}
              </a>
            </li>
          </ul>
        </nav>

        <div class="flex items-center gap-1">
          <a :href="`${appUrl}/balcao/entrar`" class="hidden min-h-11 items-center rounded-full px-3 text-[0.9375rem] text-toned hover:text-highlighted lg:inline-flex">
            {{ t('nav.signIn') }}
          </a>
          <WhatsAppButton size="md" class="hidden min-h-11 px-4 sm:inline-flex" />
          <UButton
            class="size-11 justify-center lg:hidden"
            color="neutral"
            variant="ghost"
            size="md"
            :icon="menuOpen ? 'i-ph-x' : 'i-ph-list'"
            :aria-label="menuOpen ? t('nav.closeMenu') : t('nav.openMenu')"
            :aria-expanded="menuOpen"
            :aria-controls="menuId"
            @click="menuOpen = !menuOpen"
          />
        </div>
      </div>

      <nav v-show="menuOpen" :id="menuId" :aria-label="t('nav.label')" class="border-t border-(--lagoa-rule) px-3 pt-2 pb-4 lg:hidden">
        <ul class="flex flex-col">
          <li v-for="link in links" :key="link.href">
            <a :href="link.href" class="flex min-h-12 items-center rounded-xl px-3 text-lg text-toned hover:text-highlighted" @click="closeMenu">
              {{ link.label }}
            </a>
          </li>
          <li>
            <a :href="`${appUrl}/balcao/entrar`" class="flex min-h-12 items-center rounded-xl px-3 text-lg text-toned hover:text-highlighted">
              {{ t('nav.signIn') }}
            </a>
          </li>
        </ul>
        <WhatsAppButton block class="mt-3 sm:hidden" />
      </nav>
    </div>
  </header>
</template>
