<script setup lang="ts">
import {ref} from 'vue'
import FileUtils from '../classes/FileUtils.mjs'
import PostUtils from '../classes/PostUtils.mjs'
import ScrapeUtils, {IBookValues} from '../classes/ScrapeUtils.mjs'
import PostPreview from './MainViewPostPreview.vue'

const bookValues = ref<IBookValues>({})

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
  if (values) bookValues.value = values
}

const post = async () => {
  await PostUtils.post({payload: {content: 'this is a test', thread_name: 'New Thread'}})
}

fetchPage()

</script>

<template>
  <div class="card">
    <button type="button" @click="save()">Save list</button>
    <button type="button" @click="load()">Load list</button>
    <button type="button" @click="fetchPage()">Fetch page</button>
    <post-preview :bookValues="bookValues"></post-preview>
    <button type="button" @click="post()">Post to Discord</button>
  </div>
</template>