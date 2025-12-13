<template>
  <div class="p-8 max-w-6xl mx-auto">
    <h1 class="text-3xl font-bold mb-6">Cohort Data Overview</h1>
    
    <!-- Таблица с прокруткой -->
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
                col === 'Tier' ? getTierColorClass(row[col]) : '',
                col === 'Review' ? 'review-cell' : ''
              ]"
              @click="col === 'Review' ? toggleReview(getGlobalRowIndex(row)) : null"
            >
              <span v-if="col === 'Review'" class="review-checkbox">
                <span v-if="isRowReviewed(getGlobalRowIndex(row))">✓</span>
              </span>
              <span v-else>{{ row[col] }}</span>
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

// Сортировка
const sortColumn = ref<string | null>(null)
const sortDirection = ref<'asc' | 'desc'>('asc')

// Review состояние - храним индексы отмеченных строк
const reviewedRows = ref<Set<number>>(new Set())

onMounted(async () => {
  if (!store.tsvFile) {
    console.error("No tsv file found!")
    return
  }

  const text = await store.tsvFile.text()
  const lines = text.split('\n').filter(l => l.trim() !== "")
  const headers = lines[0].split('\t')

  // Исходная структура: ID, Pass, Subclonal, LowExpr, NoExpr, Poor, MSIpro, TMB, MSI type, MSI score
  displayedColumns.value = [...headers, 'total', 'bestNeoantigens', 'Review']

  // Индексы колонок для вычислений
  const passIdx = headers.indexOf('Pass')
  const subclonalIdx = headers.indexOf('Subclonal')
  const lowExprIdx = headers.indexOf('LowExpr')
  const noExprIdx = headers.indexOf('NoExpr')
  const poorIdx = headers.indexOf('Poor')

  // Создаём массив объектов строк с вычисленными колонками
  allRows.value = lines.slice(1).map(line => {
    const cells = line.split('\t')
    const obj: Record<string,string> = {}

    // Добавляем все исходные колонки
    headers.forEach((header, idx) => {
      obj[header] = cells[idx] || ''
    })

    // Вычисляем total - сумма по Pass, Subclonal, LowExpr, NoExpr, Poor
    const passVal = parseInt(cells[passIdx] || '0', 10)
    const subclonalVal = parseInt(cells[subclonalIdx] || '0', 10)
    const lowExprVal = parseInt(cells[lowExprIdx] || '0', 10)
    const noExprVal = parseInt(cells[noExprIdx] || '0', 10)
    const poorVal = parseInt(cells[poorIdx] || '0', 10)

    obj['total'] = String(passVal + subclonalVal + lowExprVal + noExprVal + poorVal)

    // Вычисляем bestNeoantigens - сумма Pass + Subclonal
    obj['bestNeoantigens'] = String(passVal + subclonalVal)

    return obj
  })
})

// Фильтрация и сортировка
const filteredRows = computed(() => {
  let rows = [...allRows.value]

  // Применяем сортировку
  if (sortColumn.value) {
    rows = rows.sort((a, b) => {
      const aVal = a[sortColumn.value!] || ''
      const bVal = b[sortColumn.value!] || ''

      // Пробуем преобразовать в числа для численной сортировки
      const aNum = parseFloat(aVal.replace(',', '.'))
      const bNum = parseFloat(bVal.replace(',', '.'))

      let comparison = 0
      if (!isNaN(aNum) && !isNaN(bNum)) {
        // Численная сортировка
        comparison = aNum - bNum
      } else {
        // Алфавитная сортировка
        comparison = aVal.localeCompare(bVal)
      }

      return sortDirection.value === 'asc' ? comparison : -comparison
    })
  }

  return rows
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

// Определяем узкие колонки для компактного отображения
function getNarrowColumnClass(columnName: string) {
  const narrowColumns = ['Pass', 'Subclonal', 'LowExpr', 'NoExpr', 'Poor', 'total', 'bestNeoantigens']
  return narrowColumns.includes(columnName) ? 'narrow-column' : ''
}

// Проверяем, должна ли колонка иметь сортировку
function isSortableColumn(columnName: string) {
  const nonSortableColumns = ['Review']
  return !nonSortableColumns.includes(columnName)
}

// Обработка клика по кнопке сортировки
function handleSort(columnName: string) {
  if (!isSortableColumn(columnName)) return

  if (sortColumn.value === columnName) {
    // Переключаем направление
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    // Новая колонка - сортируем по возрастанию
    sortColumn.value = columnName
    sortDirection.value = 'asc'
  }

  // Сбрасываем на первую страницу при сортировке
  page.value = 1
}

// Получение CSS класса для значения Tier
function getTierColorClass(tierName: string) {
  if (tierName === 'Pass' || tierName === 'Subclonal') return 'tier-green'
  if (tierName === 'LowExpr' || tierName === 'NoExpr') return 'tier-yellow'
  if (tierName === 'Poor') return 'tier-red'
  return ''
}

// Переключение Review флажка
function toggleReview(rowIndex: number) {
  if (reviewedRows.value.has(rowIndex)) {
    reviewedRows.value.delete(rowIndex)
  } else {
    reviewedRows.value.add(rowIndex)
  }
}

// Проверка, отмечена ли строка
function isRowReviewed(rowIndex: number) {
  return reviewedRows.value.has(rowIndex)
}

// Получение глобального индекса строки (не индекс в видимых строках)
function getGlobalRowIndex(row: Record<string, string>) {
  return allRows.value.indexOf(row)
}
</script>

<style scoped>
/* Фильтр и Binding Filter кнопка */
.filter-section {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  align-items: center;
}

.filter-input-text {
  flex: 1;
  border: 2px solid #d1d5db;
  padding: 0.5rem;
  border-radius: 6px;
  font-size: 0.95rem;
}

.filter-input-text:focus {
  outline: none;
  border-color: #3b82f6;
}

.binding-filter-btn {
  padding: 0.5rem 1.5rem;
  border: 2px solid #3b82f6;
  border-radius: 6px;
  background-color: white;
  color: #3b82f6;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.binding-filter-btn:hover {
  background-color: #eff6ff;
}

.binding-filter-btn.active {
  background-color: #3b82f6;
  color: white;
}

/* Топ-5 неоантигенов */
.top5-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 2rem;
  padding: 1.5rem;
  border: 3px solid #059669;
  border-radius: 8px;
  background-color: #d1fae5;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.top5-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #065f46;
  margin-bottom: 1rem;
  text-align: center;
}

.top5-table {
  width: 100%;
  border-collapse: collapse;
}

.top5-header {
  padding: 0.75rem 1rem;
  background-color: #059669;
  color: white;
  font-weight: 600;
  text-align: left;
  border-bottom: 2px solid #047857;
}

.top5-row:nth-child(even) {
  background-color: #ffffff;
}

.top5-row:nth-child(odd) {
  background-color: #ecfdf5;
}

.top5-row:hover {
  background-color: #a7f3d0;
}

.top5-cell {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #6ee7b7;
}

.rank-cell {
  font-weight: 700;
  color: #065f46;
  text-align: center;
  width: 80px;
  font-size: 1.1rem;
}

.peptide-cell {
  color: #047857;
  font-family: monospace;
  font-size: 0.95rem;
  font-weight: 500;
}

.value-cell {
  color: #065f46;
  font-weight: 600;
  text-align: center;
}

/* Таблица */
.table-container {
  overflow-x: auto;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  max-width: 100%;
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

/* Полосатые строки - чередование белого и светло-голубого */
.table-row:nth-child(even) {
  background-color: #eff6ff;
}

.table-row:nth-child(odd) {
  background-color: #ffffff;
}

.table-row:hover {
  background-color: #dbeafe;
}

/* Выделение топ-5 строк */
.table-row.top5-highlight {
  background-color: #d1fae5 !important;
  border-left: 4px solid #059669;
  font-weight: 500;
}

.table-row.top5-highlight:hover {
  background-color: #a7f3d0 !important;
}

/* Узкие колонки - каждое слово на новой строке */
.narrow-column {
  max-width: 80px;
  min-width: 80px;
  white-space: normal;
  word-break: break-word;
  hyphens: auto;
}

/* Цветовая кодировка для Tier */
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

/* Review колонка */
.review-cell {
  cursor: pointer;
  text-align: center;
  min-width: 80px;
  max-width: 80px;
  user-select: none;
}

.review-cell:hover {
  background-color: #dbeafe !important;
}

.review-checkbox {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 2px solid #3b82f6;
  border-radius: 4px;
  background-color: white;
  font-size: 1.2rem;
  color: #2563eb;
  font-weight: bold;
  transition: all 0.2s;
}

.review-checkbox:empty {
  background-color: #f3f4f6;
}

.review-cell:hover .review-checkbox {
  border-color: #1d4ed8;
  transform: scale(1.1);
}

/* Контейнер для всех карточек */
.cards-container {
  margin-bottom: 2rem;
}

/* Ряд: три карточки */
.cards-row {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 2rem;
  align-items: flex-start;
}

/* Общие стили для всех карточек */
.info-card,
.burden-card,
.default-filters-card {
  padding: 1.5rem;
  border: 3px solid #2563eb;
  border-radius: 8px;
  background-color: #dbeafe;
  flex: 1;
}

.card-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #1e3a8a;
  margin-bottom: 1rem;
  text-align: center;
  border-bottom: 2px solid #2563eb;
  padding-bottom: 0.5rem;
}

/* Sample's Info Card */
.info-content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  font-size: 0.9rem;
}

.info-item.alleles-section {
  flex-direction: column;
  gap: 0.5rem;
}

.info-label {
  font-weight: 600;
  color: #1e40af;
}

.info-value {
  color: #1e3a8a;
}

.alleles-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding-left: 0.5rem;
}

.allele-item {
  color: #1e3a8a;
  font-size: 0.85rem;
}

.binding-threshold {
  color: #059669;
  font-weight: 600;
  margin-left: 0.25rem;
}

/* Neoantigen Burden Card */
.burden-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: center;
}

.burden-item {
  font-size: 1rem;
  font-weight: 500;
  color: #1e40af;
}

/* Filters Card */
.filters-content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.filter-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.filter-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #1e40af;
}

.filter-input {
  padding: 0.4rem;
  border: 2px solid #3b82f6;
  border-radius: 4px;
  font-size: 0.9rem;
  background-color: white;
  color: #1e3a8a;
}

.filter-input:focus {
  outline: none;
  border-color: #1d4ed8;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* Барплоты Allele vs Tier */
.barplot-section {
  margin-top: 3rem;
  padding: 2rem;
  border: 3px solid #6366f1;
  border-radius: 8px;
  background-color: #f5f3ff;
}

.barplot-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #4338ca;
  margin-bottom: 1.5rem;
  text-align: center;
}

.barplot-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.barplot-item {
  display: grid;
  grid-template-columns: 150px 1fr 100px;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  background-color: white;
  border-radius: 6px;
  border: 1px solid #c7d2fe;
}

.barplot-label {
  font-weight: 600;
  color: #4338ca;
  font-size: 0.9rem;
  text-align: right;
  padding-right: 0.5rem;
}

.barplot-bars {
  display: flex;
  height: 40px;
  background-color: #e0e7ff;
  border-radius: 4px;
  overflow: hidden;
}

.bar {
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 0.85rem;
  transition: all 0.3s;
  cursor: pointer;
  min-width: 30px;
}

.bar:hover {
  opacity: 0.8;
  transform: scaleY(1.05);
}

.bar-value {
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

/* Цвета для каждого Tier - совпадают с цветами в таблице */
.bar-pass {
  background-color: #16a34a;
}

.bar-subclonal {
  background-color: #22c55e;
}

.bar-lowexpr {
  background-color: #eab308;
}

.bar-noexpr {
  background-color: #f59e0b;
}

.bar-poor {
  background-color: #dc2626;
}

.barplot-total {
  font-weight: 600;
  color: #4338ca;
  text-align: center;
}

/* Легенда */
.barplot-legend {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 2px solid #c7d2fe;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.legend-color {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 1px solid #4338ca;
}
</style>
