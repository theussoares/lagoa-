<script setup lang="ts">
import type { SpineNavItem } from '../types/spine'

interface Props {
  items: readonly SpineNavItem[]
  /** Páginas de rodapé (Configurações): mesmo índice, empurradas para o fim da lombada. */
  footerItems?: readonly SpineNavItem[]
  label: string
}

const props = withDefaults(defineProps<Props>(), { footerItems: () => [] })

const sections = computed(() => [props.items, props.footerItems].filter((section) => section.length > 0))
</script>

<template>
  <!-- Navegação lateral: pílula por página; a página aberta ganha fundo claro e um ponto de acento. -->
  <nav :aria-label="label" class="flex flex-1 flex-col">
    <ul v-for="(section, index) in sections" :key="index" class="flex flex-col gap-1" :class="{ 'mt-auto': index > 0 }">
      <li v-for="item in section" :key="item.to">
        <NuxtLink v-slot="{ href, navigate, isActive }" :to="item.to" custom>
          <a
            :href="href ?? item.to"
            :aria-current="isActive ? 'page' : undefined"
            class="group flex min-h-12 items-center gap-3 rounded-full px-4 text-[0.9375rem] transition-colors duration-(--lagoa-dur-fast)"
            :class="isActive ? 'bg-white/10 font-semibold text-highlighted' : 'text-toned hover:bg-white/5 hover:text-highlighted'"
            @click="navigate"
          >
            <UIcon :name="item.icon" class="size-5 shrink-0" :class="isActive ? 'text-(--color-lima-400)' : 'text-muted group-hover:text-toned'" aria-hidden="true" />
            <span class="min-w-0 flex-1 truncate">{{ item.label }}</span>
            <span v-if="isActive" aria-hidden="true" class="live-dot size-2 shrink-0 rounded-full bg-(--color-lima-400)" />
          </a>
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>
