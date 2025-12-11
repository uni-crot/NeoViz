<template>
  <main class="explore-page">
    <h1>Explore your data</h1>

    <!-- STEP 1 — CHOOSE MODE -->
    <section class="step">
      <h2>1. Choose analysis mode</h2>

      <div class="mode-buttons">
        <button
          :class="{ active: mode === 'one' }"
          @click="mode = 'one'"
        >
          One patient
        </button>

        <button
          :class="{ active: mode === 'cohort' }"
          @click="mode = 'cohort'"
        >
          A cohort
        </button>
      </div>
    </section>

    <!-- SCENARIO 1: ONE PATIENT -->
    <section v-if="mode === 'one'" class="step">
      <h2>2. Upload Neoantigen Aggregated Report</h2>
      <p class="comment">Choose <b>all_epitopes.aggregated.tsv</b> file</p>

      <input type="file" accept=".tsv" @change="handleFile1Change" />
    </section>

    <section v-if="mode === 'one'" class="step">
      <h2>3. Upload Neoantigen Metrics file</h2>
      <p class="comment">Choose <b>all_epitopes.aggregated.metrics.json</b> file</p>

      <input type="file" accept=".json" @change="handleFile2Change" />
    </section>

    <!-- SCENARIO 2: COHORT -->
    <section v-if="mode === 'cohort'" class="step">
      <h2>2. Upload final Aggregated Report</h2>
      <p class="comment">
        It is a <b>tsv file</b> containing information of all patients including TMB data.
      </p>

      <input type="file" accept=".tsv" @change="file1 = $event.target.files[0]" />
    </section>

    <!-- RUN BUTTON -->
    <div class="run-container">
      <RouterLink to="/dashboard" class="run-btn">RUN →</RouterLink>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useDataStore } from '@/stores/dataStore'

const store = useDataStore()

function handleFile1Change(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0] ?? null
  file1.value = file
  if (file) store.oneAggregatedTsv = file
}

function handleFile2Change(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0] ?? null
  file2.value = file
  if (file) store.oneMetricsJson = file
}

const mode = ref<'one' | 'cohort' | null>(null)
const file1 = ref<File | null>(null)
const file2 = ref<File | null>(null)
</script>

<style scoped>
.explore-page {
  max-width: 800px;
  margin: auto;
  padding: 2rem;
}

.step {
  margin: 2rem 0;
  padding: 1.5rem;
  background: #f3f4f6;
  border-radius: 12px;
}

.mode-buttons {
  display: flex;
  gap: 1rem;
}

.mode-buttons button {
  padding: 0.8rem 1.6rem;
  border: none;
  border-radius: 10px;
  background: #e2e8f0;
  cursor: pointer;
  font-size: 1rem;
  transition: 0.2s;
}

.mode-buttons button.active {
  background: #3b82f6;
  color: white;
  transform: translateY(-2px);
}

.comment {
  font-size: 0.9rem;
  color: #555;
}

.run-container {
  text-align: center;
  margin-top: 3rem;
}

.run-btn {
  display: inline-block;
  background: #10b981;
  padding: 1rem 2rem;
  color: white;
  border-radius: 12px;
  text-decoration: none;
  font-size: 1.2rem;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  transition: 0.2s;
}

.run-btn:hover {
  background: #059669;
  transform: translateY(-3px);
}
</style>