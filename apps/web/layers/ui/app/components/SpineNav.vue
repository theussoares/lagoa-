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
  <!-- Navegação lateral: itens com cantos arredondados, fundo escuro e destaque ativo conforme referência visual. -->
  <nav :aria-label="label" class="flex flex-1 flex-col">
    <ul
      v-for="(section, index) in sections"
      :key="index"
      class="flex flex-col"
      :class="index === 0 ? 'gap-2.5' : 'mt-auto pt-4 border-t border-white/10 gap-2'"
    >
      <li v-for="item in section" :key="item.to">
        <NuxtLink v-slot="{ href, navigate, isActive }" :to="item.to" custom>
          <a
            :href="href ?? item.to"
            :aria-current="isActive ? 'page' : undefined"
            class="group flex min-h-12 items-center gap-3 rounded-xl px-3 py-2.5 text-[0.9375rem] transition-all duration-(--lagoa-dur-fast)"
            :class="isActive ? 'bg-[#0f3844] text-white font-medium shadow-xs' : 'text-slate-300/80 hover:bg-white/5 hover:text-white'"
            @click="navigate"
          >
            <UIcon
              :name="item.icon"
              class="size-5 shrink-0 transition-colors"
              :class="isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'"
              aria-hidden="true"
            />
            <span class="min-w-0 flex-1 truncate">{{ item.label }}</span>
          </a>
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>
