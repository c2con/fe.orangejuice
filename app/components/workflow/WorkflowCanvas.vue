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
      <VueFlow
          class="oj-workflow-canvas"
          :nodes="flowNodes"
          :edges="flowEdges"
          :node-types="nodeTypes"
          :elements-selectable="true"
          :edges-updatable="false"
          @pane-ready="handlePaneReady"
          @node-drag="handleNodeDrag"
          @connect-start="handleConnectStart"
          @connect="handleConnect"
          @connect-end="handleConnectEnd"
          @pane-context-menu="handlePaneContextMenu"
          @pane-click="handlePaneClick"
      >
        <Background
            pattern-color="#888"
            :gap="20"
            :size="1.5"
        />
      </VueFlow>

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
              <img
                  v-if="w.icon"
                  :src="w.icon"
                  alt=""
                  draggable="false"
              />
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
    </ClientOnly>
  </div>
</template>

<script lang="ts">
import { defineNuxtComponent } from '#app'
import {
  computed,
  markRaw,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import type {
  Edge as FlowEdge,
  Node as FlowNode,
  NodeDragEvent,
  NodeTypesObject,
} from '@vue-flow/core'

import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'

import OjNode from '@/components/workflow/OjNode.vue'
import { useWorkflowStore } from '@/stores/workflow'

import {
  getWidgetDef,
  WIDGET_DEFINITIONS,
  getCategoryColor,
} from '@/utils/widgetDefinitions'
import type { WidgetDefinition } from '@/utils/widgetDefinitions'

import {
  NODE_DIAMETER,
  MIN_ZOOM,
  MAX_ZOOM,
  getAngleScore,
} from '@/utils/workflowGeometry'

type StoreNode = {
  id: string
  widgetType: string
  name: string
  title: string
  label: string
  position: { x: number; y: number }
  params: Record<string, any>
}

type StoreEdge = {
  id: string
  source: string
  target: string
  sourceChannel?: string | null
  targetChannel?: string | null
  enable?: boolean
}

type PickerWidget = WidgetDefinition & { categoryColor: string }

export default defineNuxtComponent({
  components: { VueFlow, Background },
  setup() {
    const workflowStore = useWorkflowStore()

    const vf: any = useVueFlow()

    const project = vf.project as (p: { x: number; y: number }) => { x: number; y: number }
    const setViewport = vf.setViewport as (v: { x: number; y: number; zoom: number }) => Promise<void> | void
    const dimensions = vf.dimensions as { value?: { width: number; height: number } }
    const updateNodeInternals = vf.updateNodeInternals as (ids: string[]) => void

    const getSelectedEdgesRaw = vf.getSelectedEdges
    const removeEdgesRaw = vf.removeEdges

    // =========================================================
    // DOM refs & 좌표 변환
    // =========================================================
    const wrapperRef = ref<HTMLElement | null>(null)

    const getCanvasRect = (): DOMRect | null => {
      const wrap = wrapperRef.value
      const el = wrap?.querySelector('.oj-workflow-canvas') as HTMLElement | null
      return el?.getBoundingClientRect() ?? null
    }

    const toFlowPosFromClient = (clientX: number, clientY: number) => {
      const rect = getCanvasRect()
      if (!rect) return project({ x: clientX, y: clientY })
      return project({
        x: clientX - rect.left,
        y: clientY - rect.top,
      })
    }

    const stripHandleIndex = (h?: string | null) => (h ? h.split('#')[0] : undefined)

    const ensureNodeInternals = async (nodeId: string) => {
      await nextTick()
      requestAnimationFrame(() => updateNodeInternals([nodeId]))
    }

    // getAngleScore undefined 방어
    const safeScore = (
        center: { x: number; y: number },
        other: { x: number; y: number } | undefined,
        isInput: boolean,
    ) => {
      const p = other ?? center
      return getAngleScore(center, p, isInput)
    }

    // =========================================================
    // Node Types
    // =========================================================
    const nodeTypes: NodeTypesObject = { 'oj-node': markRaw(OjNode) as any }

    // =========================================================
    // Widget Picker
    // =========================================================
    const widgetPicker = reactive({
      visible: false,
      screenX: 0,
      screenY: 0,
      anchorFlowX: 0,
      anchorFlowY: 0,
    })

    const pickerRef = ref<HTMLElement | null>(null)
    const searchInputRef = ref<HTMLInputElement | null>(null)
    const searchText = ref('')

    const allWidgets = computed<PickerWidget[]>(() => {
      return Object.values(WIDGET_DEFINITIONS).map((w) => ({
        ...w,
        categoryColor: getCategoryColor((w as any).categoryId),
      }))
    })

    const filteredWidgets = computed<PickerWidget[]>(() => {
      const q = searchText.value.trim().toLowerCase()
      if (!q) return allWidgets.value
      return allWidgets.value.filter((w) => {
        const a = (w.label || '').toLowerCase()
        const b = (w.id || '').toLowerCase()
        return a.includes(q) || b.includes(q)
      })
    })

    const openWidgetPickerAt = (clientX: number, clientY: number) => {
      const flow = toFlowPosFromClient(clientX, clientY)
      widgetPicker.anchorFlowX = flow.x
      widgetPicker.anchorFlowY = flow.y
      widgetPicker.screenX = clientX
      widgetPicker.screenY = clientY
      widgetPicker.visible = true
      nextTick(() => searchInputRef.value?.focus())
    }

    const closeWidgetPicker = () => {
      widgetPicker.visible = false
    }

    // =========================================================
    // Node add
    // =========================================================
    const createStoreNode = (widgetId: string, x: number, y: number): StoreNode => {
      const def = getWidgetDef(widgetId)
      const label = def?.label ?? widgetId

      return {
        id: `node_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        widgetType: widgetId,
        name: label,
        title: label,
        label,
        position: { x, y },
        params: {},
      }
    }

    const addNodeAtFlowPos = async (widgetId: string, x: number, y: number) => {
      const node = createStoreNode(widgetId, x, y)
      ;(workflowStore.nodes as unknown as StoreNode[]).push(node)
      await ensureNodeInternals(node.id)
      return node.id
    }

    const createNodeFromWidget = async (w: PickerWidget) => {
      await addNodeAtFlowPos(w.id, widgetPicker.anchorFlowX, widgetPicker.anchorFlowY)
      closeWidgetPicker()
    }

    const handleDrop = async (e: DragEvent) => {
      const dt = e.dataTransfer
      if (!dt) return

      const widgetId =
          dt.getData('application/oj-widget') ||
          dt.getData('text/oj-widget') ||
          dt.getData('text/plain')

      if (!widgetId) return
      if (!getWidgetDef(widgetId)) return

      const flow = toFlowPosFromClient(e.clientX, e.clientY)
      await addNodeAtFlowPos(widgetId, flow.x, flow.y)
    }

    // =========================================================
    // Flow Nodes
    // =========================================================
    const flowNodes = computed<FlowNode[]>(() => {
      const nodes = (workflowStore.nodes || []) as unknown as StoreNode[]
      const edges = (workflowStore.edges || []) as unknown as StoreEdge[]

      const centerMap: Record<string, { x: number; y: number }> = {}
      nodes.forEach((n) => {
        centerMap[n.id] = {
          x: n.position.x + NODE_DIAMETER / 2,
          y: n.position.y + NODE_DIAMETER / 2,
        }
      })

      return nodes.map((n) => {
        const def = getWidgetDef(n.widgetType)

        const defInputs = ((def?.inputs || []) as any[]).map((v) => (typeof v === 'string' ? v : v?.name) || 'Data')
        const defOutputs = ((def?.outputs || []) as any[]).map((v) => (typeof v === 'string' ? v : v?.name) || 'Data')

        const incoming = edges.filter((e) => e.target === n.id)
        const outgoing = edges.filter((e) => e.source === n.id)

        const center = centerMap[n.id]
        if (center) {
          incoming.sort((a, b) => safeScore(center, centerMap[a.source], true) - safeScore(center, centerMap[b.source], true))
          outgoing.sort((a, b) => safeScore(center, centerMap[a.target], false) - safeScore(center, centerMap[b.target], false))
        }

        const inputsArray =
            incoming.length > 0
                ? incoming.map((e, idx) => {
                  const ch = (e.targetChannel && String(e.targetChannel).trim() !== '') ? String(e.targetChannel) : 'Data'
                  return { id: `${ch}#${idx}`, name: ch }
                })
                : []

        const outputsArray =
            outgoing.length > 0
                ? outgoing.map((e, idx) => {
                  const ch = (e.sourceChannel && String(e.sourceChannel).trim() !== '') ? String(e.sourceChannel) : 'Data'
                  return { id: `${ch}#${idx}`, name: ch }
                })
                : []

        return {
          id: n.id,
          type: 'oj-node',
          position: { x: n.position.x, y: n.position.y },
          data: {
            label: n.title || n.name,
            widgetId: n.widgetType,
            icon: (def as any)?.icon,

            // 핸들 없어도 slot 정의가 있으면 점선 아크 유지 (OjNode에서 처리)
            hasInputSlot: defInputs.length > 0,
            hasOutputSlot: defOutputs.length > 0,
            slotInputs: defInputs,
            slotOutputs: defOutputs,

            // 연결된 경우만 실제 핸들 생성
            inputs: inputsArray,
            outputs: outputsArray,
          },
        } as FlowNode
      })
    })

    // =========================================================
    // Edge label
    // =========================================================
    const buildEdgeLabel = (e: StoreEdge) => {
      const s = (e.sourceChannel && String(e.sourceChannel).trim() !== '') ? String(e.sourceChannel) : 'Data'
      const t = (e.targetChannel && String(e.targetChannel).trim() !== '') ? String(e.targetChannel) : 'Data'
      return s === t ? s : `${s} → ${t}`
    }

    // =========================================================
    // Flow Edges
    // - 비선택: 얇은선 + 라벨 흰 배경(노드라벨 톤)
    // - 선택: CSS로 굵기 + 파란 pill + 흰 글씨
    // =========================================================
    const flowEdges = computed<FlowEdge[]>(() => {
      const nodes = (workflowStore.nodes || []) as unknown as StoreNode[]
      const edges = (workflowStore.edges || []) as unknown as StoreEdge[]
      if (!edges.length) return []

      const centerMap: Record<string, { x: number; y: number }> = {}
      nodes.forEach((n) => {
        centerMap[n.id] = {
          x: n.position.x + NODE_DIAMETER / 2,
          y: n.position.y + NODE_DIAMETER / 2,
        }
      })

      // 각 노드 기준으로 정렬 후 #idx 부여
      const sourceHandleMap: Record<string, string> = {}
      const targetHandleMap: Record<string, string> = {}

      nodes.forEach((n) => {
        const center = centerMap[n.id]
        if (!center) return

        const outEdges = edges.filter((e) => e.source === n.id)
        outEdges.sort((a, b) => safeScore(center, centerMap[a.target], false) - safeScore(center, centerMap[b.target], false))
        outEdges.forEach((e, idx) => {
          const ch = (e.sourceChannel && String(e.sourceChannel).trim() !== '') ? String(e.sourceChannel) : 'Data'
          sourceHandleMap[e.id] = `${ch}#${idx}`
        })

        const inEdges = edges.filter((e) => e.target === n.id)
        inEdges.sort((a, b) => safeScore(center, centerMap[a.source], true) - safeScore(center, centerMap[b.source], true))
        inEdges.forEach((e, idx) => {
          const ch = (e.targetChannel && String(e.targetChannel).trim() !== '') ? String(e.targetChannel) : 'Data'
          targetHandleMap[e.id] = `${ch}#${idx}`
        })
      })

      return edges.map((e) => {
        const enabled = e.enable !== false
        const label = buildEdgeLabel(e)

        const baseSource = (e.sourceChannel && String(e.sourceChannel).trim() !== '') ? String(e.sourceChannel) : 'Data'
        const baseTarget = (e.targetChannel && String(e.targetChannel).trim() !== '') ? String(e.targetChannel) : 'Data'

        const sHandle = sourceHandleMap[e.id] ?? `${baseSource}#0`
        const tHandle = targetHandleMap[e.id] ?? `${baseTarget}#0`

        return {
          id: `e-${e.id}`,
          source: e.source,
          target: e.target,
          sourceHandle: sHandle,
          targetHandle: tHandle,

          type: 'default',

          style: {
            stroke: '#8EA0B2',
            strokeWidth: 2,
            strokeDasharray: enabled ? undefined : '4 4',
          },

          // ✅ 비선택 라벨 (흰 배경)
          label,
          labelStyle: {
            fill: '#4b5563',
            fontSize: 11,
            fontWeight: 500,
          },
          labelBgStyle: {
            rx: 6,
            ry: 6,
          },
          labelBgPadding: [7, 5],
        } as FlowEdge
      })
    })

    // =========================================================
    // Node Drag
    // =========================================================
    const handleNodeDrag = (evt: NodeDragEvent) => {
      const nodes = (workflowStore.nodes || []) as unknown as StoreNode[]
      const t = nodes.find((n) => n.id === evt.node.id)
      if (!t) return
      t.position.x = evt.node.position.x
      t.position.y = evt.node.position.y
    }

    // =========================================================
    // Connect + 중복검증 (같은 source-target 있으면 추가 금지)
    // =========================================================
    const hasSameConnection = (sourceId: string, targetId: string) => {
      const edges = (workflowStore.edges || []) as unknown as StoreEdge[]
      return edges.some((e) => e.source === sourceId && e.target === targetId)
    }

    const connectingFrom = ref<any>(null)

    const handleConnectStart = (params: any) => {
      connectingFrom.value = params
    }

    const handleConnect = (params: any) => {
      const sId = String(params.source || '')
      const tId = String(params.target || '')
      if (!sId || !tId) return

      if (hasSameConnection(sId, tId)) return

      const newEdge: StoreEdge = {
            id: `edge_${Date.now()}_${Math.random().toString(16).slice(2)}`,
            source: sId,
            target: tId,
            sourceChannel: stripHandleIndex(params.sourceHandle) ?? 'Data',
            targetChannel: stripHandleIndex(params.targetHandle) ?? 'Data',
            enable: false,
          }

      ;(workflowStore.edges as unknown as StoreEdge[]).push(newEdge)

      void ensureNodeInternals(sId)
      void ensureNodeInternals(tId)
    }

    const handleConnectEnd = (evt: any) => {
      const mouse = evt?.event as MouseEvent | undefined
      if (mouse) openWidgetPickerAt(mouse.clientX, mouse.clientY)
      connectingFrom.value = null
    }

    // =========================================================
    // Pane events
    // =========================================================
    const handlePaneContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      openWidgetPickerAt(e.clientX, e.clientY)
    }

    const handlePaneClick = () => {
      closeWidgetPicker()
      wrapperRef.value?.focus()
    }

    // =========================================================
    // Viewport fit (1회)
    // =========================================================
    const hasViewportFitted = ref(false)

    const fitAllNodesOnce = async () => {
      if (hasViewportFitted.value) return
      if (flowNodes.value.length === 0) return

      await nextTick()

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      flowNodes.value.forEach((n) => {
        minX = Math.min(minX, n.position.x)
        minY = Math.min(minY, n.position.y)
        maxX = Math.max(maxX, n.position.x)
        maxY = Math.max(maxY, n.position.y)
      })
      if (!isFinite(minX)) return

      const viewW = dimensions?.value?.width ?? 1200
      const viewH = dimensions?.value?.height ?? 800

      const rawW = (maxX - minX) + NODE_DIAMETER
      const rawH = (maxY - minY) + NODE_DIAMETER

      const zoom = Math.max(
          MIN_ZOOM,
          Math.min(viewW / (rawW * 1.4), viewH / (rawH * 1.4), MAX_ZOOM),
      )

      const cx = minX + rawW / 2
      const cy = minY + rawH / 2

      await Promise.resolve(setViewport({
        x: viewW / 2 - cx * zoom,
        y: viewH / 2 - cy * zoom,
        zoom,
      }))

      hasViewportFitted.value = true
    }

    const handlePaneReady = () => {
      void fitAllNodesOnce()
      nextTick(() => wrapperRef.value?.focus())
    }

    watch(
        () => flowNodes.value.length,
        async (n, o) => {
          if (o === 0 && n > 0) {
            hasViewportFitted.value = false
            await fitAllNodesOnce()
          }
        },
    )

    // =========================================================
    // Delete / Backspace (선택된 edge 삭제 + 핸들 즉시 정리)
    // =========================================================
    const readSelectedEdges = (): any[] => {
      if (typeof getSelectedEdgesRaw === 'function') {
        try { return getSelectedEdgesRaw() || [] } catch { return [] }
      }
      if (getSelectedEdgesRaw && typeof getSelectedEdgesRaw === 'object' && 'value' in getSelectedEdgesRaw) {
        return (getSelectedEdgesRaw.value as any[]) || []
      }
      return []
    }

    const removeEdgesSafe = (edgeIds: string[]) => {
      if (!edgeIds.length) return
      if (typeof removeEdgesRaw === 'function') {
        removeEdgesRaw(edgeIds)
        return
      }
      if (removeEdgesRaw && typeof removeEdgesRaw === 'object' && typeof removeEdgesRaw.value === 'function') {
        removeEdgesRaw.value(edgeIds)
      }
    }

    const deleteSelectedEdges = async () => {
      const selected = readSelectedEdges()
      if (!selected.length) return

      const edges = (workflowStore.edges || []) as unknown as StoreEdge[]
      const storeIds = new Set<string>()
      const affectedNodeIds = new Set<string>()
      const flowEdgeIds: string[] = []

      selected.forEach((fe: any) => {
        const flowId = String(fe.id || '')
        if (!flowId) return
        flowEdgeIds.push(flowId)

        const storeId = flowId.startsWith('e-') ? flowId.slice(2) : flowId
        const edge = edges.find((e) => e.id === storeId)
        if (!edge) return

        storeIds.add(storeId)
        affectedNodeIds.add(edge.source)
        affectedNodeIds.add(edge.target)
      })

      removeEdgesSafe(flowEdgeIds)

      workflowStore.edges = edges.filter((e) => !storeIds.has(e.id)) as any

      await nextTick()
      affectedNodeIds.forEach((nid) => updateNodeInternals([nid]))
    }

    const onKeyDown = (e: KeyboardEvent) => {
      const isDeleteKey =
          e.key === 'Delete' ||
          e.key === 'Backspace' ||
          e.key === 'Del' ||
          e.code === 'Delete'

      if (!isDeleteKey) return

      const el = e.target as HTMLElement | null
      const isTyping =
          el?.tagName === 'INPUT' ||
          el?.tagName === 'TEXTAREA' ||
          el?.isContentEditable

      if (isTyping) return

      const selected = readSelectedEdges()
      if (!selected.length) return

      e.preventDefault()
      e.stopPropagation()

      void deleteSelectedEdges()
    }

    // =========================================================
    // Global mouse down: picker 밖 클릭 닫기 (DOM Node 충돌 해결)
    // =========================================================
    const onGlobalMouseDown = (e: MouseEvent) => {
      if (!widgetPicker.visible) return
      if (!pickerRef.value) return

      const t = e.target
      if (t instanceof globalThis.Node && pickerRef.value.contains(t)) return

      closeWidgetPicker()
    }

    onMounted(() => {
      window.addEventListener('mousedown', onGlobalMouseDown)
      nextTick(() => wrapperRef.value?.focus())
    })

    onBeforeUnmount(() => {
      window.removeEventListener('mousedown', onGlobalMouseDown)
    })

    return {
      wrapperRef,

      nodeTypes,
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
    }
  },
})
</script>

<style scoped>
.oj-workflow-wrapper {
  width: 100%;
  height: 100%;
  outline: none;
  min-width: 0;
}

.oj-workflow-canvas {
  width: 100%;
  height: 100%;
  background: #f8fafc;
}

/* ✅ 엣지가 클릭/선택 안 되는 케이스 방지 */
:deep(.vue-flow__edge) {
  pointer-events: all;
}

/* =========================
 * Edge 선택 UX
 * - 비선택: 라벨 흰 배경 + 회색 글씨
 * - 선택: 파란 pill + 흰 글씨 + 선 굵기 증가
 * ========================= */

/* 비선택 라벨 기본값(혹시 다른 CSS가 덮으면 복구) */
:deep(.vue-flow__edge .vue-flow__edge-text) {
  fill: #4b5563 !important;
}
:deep(.vue-flow__edge .vue-flow__edge-textbg) {
  fill: transparent !important;
}

/* 선택된 엣지 선 굵기 */
:deep(.vue-flow__edge.selected path) {
  stroke-width: 4 !important;
}

/* 선택된 엣지 라벨 반전 */
:deep(.vue-flow__edge.selected .vue-flow__edge-text) {
  fill: #ffffff !important;
  font-weight: 600 !important;
}
:deep(.vue-flow__edge.selected .vue-flow__edge-textbg) {
  fill: #2f6fed !important;
}

/* picker */
.oj-widget-picker {
  position: fixed;
  z-index: 1000;
  min-width: 260px;
  padding: 8px;
  background: white;
  border: 1px solid #d7d7d7;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.oj-widget-picker-search {
  width: 100%;
  height: 30px;
  padding: 0 10px;
  border: 1px solid #cfcfcf;
  border-radius: 8px;
  outline: none;
}

.oj-widget-picker-list {
  margin: 0;
  padding: 0;
  list-style: none;
  max-height: 240px;
  overflow: auto;
}

.oj-widget-picker-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 8px;
  cursor: pointer;
}

.oj-widget-picker-item:hover {
  background: #f2f4f7;
}

/* ✅ 팝업 아이콘 스타일 복구 */
.oj-widget-picker-icon {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  background: #f6f6f6;
  border: 1px solid #e6e6e6;
}

.oj-widget-picker-icon img {
  width: 16px;
  height: 16px;
  object-fit: contain;
}

.oj-widget-picker-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  flex: 0 0 auto;
}

.oj-widget-picker-label {
  font-size: 13px;
  color: #222;
}
</style>
