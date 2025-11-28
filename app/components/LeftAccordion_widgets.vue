<template>
  <div class="oj-widgets-root">
    <div class="oj-filter-row">
      <input
          v-model="filter"
          type="text"
          class="oj-filter-input"
          placeholder="Filter..."
      />
    </div>

    <div class="oj-accordion-scroll">
      <section
          v-for="cat in categories"
          :key="cat.id"
          class="oj-accordion-section"
      >
        <button
            class="oj-acc-header"
            :class="{ 'is-open': isOpen(cat.id) }"
            :style="{ backgroundColor: getCategoryColor(cat.id) }"
            @click="toggle(cat.id)"
        >
          <span class="oj-acc-cat-icon-wrap">
            <svg class="oj-acc-cat-icon" viewBox="0 0 16 16">

              <template v-if="cat.id === 'data'">
                 <rect x="2" y="2" width="12" height="12" rx="1" fill="none" stroke="currentColor" stroke-width="1.2"/>
                 <line x1="2" y1="6" x2="14" y2="6" stroke="currentColor" stroke-width="1.2"/>
                 <line x1="8" y1="6" x2="8" y2="14" stroke="currentColor" stroke-width="1.2"/>
              </template>

              <template v-else-if="cat.id === 'transform'">
                <path d="M8 2a6 6 0 1 0 0 12 6 6 0 0 0 0-12zm0 10.5a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z" fill="currentColor" opacity="0.2"/>
                <path d="M8 1.5a6.5 6.5 0 0 1 4.6 11.1l-1.1-1.1A5 5 0 1 0 5 8H3.5A6.5 6.5 0 0 1 8 1.5z" fill="currentColor"/>
                <path d="M11.5 10.5 13 13h-3z" fill="currentColor"/>
                <path d="M4.5 5.5 3 3h3z" fill="currentColor"/>
              </template>

              <template v-else-if="cat.id === 'visualize'">
                <path d="M2 14h12M2 14V2" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
                <circle cx="5" cy="10" r="1.5" fill="currentColor"/>
                <circle cx="9" cy="7" r="1.5" fill="currentColor"/>
                <circle cx="12" cy="4" r="1.5" fill="currentColor"/>
              </template>

              <template v-else-if="cat.id === 'model'">
                <rect x="6" y="1" width="4" height="4" rx="0.5" fill="none" stroke="currentColor" stroke-width="1.2"/>
                <rect x="1" y="10" width="4" height="4" rx="0.5" fill="none" stroke="currentColor" stroke-width="1.2"/>
                <rect x="11" y="10" width="4" height="4" rx="0.5" fill="none" stroke="currentColor" stroke-width="1.2"/>
                <path d="M8 5v2m0 0H3v3m5-3h8v3" fill="none" stroke="currentColor" stroke-width="1.2"/>
              </template>

              <template v-else-if="cat.id === 'evaluate'">
                <rect x="2" y="2" width="12" height="12" rx="1" fill="none" stroke="currentColor" stroke-width="1.2"/>
                <line x1="8" y1="2" x2="8" y2="14" stroke="currentColor" stroke-width="1.2"/>
                <line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" stroke-width="1.2"/>
                <path d="M3.5 5.5 5 7l3-3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="11" cy="11" r="1.2" fill="currentColor"/>
              </template>

              <template v-else-if="cat.id === 'unsupervised'">
                <circle cx="4" cy="5" r="1.5" fill="currentColor"/>
                <circle cx="7" cy="3" r="1.5" fill="currentColor"/>
                <circle cx="12" cy="6" r="1.5" fill="currentColor"/>
                <circle cx="5" cy="12" r="1.5" fill="currentColor"/>
                <circle cx="10" cy="11" r="1.5" fill="currentColor"/>
                <circle cx="13" cy="13" r="1.5" fill="currentColor"/>
              </template>

              <template v-else>
                 <circle cx="8" cy="8" r="3" fill="currentColor"/>
              </template>
            </svg>
          </span>

          <span class="oj-acc-label">{{ cat.label }}</span>
        </button>

        <div v-show="isOpen(cat.id)" class="oj-acc-body">
          <div class="oj-widgets-grid">
            <button
                v-for="w in filteredWidgets(cat)"
                :key="w.id"
                class="oj-widget-tile"
                :class="{ selected: isSelected(w) }"
                @click="selectWidget(cat.id, w)"
                @mouseenter="hoverWidget = { categoryId: cat.id, widget: w }"
                @mouseleave="hoverWidget = null"
            >
              <span class="oj-widget-icon-wrap">
                <img
                    :src="w.icon"
                    class="oj-widget-icon-img"
                    alt=""
                />
              </span>

              <span class="oj-widget-label">
                {{ w.label }}
              </span>
            </button>
          </div>
        </div>
      </section>
    </div>

    <div class="oj-desc-panel">
      <div class="oj-desc-title">
        {{ activeWidgetForDesc?.widget.label ?? '' }}
      </div>
      <div class="oj-desc-text">
        {{ getDescription(activeWidgetForDesc?.widget) }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { WIDGET_DEFINITIONS, type WidgetDefinition } from '@/utils/widgetDefinitions'

const CATEGORY_LABELS: Record<string, string> = {
  data: 'Data',
  transform: 'Transform',
  visualize: 'Visualize',
  model: 'Model',
  evaluate: 'Evaluate',
  unsupervised: 'Unsupervised'
}

const CATEGORY_ORDER = ['data', 'transform', 'visualize', 'model', 'evaluate', 'unsupervised']

const CATEGORY_COLORS: Record<string, string> = {
  data: '#FFDCA8',
  transform: '#FFCCBC',
  visualize: '#FFCDD2',
  model: '#E1BEE7',
  evaluate: '#B2DFDB',
  unsupervised: '#CFD8DC',
  other: '#F5F5F5'
}

interface WidgetCategory {
  id: string
  label: string
  widgets: WidgetDefinition[]
}

interface HoverWidgetState {
  categoryId: string
  widget: WidgetDefinition
}

const filter = ref('')

const categories = computed<WidgetCategory[]>(() => {
  const grouped: Record<string, WidgetDefinition[]> = {}

  Object.values(WIDGET_DEFINITIONS).forEach(widget => {
    const catId = widget.categoryId || 'other'

    if (!grouped[catId]) {
      grouped[catId] = []
    }
    grouped[catId].push(widget)
  })

  const result = Object.entries(grouped).map(([catId, widgets]) => {
    // priority 순으로 정렬
    const sortedWidgets = widgets.sort((a, b) => {
      const pA = a.priority ?? 9999
      const pB = b.priority ?? 9999

      if (pA !== pB) {
        return pA - pB
      }
      return a.label.localeCompare(b.label)
    })

    return {
      id: catId,
      label: CATEGORY_LABELS[catId] || catId.charAt(0).toUpperCase() + catId.slice(1),
      widgets: sortedWidgets
    }
  })

  // 카테고리 순서 정렬
  return result.sort((a, b) => {
    const idxA = CATEGORY_ORDER.indexOf(a.id)
    const idxB = CATEGORY_ORDER.indexOf(b.id)
    if (idxA !== -1 && idxB !== -1) return idxA - idxB
    if (idxA !== -1) return -1
    if (idxB !== -1) return 1
    return a.label.localeCompare(b.label)
  })
})

const openCategoryIds = ref<Set<string>>(
    new Set(['data', 'transform', 'visualize', 'model', 'evaluate', 'unsupervised'])
)

const isOpen = (id: string) => openCategoryIds.value.has(id)

const toggle = (id: string) => {
  const set = new Set(openCategoryIds.value)
  if (set.has(id)) set.delete(id)
  else set.add(id)
  openCategoryIds.value = set
}

const getCategoryColor = (id: string) => {
  return CATEGORY_COLORS[id] || CATEGORY_COLORS['other']
}

const filteredWidgets = (cat: WidgetCategory) => {
  const q = filter.value.trim().toLowerCase()
  if (!q) return cat.widgets
  return cat.widgets.filter(w => w.label.toLowerCase().includes(q))
}

const hoverWidget = ref<HoverWidgetState | null>(null)
const selectedWidget = ref<HoverWidgetState | null>(null)

const selectWidget = (categoryId: string, widget: WidgetDefinition) => {
  selectedWidget.value = { categoryId, widget }
}

const isSelected = (w: WidgetDefinition) =>
    selectedWidget.value?.widget.id === w.id

const activeWidgetForDesc = computed<HoverWidgetState | null>(() => {
  return hoverWidget.value || selectedWidget.value
})

const getDescription = (widget?: WidgetDefinition) => {
  if (!widget) return ''
  return `${widget.label} widget.`
}
</script>

<style scoped>
/* 기존 스타일 유지 */
.oj-widgets-root {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.oj-filter-row {
  padding: 6px;
  border-bottom: 1px solid #ddd;
}
.oj-filter-input {
  width: 100%;
  padding: 4px 8px;
  box-sizing: border-box;
  font-size: 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.oj-accordion-scroll {
  flex: 1;
  overflow-y: auto;
}

.oj-acc-header {
  width: 100%;
  display: flex;
  align-items: center;
  padding: 5px 8px;
  border: none;
  border-bottom: 1px solid rgba(0,0,0,0.05);
  cursor: pointer;
  text-align: left;
  transition: opacity 0.2s;
}
.oj-acc-header:hover {
  filter: brightness(0.95);
}

.oj-acc-cat-icon-wrap {
  width: 18px;
  height: 18px;
  margin-right: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #333;
}
.oj-acc-cat-icon {
  width: 100%;
  height: 100%;
}

.oj-acc-label {
  flex: 1;
  font-weight: 600;
  font-size: 13px;
  color: #333;
}

.oj-acc-body {
  background: #fff;
}

.oj-widgets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
  column-gap: 2px;
  row-gap: 6px;
  padding: 6px;
  align-items: start;
}

.oj-widget-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  text-align: center;

  width: 100%;
  min-height: 60px;

  padding: 4px 2px 2px 2px;
  box-sizing: border-box;

  background: white;
  border: 1px solid transparent;
  border-radius: 2px;
  cursor: pointer;
}

.oj-widget-tile:hover {
  background-color: #f0f0f0;
}
.oj-widget-tile.selected {
  background-color: #e3f2fd;
  border-color: #90caf9;
}

.oj-widget-icon-wrap {
  width: 30px;
  height: 30px;
  margin-bottom: 1px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.oj-widget-icon-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.oj-widget-label {
  font-size: 10px;
  color: #333;
  line-height: 1.15;
  letter-spacing: -0.3px;

  white-space: normal;
  word-break: keep-all;
  word-wrap: break-word;

  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.oj-desc-panel {
  border-top: 1px solid #ddd;
  padding: 8px;
  background: #fafafa;
  min-height: 40px;
}
.oj-desc-title {
  font-weight: bold;
  font-size: 12px;
  margin-bottom: 2px;
}
.oj-desc-text {
  font-size: 11px;
  color: #666;
}
</style>