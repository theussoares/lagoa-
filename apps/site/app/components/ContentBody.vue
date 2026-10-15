<script setup lang="ts">
import type { Block } from '~/types/content'

interface Props {
  blocks: Block[]
}

defineProps<Props>()
</script>

<template>
  <div class="prose-lagoa">
    <template v-for="(block, index) in blocks" :key="index">
      <h2 v-if="block.kind === 'h2'">{{ block.text }}</h2>
      <p v-else-if="block.kind === 'p'">{{ block.text }}</p>
      <blockquote v-else-if="block.kind === 'quote'">{{ block.text }}</blockquote>
      <ul v-else-if="block.kind === 'ul'">
        <li v-for="item in block.items" :key="item">{{ item }}</li>
      </ul>
      <ol v-else>
        <li v-for="item in block.items" :key="item">{{ item }}</li>
      </ol>
    </template>
  </div>
</template>
