<script setup lang="ts">
const theme = useThemePreference()
const { t } = useI18n()

const isDark = computed(() => theme.value === 'dark')

function toggleTheme(): void {
  theme.value = isDark.value ? 'light' : 'dark'
}
</script>

<template>
  <button
    type="button"
    class="group relative flex size-9 sm:size-10 items-center justify-center rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 text-slate-700 dark:text-slate-200 shadow-xs backdrop-blur-md transition-all duration-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary cursor-pointer print:hidden"
    :aria-label="isDark ? t('theme.switchToLight') : t('theme.switchToDark')"
    :title="isDark ? t('theme.switchToLight') : t('theme.switchToDark')"
    @click="toggleTheme"
  >
    <!-- Ícone da lua no tema escuro (idêntico à referência visual) -->
    <UIcon
      name="i-ph-moon"
      class="hidden dark:inline-block size-5 sm:size-5.5 transition-transform duration-200 group-hover:scale-110"
      aria-hidden="true"
    />
    <!-- Ícone do sol no tema claro (idêntico à referência visual) -->
    <UIcon
      name="i-ph-sun"
      class="inline-block dark:hidden size-5 sm:size-5.5 transition-transform duration-200 group-hover:scale-110"
      aria-hidden="true"
    />
  </button>
</template>
