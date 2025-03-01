<script setup lang="ts">
import {onMounted, ref, toRaw} from 'vue'
import DataUtils from '../classes/DataUtils.mjs'
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
  postResponse.value = null
  isLoadingPage.value = true
  if (url.value.trim().length > 0) {
    const values = await ScrapeUtils.fetchAndParse(url.value)
    if (values) {
      bookValues.value = values
      updateStatus('Page successfully loaded!')
    } else updateStatus('Unable to load page!', 2)
  }
  isLoadingPage.value = false
}

const post = async () => {
  isPostingBook.value = true
  const payload = await PostUtils.buildPayload(bookValues.value)
  if (payload) {
    console.log(payload)
    const response = await PostUtils.post(payload)
    if (response) {
      // postResponse.value = response
      bookValues.value.postId = response.id
      const savedPost = await DataUtils.saveOrUpdateBook(toRaw(bookValues.value))
      if (savedPost) updateStatus('Posted and saved successfully!')
      else updateStatus('Posted successfully but failed saving!!', 1)
    } else {
      updateStatus('Failed to post to Discord.', 2)
    }
  } else {
    updateStatus('Unable to build Discord payload.', 3)
  }
  isPostingBook.value = false
}

const updateStatus = (message: string, level: number = 0) => {
  if (htmlStatus.value) {
    const date = new Date()
    const now = date.toISOString()
    const time = [
      date.getHours().toString().padStart(2, '0'),
      date.getMinutes().toString().padStart(2, '0'),
      date.getSeconds().toString().padStart(2, '0')
    ].join(':')
    htmlStatus.value.innerHTML = `[${time}] Status: ${message}`
    htmlStatus.value.classList.remove('level0', 'level1', 'level2', 'level3')
    htmlStatus.value.classList.add(`level${level}`)
    htmlStatus.value.title = now
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