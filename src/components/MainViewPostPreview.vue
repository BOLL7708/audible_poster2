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
<style scoped>
p {
  margin: 0;
}
p:hover {
  background-color: #646464;
  border-radius: 4pt;
}
strong {
  color: gold;
}
</style>