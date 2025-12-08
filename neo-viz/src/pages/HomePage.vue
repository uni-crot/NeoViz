<template>
  <main class="home">
    <section class="hero">
      <h1>Welcome to <span class="highlight">NeoViz!</span></h1>
      <p>
        Visualize your results for neoantigen prediction and combine it with
        clinical immunogenome metrics
      </p>
      <RouterLink to="/explore" class="explore-btn">
  Explore your data →
</RouterLink>
    </section>
  </main>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<style scoped>
.home {
  min-height: calc(100vh - 60px); 
  background: url('../assets/background.jpg') center/cover no-repeat;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero {
  text-align: center;
  background: rgba(255, 255, 255, 0.8);
  padding: 3rem;
  border-radius: 20px;
}

h1 {
  font-size: 3rem;
  font-weight: bold;
}

.highlight {
  color: #3366cc;
}

p {
  font-size: 1.25rem;
  margin: 1.5rem 0;
}

.explore-btn {
  display: inline-block;
  background-color: #3b82f6; 
  color: white;
  font-weight: 600;
  padding: 1rem 1.6rem;
  border-radius: 10px;
  text-decoration: none;
  transition: background-color 0.3s ease, transform 0.2s ease;
  box-shadow: 0 4px 10px rgba(59, 130, 246, 0.3);
}

.explore-btn:hover {
  background-color: #2563eb;
  transform: translateY(-2px);
}

.explore-btn:active {
  background-color: #1d4ed8;
  transform: translateY(0);
}
</style>
