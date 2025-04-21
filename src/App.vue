<script setup lang="ts">
import {ref} from 'vue'
import AuthUtils from './classes/AuthUtils.mjs'
import AccountView from './components/AccountView.vue'
import MainView from './components/MainView.vue'

const isAuthed = ref(false)
const root = import.meta.env.VITE_ROOT_PHP ?? ''
fetch(`${root}auth.php`, AuthUtils.getInit()).then(res => isAuthed.value = res.ok)
const onAuthed = () => {
  isAuthed.value = true
}
</script>
<template>
  <MainView v-if="isAuthed"></MainView>
  <AccountView v-else @authed="onAuthed"></AccountView>
</template>