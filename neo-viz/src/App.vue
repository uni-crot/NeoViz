<template>
  <div id="app">
    <Header />
    <router-view />
  </div>
</template>

<script setup lang="ts">
import Header from './components/Header.vue'
</script>

<style>
body {
  margin: 0;
  font-family: "Segoe UI", sans-serif;
}
</style>
