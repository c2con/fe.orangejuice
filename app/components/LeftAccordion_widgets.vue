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
                draggable="true"
                @dragstart="onWidgetDragStart($event, w)"
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

const onWidgetDragStart  = (e: DragEvent, widget: WidgetDefinition) => {
  const dt = e.dataTransfer
  if (!dt) return

  dt.effectAllowed = 'copy'

  // ✅ “어떤 위젯인지”만 넘긴다 (id 추천)
  // drop에서 resolveWidgetKey(raw)로 key로 통일하면 대화상자와 동일해짐
  dt.setData('application/oj-widget', widget.id)
  dt.setData('text/oj-widget', widget.id)

  // (선택) 디버깅용: label도 같이 넣을 수 있음
  // dt.setData('text/plain', w.label)
}

</script>
<style src="@/assets/css/LeftAccordion.css"></style>
