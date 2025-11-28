<template>
  <aside
      class="oj-widget-panel"
      :style="{ width: panelWidth + 'px' }"
  >
    <!-- 왼쪽: 세로 탭 버튼 (WS / WD / Data) -->
    <div class="oj-left-tabs">
      <!-- Workspace 탭 -->
      <button
          type="button"
          class="oj-left-tab-btn"
          :class="{ 'is-active': viewMode === 'workspace' }"
          @click="viewMode = 'workspace'"
          title="Workspace"
      >
        <svg class="oj-left-tab-icon" viewBox="0 0 24 24" fill="none">
          <path
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M3 7.5A2.25 2.25 0 0 1 5.25 5.25h3.17c.46 0 .9.18 1.23.5l1.12 1.12c.33.32.77.5 1.23.5h4.7A2.25 2.25 0 0 1 19.5 9.37v7.88a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 17.25V7.5z"
          />
        </svg>
      </button>

      <!-- Widgets 탭 -->
      <button
          type="button"
          class="oj-left-tab-btn"
          :class="{ 'is-active': viewMode === 'widgets' }"
          @click="viewMode = 'widgets'"
          title="Widgets"
      >
        <svg class="oj-left-tab-icon" viewBox="0 0 24 24" fill="none">
          <rect x="4.5" y="4.5" width="6" height="6" rx="1" ry="1"
                stroke="currentColor" stroke-width="1.5" />
          <rect x="13.5" y="4.5" width="6" height="6" rx="1" ry="1"
                stroke="currentColor" stroke-width="1.5" />
          <rect x="4.5" y="13.5" width="6" height="6" rx="1" ry="1"
                stroke="currentColor" stroke-width="1.5" />
          <rect x="13.5" y="13.5" width="6" height="6" rx="1" ry="1"
                stroke="currentColor" stroke-width="1.5" />
        </svg>
      </button>

      <!-- Data 탭 -->
      <button
          type="button"
          class="oj-left-tab-btn"
          :class="{ 'is-active': viewMode === 'data' }"
          @click="viewMode = 'data'"
          title="Data"
      >
        <svg class="oj-left-tab-icon" viewBox="0 0 24 24" fill="none">
          <ellipse cx="12" cy="6" rx="7" ry="3"
                   stroke="currentColor" stroke-width="1.5" />
          <path
              d="M5 6v9c0 1.66 3.13 3 7 3s7-1.34 7-3V6"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
          />
          <ellipse cx="12" cy="15" rx="7" ry="3"
                   stroke="currentColor" stroke-width="1.5" />
        </svg>
      </button>
    </div>

    <!-- 오른쪽: 탭별 내용 -->
    <div class="oj-right-pane">
      <LeftAccordion_workspace v-if="viewMode === 'workspace'" />
      <LeftAccordion_widgets v-else-if="viewMode === 'widgets'" />
      <LeftAccordion_dataspace v-else />
    </div>

    <!-- 오른쪽 끝 리사이저 바 (폭 조절) -->
    <div class="oj-resizer" @mousedown="onResizeStart"></div>
  </aside>
</template>

<script lang="ts">
import { defineComponent, onBeforeUnmount, ref } from 'vue'
import LeftAccordion_workspace from './LeftAccordion_workspace.vue'
import LeftAccordion_widgets from './LeftAccordion_widgets.vue'
import LeftAccordion_dataspace from './LeftAccordion_dataspace.vue'

type ViewMode = 'workspace' | 'widgets' | 'data'

export default defineComponent({
  name: 'LeftAccordion',
  components: {
    LeftAccordion_workspace,
    LeftAccordion_widgets,
    LeftAccordion_dataspace
  },
  setup() {
    const viewMode = ref<ViewMode>('workspace')
    const panelWidth = ref(260)
    const minWidth = 200
    const maxWidth = 420

    let resizing = false
    let startX = 0
    let startWidth = 0

    const onResizeStart = (e: MouseEvent) => {
      resizing = true
      startX = e.clientX
      startWidth = panelWidth.value
      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onResizeEnd)
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!resizing) return
      const delta = e.clientX - startX
      let next = startWidth + delta
      if (next < minWidth) next = minWidth
      if (next > maxWidth) next = maxWidth
      panelWidth.value = next
    }

    const onResizeEnd = () => {
      if (!resizing) return
      resizing = false
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onResizeEnd)
    }

    onBeforeUnmount(onResizeEnd)

    return {
      viewMode,
      panelWidth,
      onResizeStart
    }
  }
})
</script>

<style src="@/assets/LeftAccordion.css"></style>
