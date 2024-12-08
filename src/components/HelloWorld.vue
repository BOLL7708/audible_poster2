<script setup lang="ts">
import { ref } from 'vue'
import FileUtils from '../classes/FileUtils.mjs'

defineProps<{ msg: string }>()

const count = ref(0)

const save = async ()=>{
  const result = await FileUtils.saveList([{post: 'Hello', link: 'Haha'}, {post: 'Test', link: 'hohoho'}])
  console.log(result)
}
const load = async ()=>{
  const list = await FileUtils.loadList()
  console.log(list)
}

</script>

<template>
  <h1>{{ msg }}</h1>

  <div class="card">
    <button type="button" @click="count++">count is {{ count }}</button>
    <button type="button" @click="save()">Save list</button>
    <button type="button" @click="load()">Load list</button>
    <p>
      Edit
      <code>components/HelloWorld.vue</code> to test HMR
    </p>
  </div>

  <p>
    Check out
    <a href="https://vuejs.org/guide/quick-start.html#local" target="_blank"
      >create-vue</a
    >, the official Vue + Vite starter
  </p>
  <p>
    Learn more about IDE Support for Vue in the
    <a
      href="https://vuejs.org/guide/scaling-up/tooling.html#ide-support"
      target="_blank"
      >Vue Docs Scaling up Guide</a
    >.
  </p>
  <p class="read-the-docs">Click on the Vite and Vue logos to learn more</p>
</template>

<style scoped>
.read-the-docs {
  color: #888;
}
</style>
