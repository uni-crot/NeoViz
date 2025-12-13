<template>
  <div class="p-8 max-w-6xl mx-auto">
    <h1 class="text-3xl font-bold mb-6">Cohort Data Overview</h1>

    <!-- Переключатель Table / Charts - слева -->
    <div class="view-toggle mb-6">
      <button
        @click="currentView = 'table'"
        :class="['toggle-btn', { active: currentView === 'table' }]"
      >
        📊 Table View
      </button>
      <button
        @click="currentView = 'charts'"
        :class="['toggle-btn', { active: currentView === 'charts' }]"
      >
        📈 Charts View
      </button>
    </div>

    <!-- TABLE VIEW -->
    <div v-if="currentView === 'table'">
      <!-- Таблица с прокруткой в своем окне -->
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th
                v-for="col in displayedColumns"
                :key="col"
                :class="['table-header', getNarrowColumnClass(col)]"
              >
                <div class="header-content">
                  <span>{{ col }}</span>
                  <button
                    v-if="isSortableColumn(col)"
                    @click="handleSort(col)"
                    class="sort-button"
                    :class="{ active: sortColumn === col }"
                  >
                    <span v-if="sortColumn === col && sortDirection === 'asc'">▲</span>
                    <span v-else-if="sortColumn === col && sortDirection === 'desc'">▼</span>
                    <span v-else>⇅</span>
                  </button>
                </div>
              </th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="(row, index) in visibleRows"
              :key="index"
              :class="['table-row']"
            >
              <td
                v-for="col in displayedColumns"
                :key="col"
                :class="[
                  'table-cell',
                  getNarrowColumnClass(col),
                  ['Pass', 'Subclonal', 'LowExpr', 'NoExpr', 'Poor'].includes(col) ? getTierColorClass(col) : ''
                ]"
              >
                <span>{{ row[col] }}</span>
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

    <!-- CHARTS VIEW -->
    <div v-if="currentView === 'charts'" class="charts-container">

      <!-- График 1: Total vs MSI Type -->
      <div class="chart-card">
        <h3 class="chart-title">Total Neoantigens vs MSI Type</h3>
        <div class="chart-content">
          <canvas ref="chartTotalMSIType"></canvas>
        </div>
      </div>

      <!-- График 2: Total vs MSI Score -->
      <div class="chart-card">
        <h3 class="chart-title">Total Neoantigens vs MSI Score</h3>
        <div class="chart-content">
          <canvas ref="chartTotalMSIScore"></canvas>
        </div>
      </div>

      <!-- График 3: Best Neoantigens vs MSI Type -->
      <div class="chart-card">
        <h3 class="chart-title">Best Neoantigens vs MSI Type</h3>
        <div class="chart-content">
          <canvas ref="chartBestMSIType"></canvas>
        </div>
      </div>

      <!-- График 4: Best Neoantigens vs MSI Score -->
      <div class="chart-card">
        <h3 class="chart-title">Best Neoantigens vs MSI Score</h3>
        <div class="chart-content">
          <canvas ref="chartBestMSIScore"></canvas>
        </div>
      </div>

      <!-- График 5: Total vs TMB -->
      <div class="chart-card">
        <h3 class="chart-title">Total Neoantigens vs TMB</h3>
        <div class="chart-content">
          <canvas ref="chartTotalTMB"></canvas>
        </div>
      </div>

    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useDataStore } from '@/stores/dataStore'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

const store = useDataStore()

const allRows = ref<Array<Record<string,string>>>([])
const displayedColumns = ref<string[]>([])
const rowsPerPage = ref(25)
const page = ref(1)
const currentView = ref<'table' | 'charts'>('table')

// Сортировка
const sortColumn = ref<string | null>(null)
const sortDirection = ref<'asc' | 'desc'>('asc')

// Refs для canvas элементов
const chartTotalMSIType = ref<HTMLCanvasElement | null>(null)
const chartTotalMSIScore = ref<HTMLCanvasElement | null>(null)
const chartBestMSIType = ref<HTMLCanvasElement | null>(null)
const chartBestMSIScore = ref<HTMLCanvasElement | null>(null)
const chartTotalTMB = ref<HTMLCanvasElement | null>(null)

// Хранилище для Chart.js инстансов
let charts: Record<string, Chart> = {}

onMounted(async () => {
  if (!store.tsvFile) {
    console.error("No tsv file found!")
    return
  }

  const text = await store.tsvFile.text()
  const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim() !== "")
  const headers = lines[0].split('\t')

  // Находим индексы для вставки колонок total и bestNeoantigens между Poor и MSIpro
  const poorIdx = headers.indexOf('Poor')

  // Создаем новый массив колонок с вставкой total и bestNeoantigens после Poor
  const newHeaders = [...headers]
  newHeaders.splice(poorIdx + 1, 0, 'total', 'bestNeoantigens')
  displayedColumns.value = newHeaders

  const passIdx = headers.indexOf('Pass')
  const subclonalIdx = headers.indexOf('Subclonal')
  const lowExprIdx = headers.indexOf('LowExpr')
  const noExprIdx = headers.indexOf('NoExpr')
  const poorColIdx = headers.indexOf('Poor')

  allRows.value = lines.slice(1).map(line => {
    const cells = line.split('\t')
    const obj: Record<string,string> = {}

    headers.forEach((header, idx) => {
      obj[header] = (cells[idx] || '').trim()
    })

    const passVal = parseInt(cells[passIdx] || '0', 10)
    const subclonalVal = parseInt(cells[subclonalIdx] || '0', 10)
    const lowExprVal = parseInt(cells[lowExprIdx] || '0', 10)
    const noExprVal = parseInt(cells[noExprIdx] || '0', 10)
    const poorVal = parseInt(cells[poorColIdx] || '0', 10)

    obj['total'] = String(passVal + subclonalVal + lowExprVal + noExprVal + poorVal)
    obj['bestNeoantigens'] = String(passVal + subclonalVal)

    return obj
  })
})

// Watch для создания графиков при переключении на charts view
watch(currentView, async (newView) => {
  if (newView === 'charts') {
    await nextTick()
    createCharts()
  }
})

function createCharts() {
  // Уничтожаем старые графики если они есть
  Object.values(charts).forEach(chart => chart.destroy())
  charts = {}

  // 1. Total vs MSI Type (Bar chart с средними значениями)
  if (chartTotalMSIType.value) {
    const msiGroups = groupByMSIType('total')
    charts.totalMSIType = new Chart(chartTotalMSIType.value, {
      type: 'bar',
      data: {
        labels: Object.keys(msiGroups),
        datasets: [{
          label: 'Average Total Neoantigens',
          data: Object.values(msiGroups).map(vals => average(vals)),
          backgroundColor: ['#3b82f6', '#ef4444', '#10b981'],
          borderColor: ['#1d4ed8', '#dc2626', '#059669'],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false },
          title: { display: false }
        },
        scales: {
          y: { beginAtZero: true, title: { display: true, text: 'Total Neoantigens' } },
          x: { title: { display: true, text: 'MSI Type' } }
        }
      }
    })
  }

  // 2. Total vs MSI Score (Bar chart)
  if (chartTotalMSIScore.value) {
    const msiScoreGroups = groupByMSIScore('total')
    charts.totalMSIScore = new Chart(chartTotalMSIScore.value, {
      type: 'bar',
      data: {
        labels: Object.keys(msiScoreGroups),
        datasets: [{
          label: 'Average Total Neoantigens',
          data: Object.values(msiScoreGroups).map(vals => average(vals)),
          backgroundColor: ['#8b5cf6', '#f59e0b', '#ec4899'],
          borderColor: ['#6d28d9', '#d97706', '#db2777'],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false },
          title: { display: false }
        },
        scales: {
          y: { beginAtZero: true, title: { display: true, text: 'Total Neoantigens' } },
          x: { title: { display: true, text: 'MSI Score' } }
        }
      }
    })
  }

  // 3. Best Neoantigens vs MSI Type
  if (chartBestMSIType.value) {
    const msiGroups = groupByMSIType('bestNeoantigens')
    charts.bestMSIType = new Chart(chartBestMSIType.value, {
      type: 'bar',
      data: {
        labels: Object.keys(msiGroups),
        datasets: [{
          label: 'Average Best Neoantigens',
          data: Object.values(msiGroups).map(vals => average(vals)),
          backgroundColor: ['#3b82f6', '#ef4444', '#10b981'],
          borderColor: ['#1d4ed8', '#dc2626', '#059669'],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false },
          title: { display: false }
        },
        scales: {
          y: { beginAtZero: true, title: { display: true, text: 'Best Neoantigens' } },
          x: { title: { display: true, text: 'MSI Type' } }
        }
      }
    })
  }

  // 4. Best Neoantigens vs MSI Score
  if (chartBestMSIScore.value) {
    const msiScoreGroups = groupByMSIScore('bestNeoantigens')
    charts.bestMSIScore = new Chart(chartBestMSIScore.value, {
      type: 'bar',
      data: {
        labels: Object.keys(msiScoreGroups),
        datasets: [{
          label: 'Average Best Neoantigens',
          data: Object.values(msiScoreGroups).map(vals => average(vals)),
          backgroundColor: ['#8b5cf6', '#f59e0b', '#ec4899'],
          borderColor: ['#6d28d9', '#d97706', '#db2777'],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false },
          title: { display: false }
        },
        scales: {
          y: { beginAtZero: true, title: { display: true, text: 'Best Neoantigens' } },
          x: { title: { display: true, text: 'MSI Score' } }
        }
      }
    })
  }

  // 5. Total vs TMB (Scatter plot)
  if (chartTotalTMB.value) {
    const scatterData = allRows.value
      .filter(row => row['TMB'] && row['total'])
      .map(row => ({
        x: parseFloat(row['TMB'].replace(',', '.')),
        y: parseInt(row['total'], 10)
      }))
      .filter(point => !isNaN(point.x) && !isNaN(point.y))
      .sort((a, b) => a.x - b.x)

    charts.totalTMB = new Chart(chartTotalTMB.value, {
      type: 'scatter',
      data: {
        datasets: [{
          label: 'Total vs TMB',
          data: scatterData,
          backgroundColor: '#3b82f6',
          borderColor: '#1d4ed8',
          pointRadius: 6,
          pointHoverRadius: 8,
          showLine: true,
          borderWidth: 2,
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false },
          title: { display: false }
        },
        scales: {
          x: { 
            title: { display: true, text: 'TMB (Tumor Mutational Burden)' },
            type: 'linear'
          },
          y: { 
            beginAtZero: true,
            title: { display: true, text: 'Total Neoantigens' }
          }
        }
      }
    })
  }
}

// Вспомогательные функции для группировки данных
function groupByMSIType(field: string): Record<string, number[]> {
  const groups: Record<string, number[]> = {}

  allRows.value.forEach(row => {
    const msiType = row['MSI type'] || 'Unknown'
    const value = parseInt(row[field], 10)

    if (!isNaN(value)) {
      if (!groups[msiType]) groups[msiType] = []
      groups[msiType].push(value)
    }
  })

  return groups
}

function groupByMSIScore(field: string): Record<string, number[]> {
  const groups: Record<string, number[]> = {}

  allRows.value.forEach(row => {
    const msiScore = (row['MSI score'] || 'Unknown').trim()
    const value = parseInt(row[field], 10)

    if (!isNaN(value)) {
      if (!groups[msiScore]) groups[msiScore] = []
      groups[msiScore].push(value)
    }
  })

  return groups
}

function average(numbers: number[]): number {
  if (numbers.length === 0) return 0
  return numbers.reduce((sum, n) => sum + n, 0) / numbers.length
}

// Фильтрация и сортировка
const filteredRows = computed(() => {
  let rows = [...allRows.value]

  if (sortColumn.value) {
    rows = rows.sort((a, b) => {
      const aVal = a[sortColumn.value!] || ''
      const bVal = b[sortColumn.value!] || ''

      const aNum = parseFloat(aVal.replace(',', '.'))
      const bNum = parseFloat(bVal.replace(',', '.'))

      let comparison = 0
      if (!isNaN(aNum) && !isNaN(bNum)) {
        comparison = aNum - bNum
      } else {
        comparison = aVal.localeCompare(bVal)
      }

      return sortDirection.value === 'asc' ? comparison : -comparison
    })
  }

  return rows
})

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

function getNarrowColumnClass(columnName: string) {
  const narrowColumns = ['Pass', 'Subclonal', 'LowExpr', 'NoExpr', 'Poor', 'total', 'bestNeoantigens']
  return narrowColumns.includes(columnName) ? 'narrow-column' : ''
}

function isSortableColumn(columnName: string) {
  return true
}

function handleSort(columnName: string) {
  if (sortColumn.value === columnName) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortColumn.value = columnName
    sortDirection.value = 'asc'
  }
  page.value = 1
}

function getTierColorClass(tierName: string) {
  if (tierName === 'Pass' || tierName === 'Subclonal') return 'tier-green'
  if (tierName === 'LowExpr' || tierName === 'NoExpr') return 'tier-yellow'
  if (tierName === 'Poor') return 'tier-red'
  return ''
}
</script>

<style scoped>
/* Переключатель View - слева */
.view-toggle {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.toggle-btn {
  padding: 0.75rem 2rem;
  border: 2px solid #3b82f6;
  border-radius: 8px;
  background-color: white;
  color: #3b82f6;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s;
}

.toggle-btn:hover {
  background-color: #eff6ff;
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.toggle-btn.active {
  background-color: #3b82f6;
  color: white;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

/* Charts Container */
.charts-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
  gap: 2rem;
}

.chart-card {
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  transition: all 0.3s;
}

.chart-card:hover {
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
  transform: translateY(-4px);
}

.chart-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1e3a8a;
  margin-bottom: 1rem;
  text-align: center;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid #3b82f6;
}

.chart-content {
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chart-content canvas {
  max-height: 100%;
}

/* Таблица */
.table-container {
  overflow-x: auto;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  max-width: 100%;
  max-height: 600px;
  position: relative;
}

.data-table {
  width: max-content;
  min-width: 100%;
  font-size: 0.875rem;
  border-collapse: collapse;
}

.table-header {
  padding: 0.75rem 1rem;
  text-align: left;
  font-weight: 600;
  background-color: #f3f4f6;
  border-bottom: 2px solid #d1d5db;
  white-space: nowrap;
  min-width: 120px;
  position: sticky;
  top: 0;
  z-index: 10;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  justify-content: space-between;
}

.sort-button {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.75rem;
  color: #9ca3af;
  padding: 0.2rem;
  display: flex;
  align-items: center;
  transition: color 0.2s;
  flex-shrink: 0;
}

.sort-button:hover {
  color: #4b5563;
}

.sort-button.active {
  color: #2563eb;
  font-weight: bold;
}

.table-cell {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e5e7eb;
  white-space: nowrap;
  min-width: 120px;
}

.table-row:nth-child(even) {
  background-color: #eff6ff;
}

.table-row:nth-child(odd) {
  background-color: #ffffff;
}

.table-row:hover {
  background-color: #dbeafe;
}

.narrow-column {
  max-width: 80px;
  min-width: 80px;
  white-space: normal;
  word-break: break-word;
  hyphens: auto;
  text-align: center;
}

.tier-green {
  background-color: #dcfce7;
  color: #166534;
  font-weight: 600;
}

.tier-yellow {
  background-color: #fef3c7;
  color: #92400e;
  font-weight: 600;
}

.tier-red {
  background-color: #fee2e2;
  color: #991b1b;
  font-weight: 600;
}
</style>