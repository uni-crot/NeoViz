<template>
  <header class="header">
    <div class="logo">Лого</div> 
    <div class="header-center">
      <h1>Neoantigen Visualization Tool</h1>
    </div>

    <nav class="nav">
      <RouterLink to="/">Home</RouterLink>
      <RouterLink to="/about">About</RouterLink>
      <RouterLink to="/help">Help</RouterLink>
    </nav>
  </header>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #3366cc;
  color: white;
  padding: 1rem 1.5rem;
}
.logo {
  font-weight: bold;
}
.header-center {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
}
.header-center h1 {
  font-size: 1.2rem;
  font-weight: 600;
  color: white;
}
.nav {
  display: flex;
  gap: 1rem;
}
.nav a {
  color: white;
  text-decoration: none;
}
.nav a.router-link-active {
  text-decoration: underline;
}
</style>
