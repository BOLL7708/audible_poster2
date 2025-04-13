<script setup lang="ts">
import {onMounted, ref, toRaw} from 'vue'
import DataUtils, {EBookIdType, IBookDbValues} from '../classes/DataUtils.mjs'
import PostUtils, {EChannel, IPostResponse} from '../classes/PostUtils.mjs'
import ScrapeUtils from '../classes/ScrapeUtils.mjs'
import PostPreview from './MainViewPostPreview.vue'
import ResponsePreview from './MainViewPostResponse.vue'

const keyUrl = 'audiblePoster2Url'

const htmlUrl = ref<HTMLInputElement | null>(null)
const htmlStatusFetch = ref<HTMLSpanElement | null>(null)
const htmlStatusPost = ref<HTMLSpanElement | null>(null)
const htmlStart = ref<HTMLInputElement | null>(null)
const htmlEnd = ref<HTMLInputElement | null>(null)
const htmlScore = ref<HTMLInputElement | null>(null)

const bookValues = ref<IBookDbValues | null>(null)
const url = ref('')
const isLoadingPage = ref(false)
const isPostingBook = ref(false)
const postResponse = ref<IPostResponse | null>(null)
const listenStart = ref('')
const listenEnd = ref('')
const reviewScore = ref(0)

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
      bookValues.value = values // Only scraped values

      // Reset form, otherwise consecutive posts will keep the previous values.
      listenStart.value = ''
      listenEnd.value = ''
      reviewScore.value = 0

      // Load existing book to fill in other values that aren't scraped.
      const existingBook = (await DataUtils.loadBooks(values.bookId, EBookIdType.Book)).pop()
      if (existingBook) {
        // We fill in these values so they can be checked when posting.
        bookValues.value.listenStart = existingBook.listenStart
        bookValues.value.listenEnd = existingBook.listenEnd
        bookValues.value.postStartId = existingBook.postStartId
        bookValues.value.postEndId = existingBook.postEndId
        bookValues.value.reviewScore = existingBook.reviewScore

        // Update the form values
        listenStart.value = existingBook.listenStart ?? ''
        listenEnd.value = existingBook.listenEnd ?? ''
        reviewScore.value = existingBook.reviewScore ?? 0
      }
      // Automatically fill in the listen start date if not in DB, and the end date if that is missing but start exists.
      if(!bookValues.value.listenStart?.length) {
        listenStart.value = new Date().toISOString().split('T')[0]
      } else if(!bookValues.value.listenEnd?.length) {
        listenEnd.value = new Date().toISOString().split('T')[0]
      }
      console.log('fetchPage', {bookValues, existingBook, values})
      updateStatus(htmlStatusFetch.value, 'Page successfully loaded!')
    } else updateStatus(htmlStatusFetch.value, 'Unable to load page!', 2)
  }
  isLoadingPage.value = false
}

const post = async () => {
  if (!bookValues.value) return alert('No book values to post!')
  isPostingBook.value = true

  bookValues.value.listenStart = listenStart.value
  bookValues.value.listenEnd = listenEnd.value
  bookValues.value.reviewScore = reviewScore.value
  const payload = await PostUtils.buildForumPayload(toRaw(bookValues.value))
  if (payload) {
    console.log('post', {payload})
    const response = await PostUtils.post(payload, EChannel.Forum)
    if (response) {
      // postResponse.value = response // Updates the GUI with the response.

      // Alerts
      if (!bookValues.value?.postStartId && bookValues.value.listenStart?.trim()?.length) {
        // Post Listen Start Alert
        const alertPayload = PostUtils.buildAlertPayload(true, toRaw(bookValues.value))
        if(alertPayload) {
          const alertResponse = await PostUtils.post(alertPayload, EChannel.Alert)
          bookValues.value.postStartId = alertResponse?.id ?? ''
        }
      }
      if (!bookValues.value?.postEndId && bookValues.value.listenEnd?.trim()?.length) {
        // Post Listen End Alert
        const alertPayload = PostUtils.buildAlertPayload(false, toRaw(bookValues.value))
        if(alertPayload) {
          const alertResponse = await PostUtils.post(alertPayload, EChannel.Alert)
          bookValues.value.postEndId = alertResponse?.id ?? ''
        }
      }

      // Update book ID
      bookValues.value.postId = response.id

      // Save post to database.
      const savedPost = await DataUtils.saveOrUpdateBook(toRaw(bookValues.value))
      if (savedPost) updateStatus(htmlStatusPost.value, 'Posted and saved successfully!')
      else updateStatus(htmlStatusPost.value, 'Posted successfully but failed saving!!', 1)
    } else {
      updateStatus(htmlStatusPost.value, 'Failed to post to Discord.', 2)
    }
  } else {
    updateStatus(htmlStatusPost.value, 'Unable to build Discord payload.', 3)
  }
  isPostingBook.value = false
}

const updateStatus = (htmlStatus: HTMLSpanElement | null, message: string, level: number = 0) => {
  if (htmlStatus) {
    const date = new Date()
    const now = date.toISOString()
    const time = [
      date.getHours().toString().padStart(2, '0'),
      date.getMinutes().toString().padStart(2, '0'),
      date.getSeconds().toString().padStart(2, '0')
    ].join(':')
    htmlStatus.innerHTML = `[${time}] Status: ${message}`
    htmlStatus.classList.remove('level0', 'level1', 'level2', 'level3')
    htmlStatus.classList.add(`level${level}`)
    htmlStatus.title = now
    if (message.length) htmlStatus.classList.remove('hidden')
    else htmlStatus.classList.add('hidden')
  }
}

// fetchPage()
</script>

<template>
  <div class="card">
    <div class="block">
      <label for="url" class="flex">Audible Book URL:
        <input type="text" name="url" ref="htmlUrl" @change="urlChanged" :value="url"/>
      </label>
    </div>
    <div class="block">
      <button :disabled="isLoadingPage || url.trim().length == 0" @click="fetchPage()">Fetch page</button>
      <span ref="htmlStatusFetch" class="status hidden"></span>
    </div>
    <div v-if="postResponse" class="block">
      <response-preview :postResponse="postResponse"></response-preview>
    </div>
    <div v-else-if="bookValues" class="block">
      <label>Started listening at: <input ref="htmlStart" type="date" v-model="listenStart"/></label>
      <label>Finished listening at: <input ref="htmlEnd" type="date" v-model="listenEnd"/></label>
      <label>Review score: <input ref="htmlScore" type="number" v-model="reviewScore"/></label>
      <button :disabled="Object.keys(bookValues ?? {}).length == 0" @click="post()">Post to Discord</button>
      <span ref="htmlStatusPost" class="status hidden"></span>
      <hr/>
      <post-preview :bookValues="bookValues"></post-preview>
    </div>
  </div>
</template>