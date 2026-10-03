<script setup lang="ts">
useThemePreference('customer')
</script>

<template>
  <div class="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col px-5 pt-[max(env(safe-area-inset-top),1.25rem)] pb-[max(env(safe-area-inset-bottom),1.5rem)]">
    <main id="main" class="flex flex-1 flex-col">
      <slot />
    </main>
  </div>
</template>
