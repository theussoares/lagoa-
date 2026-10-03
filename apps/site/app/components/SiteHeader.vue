<script setup lang="ts">
const { t } = useI18n()
const whatsappLink = useWhatsAppLink()
const { appUrl } = useRuntimeConfig().public

const links = computed(() => [
  { href: '#como-funciona', label: t('nav.how') },
  { href: '#regras', label: t('nav.bonus') },
  { href: '#rede', label: t('nav.network') },
  { href: '#preco', label: t('nav.pricing') },
  { href: '#duvidas', label: t('nav.faq') },
])
</script>

<template>
  <!-- Barra sempre de tinta escura: os tokens do .dark valem só aqui dentro. -->
  <header class="dark fixed inset-x-0 top-3 z-50 px-4">
    <div class="mx-auto flex max-w-6xl items-center justify-between gap-4 rounded-full bg-(--lagoa-header) py-2 pr-2 pl-5 text-default shadow-(--lagoa-shadow-card)">
      <a href="#inicio" class="font-display text-2xl font-bold text-highlighted" :aria-label="t('nav.home')">
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
        <a :href="`${appUrl}/balcao/entrar`" class="hidden min-h-11 items-center rounded-full px-3 text-[0.9375rem] text-toned hover:text-highlighted sm:inline-flex">
          {{ t('nav.signIn') }}
        </a>
        <UButton :to="whatsappLink" target="_blank" trailing-icon="i-ph-arrow-right" size="md" class="min-h-11 px-4">
          {{ t('nav.cta') }}
        </UButton>
      </div>
    </div>
  </header>
</template>
