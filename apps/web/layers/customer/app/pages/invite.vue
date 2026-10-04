<script setup lang="ts">
definePageMeta({ path: '/convite', layout: 'customer', middleware: 'customer-auth' })

usePageTitle('invite.pageTitle')
useInviteScreen()
</script>

<template>
  <p class="text-center" aria-live="polite">{{ $t('invite.opening') }}</p>
</template>
