<template>
  <div class="p-8 max-w-6xl mx-auto">
    <h1 class="text-3xl font-bold mb-6">Patient Data Overview</h1>

    <!-- Neoantigen Burden Card -->
    <div class="burden-card-wrapper">
      <div class="burden-card">
        <h2 class="burden-title">Neoantigen Burden</h2>
        <div class="burden-content">
          <div v-for="(count, tier) in tierCounts" :key="tier" class="burden-item">
            {{ tier }}: {{ count }}
          </div>
        </div>
      </div>
    </div>

    <!-- Фильтр -->
    <input
      v-model="filter"
      type="text"
      placeholder="Filter table..."
      class="border p-2 mb-4 w-full"
    />

    <!-- Таблица с прокруткой -->
    <div class="overflow-x-auto border rounded-lg">
      <table class="min-w-full text-sm">
        <thead class="bg-gray-100 sticky top-0">
          <tr>
            <th
              v-for="col in displayedColumns"
              :key="col"
              class="px-4 py-2 text-left font-semibold border-b break-words"
              style="max-width: 150px;"
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
              class="px-4 py-2 break-words"
              style="max-width: 150px;"
            >
              {{ row[col] }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Пагинация -->
    <div class="mt-4 flex justify-between items-center">
      <button
        @click="prevPage"
        :disabled="page === 1"
        class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
      >
        ← Prev
      </button>
      <span>Page {{ page }} of {{ totalPages }}</span>
      <button
        @click="nextPage"
        :disabled="page === totalPages"
        class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
      >
        Next →
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useDataStore } from '@/stores/dataStore'

const store = useDataStore()

const allRows = ref<Array<Record<string,string>>>([])
const displayedColumns = ref<string[]>([])
const rowsPerPage = ref(25)
const page = ref(1)
const filter = ref('')

onMounted(async () => {
  if (!store.oneAggregatedTsv) {
    console.error("No aggregated TSV file found!")
    return
  }

  const text = await store.oneAggregatedTsv.text()
  const lines = text.split('\n').filter(l => l.trim() !== "")

  const headers = lines[0].split('\t')

  // Убираем лишние колонки: 1–8, 11, 13, 30 (0-indexed)
  const keepIndices = headers.map((_, i) => i)
    .filter(i => i < 8 === false && i !== 10 && i !== 12 && i !== 29)

  // Создаём отображаемые названия колонок
  displayedColumns.value = keepIndices.map(i => headers[i])

  // Находим индексы нужных колонок по их названиям в исходном TSV
  const ic50MtIndex = headers.indexOf('IC50 MT')
  const ic50WtIndex = headers.indexOf('IC50 WT')

  // Находим позицию колонки IC50 WT в отображаемых колонках
  const ic50WtDisplayIndex = displayedColumns.value.indexOf('IC50 WT')

  // Создаём массив объектов строк и добавляем колонку FC MT/WT
  allRows.value = lines.slice(1).map(line => {
    const cells = line.split('\t')
    const obj: Record<string,string> = {}

    // добавляем только выбранные колонки
    keepIndices.forEach((i, idx) => {
      obj[displayedColumns.value[idx]] = cells[i]
    })

    // вычисляем FC MT/WT как IC50 MT / IC50 WT
    const ic50MtValue = parseFloat(cells[ic50MtIndex] || '0')
    const ic50WtValue = parseFloat(cells[ic50WtIndex] || '1')
    const fc = ic50WtValue !== 0 ? (ic50MtValue / ic50WtValue).toFixed(2) : '0'

    // создаём новый объект с FC MT/WT после колонки IC50 WT
    const newObj: Record<string,string> = {}
    displayedColumns.value.forEach((col, idx) => {
      newObj[col] = obj[col]
      // Вставляем FC MT/WT после колонки IC50 WT
      if (idx === ic50WtDisplayIndex) {
        newObj['FC MT/WT'] = fc
      }
    })

    return newObj
  })

  // вставляем название колонки FC MT/WT после колонки IC50 WT
  displayedColumns.value.splice(ic50WtDisplayIndex + 1, 0, 'FC MT/WT')
})

// Фильтрация по всем колонкам
const filteredRows = computed(() =>
  allRows.value.filter(row =>
    displayedColumns.value.some(col =>
      row[col]?.toLowerCase().includes(filter.value.toLowerCase())
    )
  )
)

// Подсчёт наблюдений по Tier (динамически обновляется при фильтрации)
const tierCounts = computed(() => {
  const counts: Record<string, number> = {}
  // Используем filteredRows для динамического обновления
  filteredRows.value.forEach(row => {
    const tier = row['Tier'] || 'Unknown'
    counts[tier] = (counts[tier] || 0) + 1
  })

  // Определённый порядок Tier
  const tierOrder = ['Pass', 'Subclonal', 'LowExpr', 'NoExpr', 'Poor']

  // Сортируем по заданному порядку
  const sorted: Record<string, number> = {}
  tierOrder.forEach(tier => {
    if (counts[tier]) {
      sorted[tier] = counts[tier]
    }
  })

  // Добавляем любые другие значения, которых нет в списке
  Object.keys(counts).forEach(tier => {
    if (!tierOrder.includes(tier)) {
      sorted[tier] = counts[tier]
    }
  })

  return sorted
})

// Пагинация
const totalPages = computed(() => Math.ceil(filteredRows.value.length / rowsPerPage.value))
const visibleRows = computed(() => {
  const start = (page.value - 1) * rowsPerPage.value
  return filteredRows.value.slice(start, start + rowsPerPage.value)
})

function nextPage() {
  if (page.value < totalPages.value) page.value++
}

function prevPage() {
  if (page.value > 1) page.value--
}
</script>

<style scoped>
/* Автоматический перенос текста и ограничение ширины */
th, td {
  white-space: normal;
  word-break: break-word;
}

/* Neoantigen Burden Card */
.burden-card-wrapper {
  display: flex;
  justify-content: center;
  margin-bottom: 2rem;
}

.burden-card {
  padding: 1.5rem 2rem;
  border: 4px solid #2563eb;
  border-radius: 8px;
  background-color: #dbeafe;
  display: inline-block;
  text-align: center;
}

.burden-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e3a8a;
  margin-bottom: 1rem;
}

.burden-content {
  display: flex;
  gap: 2rem;
  justify-content: center;
}

.burden-item {
  font-size: 1.125rem;
  font-weight: 500;
  color: #1e40af;
}
</style>
