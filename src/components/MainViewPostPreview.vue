<script setup lang="ts">
import {IBookValues} from '../classes/ScrapeUtils.mjs'

defineProps<{
  bookValues: IBookValues
}>()
</script>
<template>
  <div v-if="bookValues.title?.length">
    <p v-for="(value, propertyName) in bookValues"><strong>{{ propertyName }}</strong>: {{ value }}</p>
  </div>
</template>
