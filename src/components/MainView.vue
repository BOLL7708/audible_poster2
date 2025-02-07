<script setup lang="ts">
import {onMounted, ref} from 'vue'
import FileUtils from '../classes/FileUtils.mjs'
import PostUtils, {IPostResponse} from '../classes/PostUtils.mjs'
import ScrapeUtils, {IBookValues} from '../classes/ScrapeUtils.mjs'
import PostPreview from './MainViewPostPreview.vue'
import ResponsePreview from './MainViewPostResponse.vue'

const keyUrl = 'audiblePoster2Url'
const bookValues = ref<IBookValues>({})
const htmlUrl = ref<HTMLInputElement | null>(null)
const htmlStatus = ref<HTMLSpanElement | null>(null)
const url = ref('')
const isLoadingPage = ref(false)
const isPostingBook = ref(false)
const postResponse = ref<IPostResponse | null>(null)

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

onMounted(() => {
  url.value = localStorage.getItem(keyUrl) ?? ''
})

const urlChanged = () => {
  const urlStr = htmlUrl.value?.value
  if (urlStr) {
    url.value = urlStr
    localStorage.setItem(keyUrl, urlStr)
  }
}

const fetchPage = async () => {
  isLoadingPage.value = true
  if (url.value.trim().length > 0) {
    const values = await ScrapeUtils.fetchAndParse(url.value)
    if (values) bookValues.value = values
    else updateStatus('Unable to load page!')
  }
  isLoadingPage.value = false
}

const post = async () => {
  isPostingBook.value = true
  const payload = await PostUtils.buildPayload(bookValues.value)
  console.log({values: bookValues.value, payload})
  if (payload) {
    const response = await PostUtils.post(payload)
    if (response) {
      postResponse.value = response
      updateStatus('Posted successfully!')
      // TODO: Save post to list
    } else {
      updateStatus('Failed to post to Discord.')
    }
  } else {
    updateStatus('Unable to build Discord payload.')
  }
  isPostingBook.value = false
}

const updateStatus = (message: string) => {
  if (htmlStatus.value) {
    htmlStatus.value.innerHTML = `Status: ${message}`
    if (message.length) htmlStatus.value.classList.remove('hidden')
    else htmlStatus.value.classList.add('hidden')
  }
}

// fetchPage()
</script>

<template>
  <div class="card">
    <p class="url-container">
      <label for="url">Audible Book URL: </label>
      <input type="text" name="url" ref="htmlUrl" @change="urlChanged" :value="url"/>
    </p>
    <p>
      <button :disabled="isLoadingPage || url.trim().length == 0" @click="fetchPage()">Fetch page</button>
      <button :disabled="Object.keys(bookValues).length == 0" @click="post()">Post to Discord</button>
      <span ref="htmlStatus" class="status hidden"></span>
    </p>
    <div v-if="postResponse">
      <response-preview :postResponse="postResponse"></response-preview>
    </div>
    <div v-else>
      <post-preview :bookValues="bookValues"></post-preview>
    </div>
  </div>
</template>
<style scoped>
.url-container {
  display: flex;
}

input {
  flex-grow: 1;
}
</style>