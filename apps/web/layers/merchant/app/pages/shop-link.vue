<script setup lang="ts">
definePageMeta({ path: '/botao-do-card', layout: 'merchant', middleware: 'merchant-auth' })

const { t } = useI18n()
useHead({ title: () => `${t('merchantShopLink.title')} · ${t('app.name')}` })

const screen = useShopLinkScreen()
</script>

<template>
  <div class="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
    <PageTitle :title="t('merchantShopLink.title')" :lead="t('merchantShopLink.lead')" />
    <div class="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <PanelModule :title="t('merchantShopLink.formTitle')">
        <form class="flex flex-col gap-5" novalidate @submit.prevent="screen.save">
          <ShopLinkKindChoice :model-value="screen.form.kind" :disabled="screen.loading" @update:model-value="screen.change({ kind: $event })" />
          <ShopLinkWhatsappFields
            v-if="screen.form.kind === 'whatsapp'"
            :whatsapp="screen.form.whatsapp"
            :message="screen.form.message"
            :loading="screen.loading"
            :invalid="screen.fieldError === 'invalidWhatsapp'"
            @update:whatsapp="screen.change({ whatsapp: $event })"
            @update:message="screen.change({ message: $event })"
          />
          <ShopLinkUrlFields
            v-else
            :model-value="screen.form.url"
            :loading="screen.loading"
            :invalid="screen.fieldError === 'invalidUrl'"
            @update:model-value="screen.change({ url: $event })"
          />
          <ShopLinkLabelField
            :model-value="screen.form.ctaLabel"
            :kind="screen.form.kind"
            :loading="screen.loading"
            :missing="screen.fieldError === 'missingLabel'"
            @update:model-value="screen.change({ ctaLabel: $event })"
          />
          <div class="flex flex-wrap items-center gap-3">
            <ActionButton role="primary" type="submit" :label="t('merchantShopLink.save')" :loading="screen.state.status === 'saving'" :disabled="screen.loading" />
            <ActionButton v-if="screen.hasSaved" role="secondary" type="button" :label="t('merchantShopLink.remove')" :disabled="screen.loading || screen.state.status === 'saving'" @click="screen.remove" />
            <p aria-live="polite" class="text-[0.9375rem]" :class="screen.message?.tone === 'error' ? 'text-error' : 'text-muted'">
              <template v-if="screen.message">{{ t(screen.message.key) }}</template>
            </p>
          </div>
        </form>
      </PanelModule>
      <PanelModule :title="t('merchantShopLink.preview.title')">
        <ShopLinkButtonPreview :preview="screen.preview" />
      </PanelModule>
    </div>
  </div>
</template>
