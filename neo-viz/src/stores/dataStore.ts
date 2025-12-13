import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useDataStore = defineStore('DataStore', () => {
  const oneAggregatedTsv = ref<File | null>(null)
  const oneMetricsJson = ref<File | null>(null)
  const tsvFile = ref<File | null>(null)

  return {
    oneAggregatedTsv,
    oneMetricsJson,
    tsvFile,
  }
})
