<script setup lang="ts">
import {ref} from 'vue'
import FileUtils from '../classes/FileUtils.mjs'
import PostUtils from '../classes/PostUtils.mjs'
import ScrapeUtils, {IBookValues} from '../classes/ScrapeUtils.mjs'
import PostPreview from './MainViewPostPreview.vue'

const bookValues = ref<IBookValues>({})

// TODO: This should happen automatically, so this button should be removed when that has been implemented.
const save = async () => {
  const result = await FileUtils.saveList([{post: 'Hello', link: 'Haha'}, {post: 'Test', link: 'hohoho'}])
  console.log(result)
}
// TODO: Fill a list of received items, make it possible to load a URL to refresh the data for a book.
const load = async () => {
  const list = await FileUtils.loadList()
  console.log(list)
}

// TODO: Make a form so we can provide a URL at will.
const fetchPage = async () => {
  const values = await ScrapeUtils.fetchAndParse('https://www.audible.co.uk/pd/New-Potential-Audiobook/B0DNKR5KKM')
  if (values) bookValues.value = values
}

const post = async () => {
  const payload = await PostUtils.buildPayload(bookValues.value)
  console.log({values: bookValues.value, payload})
  if(payload) {
    await PostUtils.post(payload)
  }
}

// fetchPage()
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