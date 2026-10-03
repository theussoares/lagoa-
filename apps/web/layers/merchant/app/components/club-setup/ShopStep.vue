<script setup lang="ts">
import type { ShopFieldErrors, ShopProfileForm } from '../../types/clubSetup'

interface Props {
  errors: ShopFieldErrors
}

defineProps<Props>()
const shop = defineModel<ShopProfileForm>('shop', { required: true })
</script>

<template>
  <PanelModule :title="$t('clubSetup.shop.module')">
    <ClubSetupShopFields v-model:shop="shop" :errors="errors" />
  </PanelModule>
</template>
