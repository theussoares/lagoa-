<template>
  <div class="flex flex-col gap-4" role="status" :aria-label="$t('common.loading')">
    <div class="card flex flex-col gap-5 p-5">
      <div class="flex items-center gap-4">
        <USkeleton class="size-14 rounded-full" />
        <div class="flex flex-1 flex-col gap-2">
          <USkeleton class="h-4 w-1/3" />
          <USkeleton class="h-6 w-2/3" />
        </div>
      </div>
      <USkeleton class="h-5 w-1/4" />
    </div>
    <USkeleton class="h-40 rounded-(--radius-card)" />
  </div>
</template>
