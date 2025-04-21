<script setup lang="ts">

import {ref} from 'vue'
import AuthUtils from '../classes/AuthUtils.mjs'

const emit = defineEmits(['authed'])
const password = ref('')
const status = ref('')

const submitForm = async ()=>{
  await AuthUtils.setPassword(password.value)
  const root = import.meta.env.VITE_ROOT_PHP ?? ''
  const response = await fetch(`${root}auth.php`, AuthUtils.getInit())
  if(response.ok) {
    emit('authed')
  } else {
    status.value = 'Failed to authenticate!'
  }
}
</script>
<template>
  <div class="card">
    <div class="block">
      <form @submit.prevent="submitForm">
        <label for="password" class="flex">Password:
          <input type="password" v-model="password"/>
        </label>
        <button type="submit">Authenticate</button>
      </form>
      <p>
        <span v-if="status" class="status level2">{{status}}</span>
      </p>
    </div>
  </div>
</template>