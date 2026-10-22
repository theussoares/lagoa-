<script setup lang="ts">
// Montado só com a aba Prêmios aberta: o histórico de resgates não é buscado na aba Cartões.
const rewards = useWalletRewardsTab()
</script>

<template>
  <div class="flex flex-col gap-8">
    <RewardsPanel :screen="rewards" />
  </div>
</template>
