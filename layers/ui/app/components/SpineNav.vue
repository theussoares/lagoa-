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
  <!-- Índice da caderneta: uma linha pautada por página; a página aberta leva um carimbinho de tinta. -->
  <nav :aria-label="label" class="flex flex-1 flex-col">
    <ul v-for="(section, index) in sections" :key="index" class="flex flex-col border-t border-(--lagoa-rule)" :class="{ 'mt-auto': index > 0 }">
      <li v-for="item in section" :key="item.to" class="border-b border-(--lagoa-rule)">
        <NuxtLink v-slot="{ href, navigate, isActive }" :to="item.to" custom>
          <a
            :href="href ?? item.to"
            :aria-current="isActive ? 'page' : undefined"
            class="group flex min-h-12 items-center gap-3 px-2.5 text-[0.9375rem] transition-colors duration-(--lagoa-dur-fast)"
            :class="isActive ? 'font-semibold text-highlighted' : 'text-toned hover:text-highlighted'"
            @click="navigate"
          >
            <UIcon :name="item.icon" class="size-5 shrink-0" :class="isActive ? 'text-primary' : 'text-muted group-hover:text-toned'" aria-hidden="true" />
            <span class="min-w-0 flex-1 truncate">{{ item.label }}</span>
            <span
              v-if="isActive"
              aria-hidden="true"
              class="flex size-6 shrink-0 -rotate-12 items-center justify-center rounded-full text-primary ring-[1.5px] ring-current outline-1 outline-offset-1 outline-current/40"
            >
              <UIcon name="i-ph-check-bold" class="size-3.5" />
            </span>
          </a>
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>
