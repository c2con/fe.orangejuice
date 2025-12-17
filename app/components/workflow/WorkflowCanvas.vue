<script setup lang="ts">
import { useWorkflowCanvas } from '@/composables/useWorkflowCanvas'
import HistoryPanel from '@/components/panels/HistoryPanel.vue'
import { VueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'

const {
  wrapperRef,
  nodeTypes,
  edgeTypes,
  flowNodes,
  flowEdges,

  handlePaneReady,
  handleNodeDrag,

  handleConnectStart,
  handleConnect,
  handleConnectEnd,

  handlePaneContextMenu,
  handlePaneClick,

  handleDrop,

  widgetPicker,
  pickerRef,
  searchInputRef,
  searchText,
  filteredWidgets,
  createNodeFromWidget,

  onKeyDown,

  onNodeDragStart,
  onNodeDragStop,

  isHistoryOpen,
  historyIconUrl,

} = useWorkflowCanvas()
</script>

<template>
  <div
      ref="wrapperRef"
      class="oj-workflow-wrapper"
      tabindex="0"
      @keydown="onKeyDown"
      @dragover.prevent
      @drop="handleDrop"
  >
    <ClientOnly>
      <div class="oj-workflow-layout">
        <!-- =========================
             CANVAS AREA
        ========================== -->
        <div class="oj-canvas-area">
          <VueFlow
              class="oj-workflow-canvas"
              :nodes="flowNodes"
              :edges="flowEdges"
              :node-types="nodeTypes"
              :edge-types="edgeTypes"
              :elements-selectable="true"
              :edges-updatable="false"
              @pane-ready="handlePaneReady"
              @node-drag="handleNodeDrag"
              @connect-start="handleConnectStart"
              @connect="handleConnect"
              @connect-end="handleConnectEnd"
              @pane-context-menu="handlePaneContextMenu"
              @pane-click="handlePaneClick"
              @node-drag-start="onNodeDragStart"
              @node-drag-stop="onNodeDragStop"
          >
            <Background pattern-color="#888" :gap="20" :size="1.5" />
          </VueFlow>

          <!-- 우상단 History 토글 버튼 -->
          <button
              v-if="!isHistoryOpen"
              type="button"
              class="oj-history-toggle"
              title="History"
              @click="isHistoryOpen = true"
          >
            <img :src="historyIconUrl" class="oj-history-icon-img" alt="" draggable="false" />
          </button>

          <!-- Widget Picker -->
          <div
              v-if="widgetPicker.visible"
              ref="pickerRef"
              class="oj-widget-picker"
              :style="{ left: widgetPicker.screenX + 'px', top: widgetPicker.screenY + 'px' }"
              @mousedown.stop
              @contextmenu.prevent
          >
            <input
                ref="searchInputRef"
                v-model="searchText"
                class="oj-widget-picker-search"
                placeholder="Search..."
            />

            <ul class="oj-widget-picker-list">
              <li
                  v-for="w in filteredWidgets"
                  :key="w.id"
                  class="oj-widget-picker-item"
                  @click="createNodeFromWidget(w)"
              >
                <span class="oj-widget-picker-icon">
                  <img v-if="w.icon" :src="w.icon" alt="" draggable="false" />
                  <span
                      v-else
                      class="oj-widget-picker-dot"
                      :style="{ backgroundColor: w.categoryColor }"
                  />
                </span>

                <span class="oj-widget-picker-label">
                  {{ w.label }}
                </span>
              </li>
            </ul>
          </div>
        </div>

        <!-- =========================
             RIGHT HISTORY PANEL
        ========================== -->
        <div v-if="isHistoryOpen" class="oj-right-panel" @mousedown.stop>
          <HistoryPanel @close="isHistoryOpen = false" />
        </div>
      </div>
    </ClientOnly>
  </div>
</template>

<style src="@/assets/WorkflowCanvas.css"></style>

