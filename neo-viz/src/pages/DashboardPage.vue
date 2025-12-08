<template>
  <div class="p-8 max-w-5xl mx-auto">

    <h1 class="text-3xl font-bold mb-6">Patient Data Overview</h1>

    <!-- Таблица -->
    <div class="overflow-x-auto border rounded-lg">
      <table class="min-w-full text-sm">
        <thead class="bg-gray-100">
          <tr>
            <th
              v-for="col in displayedColumns"
              :key="col"
              class="px-4 py-2 text-left font-semibold border-b"
            >
              {{ col }}
            </th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="(row, index) in visibleRows"
            :key="index"
            class="border-b hover:bg-gray-50"
          >
            <td
              v-for="col in displayedColumns"
              :key="col"
              class="px-4 py-2"
            >
              {{ row[col] }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Показать ещё -->
    <div class="mt-6 flex justify-center">
      <button
        v-if="canLoadMore"
        @click="loadMore"
        class="px-6 py-3 bg-blue-500 text-white rounded-lg font-bold"
      >
        Show next 25 rows
      </button>
    </div>

  </div>
</template>


<script setup>
import { ref, computed, onMounted } from 'vue'
import { useDataStore } from '@/stores/dataStore'

const store = useDataStore()

const allRows = ref([])
const displayedColumns = ref([])
const rowsToShow = ref(25)

// Загружаем TSV и парсим
onMounted(async () => {
  if (!store.oneAggregatedTsv) {
    console.error("No aggregated TSV file found!")
    return
  }

  const text = await store.oneAggregatedTsv.text()
  const lines = text.split('\n').filter(l => l.trim() !== "")

  const headers = lines[0].split('\t')

  // берём только колонки начиная с 9-й
  displayedColumns.value = headers.slice(8)

  // создаём массив объектов
  allRows.value = lines.slice(1).map(line => {
    const cells = line.split('\t')
    const obj = {}

    displayedColumns.value.forEach((col, i) => {
      obj[col] = cells[i + 8]
    })

    return obj
  })
})

// сколько строк показываем
const visibleRows = computed(() =>
  allRows.value.slice(0, rowsToShow.value)
)

const canLoadMore = computed(() =>
  rowsToShow.value < allRows.value.length
)

function loadMore() {
  rowsToShow.value += 25
}
</script>

