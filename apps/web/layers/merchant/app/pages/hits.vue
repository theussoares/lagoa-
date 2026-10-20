<script setup lang="ts">
definePageMeta({ path: '/hits', layout: 'merchant', middleware: 'merchant-auth' })

const { t } = useI18n()
useHead({ title: () => `${t('merchantHits.title')} · ${t('app.name')}` })

const screen = useHitsScreen()
</script>

<template>
  <div class="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
    <PageTitle :title="t('merchantHits.title')" :lead="t('merchantHits.lead')" />
    <InkNote v-if="screen.message" :tone="screen.message.tone" :description="t(screen.message.key)" :live="screen.message.tone === 'error'" />
    <InkNote v-if="screen.loadError" tone="error" :description="t(`errors.${screen.loadError}`)" live />
    <div v-if="screen.formOpen" class="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <PanelModule :title="t(screen.editingId ? 'merchantHits.form.editTitle' : 'merchantHits.form.newTitle')">
        <HitsForm
          :form="screen.form"
          :photo-url="screen.photoUrl"
          :saving="screen.state.status === 'saving'"
          :field-error="screen.fieldError"
          :error-key="screen.errorKey"
          @change="screen.change"
          @change-contact="screen.changeContact"
          @choose-photo="screen.choosePhoto"
          @save="screen.save"
          @cancel="screen.cancel"
        />
      </PanelModule>
      <PanelModule :title="t('merchantHits.preview.title')">
        <HitsPreview :preview="screen.preview" />
      </PanelModule>
    </div>
    <PanelModule v-else :title="t('merchantHits.listTitle')">
      <template #actions>
        <span class="text-[0.9375rem] text-toned tabular-nums">{{ t('merchantHits.counter', { count: screen.activeCount, cap: screen.cap }) }}</span>
        <ActionButton role="primary" :label="t('merchantHits.new')" :disabled="screen.loading || !screen.canCreate" @click="screen.startCreate" />
      </template>
      <p v-if="!screen.canCreate && !screen.loading" class="mb-4 text-toned">{{ t('merchantHits.capReached') }}</p>
      <USkeleton v-if="screen.loading" class="h-24 w-full" />
      <HitsList v-else :rows="screen.rows" :busy="screen.state.status === 'saving'" @edit="screen.startEdit" @archive="screen.archive" @unarchive="screen.unarchive" />
    </PanelModule>
  </div>
</template>
