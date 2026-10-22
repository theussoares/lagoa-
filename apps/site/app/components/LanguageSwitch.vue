<script setup lang="ts">
const { locale, locales } = useI18n()
const alternatePath = useAlternatePath()

const other = computed(() => locales.value.find((item) => item.code !== locale.value))
const otherPath = computed(() => (other.value ? alternatePath(other.value.code === 'en' ? 'en' : 'pt-BR') : ''))
</script>

<template>
  <!-- Link comum entre as duas versões: a LP é estática, sem script para trocar idioma. -->
  <a v-if="other" :href="otherPath" :hreflang="other.code" :lang="other.code" :aria-label="other.name" class="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full px-3 text-[0.9375rem] font-semibold tracking-wide text-toned transition-colors duration-(--lagoa-dur-fast) hover:text-highlighted">
    {{ other.code.slice(0, 2).toUpperCase() }}
  </a>
</template>
