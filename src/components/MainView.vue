<script setup lang="ts">
import FileUtils from '../classes/FileUtils.mjs'
import ScrapeUtils from '../classes/ScrapeUtils.mjs'

const save = async () => {
  const result = await FileUtils.saveList([{post: 'Hello', link: 'Haha'}, {post: 'Test', link: 'hohoho'}])
  console.log(result)
}
const load = async () => {
  const list = await FileUtils.loadList()
  console.log(list)
}

const fetchPage = async () => {
  const values = await ScrapeUtils.fetchAndParse('https://www.audible.co.uk/pd/The-Mayor-of-Noobtown-Audiobook/1774240122')
  console.log(values)
}

</script>

<template>
  <div class="card">
    <button type="button" @click="save()">Save list</button>
    <button type="button" @click="load()">Load list</button>
    <button type="button" @click="fetchPage()">Fetch page</button>
  </div>
</template>