<template>
  <div class="oj-widgets-root">
    <!-- 상단 필터 -->
    <div class="oj-filter-row">
      <input
          v-model="filter"
          type="text"
          class="oj-filter-input"
          placeholder="Filter..."
      />
    </div>

    <!-- 카테고리 아코디언 -->
    <div class="oj-accordion-scroll">
      <section
          v-for="cat in categories"
          :key="cat.id"
          class="oj-accordion-section"
      >
        <!-- 카테고리 헤더 -->
        <button
            class="oj-acc-header"
            :class="{ 'is-open': isOpen(cat.id) }"
            :style="{ backgroundColor: getCategoryColor(cat.id) }"
            @click="toggle(cat.id)"
        >
          <!-- 카테고리 아이콘 -->
          <span class="oj-acc-cat-icon-wrap">
            <svg class="oj-acc-cat-icon" viewBox="0 0 16 16">
              <!-- Data -->
              <template v-if="cat.id === 'data'">
                <rect
                    x="2"
                    y="2"
                    width="12"
                    height="12"
                    rx="1"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.2"
                />
                <line
                    x1="2"
                    y1="6"
                    x2="14"
                    y2="6"
                    stroke="currentColor"
                    stroke-width="1.2"
                />
                <line
                    x1="8"
                    y1="6"
                    x2="8"
                    y2="14"
                    stroke="currentColor"
                    stroke-width="1.2"
                />
              </template>

              <!-- Transform -->
              <template v-else-if="cat.id === 'transform'">
                <circle
                    cx="8"
                    cy="8"
                    r="5.5"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.2"
                />
                <path
                    d="M5 6h4V3.5L11.5 6 9 8.5V6"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                />
                <path
                    d="M11 10H7v2.5L4.5 10 7 7.5V10"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                />
              </template>

              <!-- Visualize -->
              <template v-else-if="cat.id === 'visualize'">
                <path
                    d="M2 14h12M2 14V2"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.2"
                    stroke-linecap="round"
                />
                <circle cx="5" cy="10" r="1.5" fill="currentColor" />
                <circle cx="9" cy="7" r="1.5" fill="currentColor" />
                <circle cx="12" cy="4" r="1.5" fill="currentColor" />
              </template>

              <!-- Model -->
              <template v-else-if="cat.id === 'model'">
                <rect
                    x="6"
                    y="1"
                    width="4"
                    height="4"
                    rx="0.5"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.2"
                />
                <rect
                    x="1"
                    y="10"
                    width="4"
                    height="4"
                    rx="0.5"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.2"
                />
                <rect
                    x="11"
                    y="10"
                    width="4"
                    height="4"
                    rx="0.5"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.2"
                />
                <path
                    d="M8 5v2M8 7H3v3m5-3h8v3"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.2"
                    stroke-linecap="round"
                />
              </template>

              <!-- Evaluate -->
              <template v-else-if="cat.id === 'evaluate'">
                <rect
                    x="2"
                    y="2"
                    width="12"
                    height="12"
                    rx="1"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.2"
                />
                <line
                    x1="8"
                    y1="2"
                    x2="8"
                    y2="14"
                    stroke="currentColor"
                    stroke-width="1.2"
                />
                <line
                    x1="2"
                    y1="8"
                    x2="14"
                    y2="8"
                    stroke="currentColor"
                    stroke-width="1.2"
                />
                <path
                    d="M3.5 5.5 5 7l3-3"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                />
                <circle cx="11" cy="11" r="1.3" fill="currentColor" />
              </template>

              <!-- Unsupervised -->
              <template v-else-if="cat.id === 'unsupervised'">
                <circle cx="4" cy="5" r="1.5" fill="currentColor" />
                <circle cx="7" cy="3" r="1.5" fill="currentColor" />
                <circle cx="12" cy="6" r="1.5" fill="currentColor" />
                <circle cx="5" cy="12" r="1.5" fill="currentColor" />
                <circle cx="10" cy="11" r="1.5" fill="currentColor" />
                <circle cx="13" cy="13" r="1.5" fill="currentColor" />
              </template>

              <!-- 기타 -->
              <template v-else>
                <circle cx="8" cy="8" r="3" fill="currentColor" />
              </template>
            </svg>
          </span>

          <span class="oj-acc-label">{{ cat.label }}</span>
        </button>

        <!-- 카테고리 안 위젯 리스트 -->
        <div v-show="isOpen(cat.id)" class="oj-acc-body">
          <div class="oj-widgets-grid">
            <button
                v-for="w in filteredWidgets(cat)"
                :key="w.id"
                class="oj-widget-tile"
                :class="{ selected: isSelected(w) }"
                @click="selectWidget(cat.id, w)"
                @mouseenter="onWidgetEnter(cat.id, w)"
                @mouseleave="onWidgetLeave"
            >
              <span class="oj-widget-icon-wrap">
                <img
                    :src="w.icon"
                    class="oj-widget-icon-img"
                    alt=""
                />
              </span>
              <span class="oj-widget-label">{{ w.label }}</span>
            </button>
          </div>
        </div>
      </section>
    </div>

    <!-- 하단 설명 영역 -->
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
import {
  WIDGET_DEFINITIONS,
  type WidgetDefinition,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  CATEGORY_COLORS,
} from '@/utils/widgetDefinitions'

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

/**
 * 열려 있는 카테고리 ID 집합
 * 기본값: CATEGORY_ORDER 전부 열어둠
 */
const openCategoryIds = ref<Set<string>>(new Set(CATEGORY_ORDER))

/**
 * WIDGET_DEFINITIONS 를 categoryId 기준으로 그룹핑 + 정렬
 */
const categories = computed<WidgetCategory[]>(() => {
  const grouped: Record<string, WidgetDefinition[]> = {}

  Object.values(WIDGET_DEFINITIONS).forEach((widget) => {
    const catId = widget.categoryId || 'other'
    if (!grouped[catId]) grouped[catId] = []
    grouped[catId]!.push(widget)
  })

  const result: WidgetCategory[] = Object.entries(grouped).map(
      ([catId, widgets]) => {
        // priority → label 순으로 정렬
        const sortedWidgets = widgets
            .slice()
            .sort((a, b) => {
              const pA = (a as any).priority ?? 9999
              const pB = (b as any).priority ?? 9999
              if (pA !== pB) return pA - pB
              return a.label.localeCompare(b.label)
            })

        return {
          id: catId,
          label: CATEGORY_LABELS[catId] ?? catId,
          widgets: sortedWidgets,
        }
      },
  )

  // CATEGORY_ORDER 순으로 카테고리 정렬
  result.sort((a, b) => {
    const idxA = CATEGORY_ORDER.indexOf(a.id)
    const idxB = CATEGORY_ORDER.indexOf(b.id)
    const ordA = idxA === -1 ? 999 : idxA
    const ordB = idxB === -1 ? 999 : idxB
    if (ordA !== ordB) return ordA - ordB
    return a.label.localeCompare(b.label)
  })

  return result
})

const isOpen = (id: string) => openCategoryIds.value.has(id)

const toggle = (id: string) => {
  const set = new Set(openCategoryIds.value)
  if (set.has(id)) set.delete(id)
  else set.add(id)
  openCategoryIds.value = set
}

const getCategoryColor = (id: string) =>
    CATEGORY_COLORS[id] ?? CATEGORY_COLORS.other

const filteredWidgets = (cat: WidgetCategory) => {
  const q = filter.value.trim().toLowerCase()
  if (!q) return cat.widgets
  return cat.widgets.filter((w) =>
      w.label.toLowerCase().includes(q),
  )
}

const hoverWidget = ref<HoverWidgetState | null>(null)
const selectedWidget = ref<HoverWidgetState | null>(null)

const onWidgetEnter = (categoryId: string, widget: WidgetDefinition) => {
  hoverWidget.value = { categoryId, widget }
}

const onWidgetLeave = () => {
  hoverWidget.value = null
}

const selectWidget = (categoryId: string, widget: WidgetDefinition) => {
  selectedWidget.value = { categoryId, widget }
  // 여기서 원하면 emit('pick-widget', { categoryId, widget }) 같은 이벤트 추가 가능
}

const isSelected = (w: WidgetDefinition) =>
    selectedWidget.value?.widget.id === w.id

const activeWidgetForDesc = computed<HoverWidgetState | null>(() => {
  return hoverWidget.value ?? selectedWidget.value ?? null
})

const getDescription = (widget?: WidgetDefinition) => {
  if (!widget) return ''
  // TODO: 나중에 widget.id 기반 실제 설명 매핑
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