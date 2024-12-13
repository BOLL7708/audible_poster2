<script setup lang="ts">
import {IBookValues} from '../classes/ScrapeUtils.mjs'

defineProps<{
  bookValues: IBookValues
}>()
</script>
<template>
  <div v-if="bookValues.title?.length">
    <p><strong>Title:</strong> {{ bookValues.title }}</p>
    <p><strong>Description:</strong> {{ bookValues.description }}</p>
    <p><strong>Link:</strong> {{ bookValues.link }}</p>
    <p><strong>Image:</strong> {{ bookValues.imageUrl }}</p>
  </div>
</template>
