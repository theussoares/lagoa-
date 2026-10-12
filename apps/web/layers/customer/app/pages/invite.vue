<script setup lang="ts">
definePageMeta({ path: '/convite', layout: 'customer', middleware: 'customer-auth' })

usePageTitle('invite.pageTitle')
useInviteScreen()
const cityHeaderImage = useCityHeaderImage()
</script>

<template>
  <InviteOpening :title="$t('invite.pageTitle')" :lead="$t('invite.lead')" :image="cityHeaderImage" :message="$t('invite.opening')" />
</template>
