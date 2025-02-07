<script setup lang="ts">

import {IPostResponse} from '../classes/PostUtils.mjs'

defineProps<{
  postResponse: IPostResponse
}>()
</script>
<template>
  <div v-if="postResponse.id">
    <p v-for="(value, propertyName) in postResponse"><strong>{{ propertyName }}</strong>: {{ value }}</p>
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