<template>
  <div class="flex flex-col" role="status" :aria-label="$t('common.loading')">
    <div v-for="row in 5" :key="row" class="flex h-14 items-center gap-4 border-b border-(--lagoa-rule) last:border-b-0">
      <USkeleton class="h-4 w-11" />
      <USkeleton class="h-4 w-36" />
      <USkeleton class="ml-auto h-4 w-24" />
      <USkeleton class="size-9 rounded-full" />
    </div>
  </div>
</template>
