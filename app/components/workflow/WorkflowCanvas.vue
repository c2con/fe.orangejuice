<template>
  <div
      class="oj-workflow-wrapper"
      ref="wrapperRef"
      @dragover.prevent
      @drop="handleDrop"
  >
    <ClientOnly>
      <VueFlow
          class="oj-workflow-canvas"
          :nodes="flowNodes"
          :edges="flowEdges"
          :node-types="nodeTypes"
          :default-edge-options="{ type: 'default', animated: false }"
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

      <div
          v-if="widgetPicker.visible"
          class="oj-widget-picker"
          :style="{ left: widgetPicker.screenX + 'px', top: widgetPicker.screenY + 'px' }"
          ref="pickerRef"
          @mousedown.stop
          @contextmenu.prevent
      >
        <input
            v-model="searchText"
            class="oj-widget-picker-search"
            placeholder="Search..."
            ref="searchInputRef"
        />
        <ul class="oj-widget-picker-list">
          <li
              v-for="w in filteredWidgets"
              :key="w.id"
              class="oj-widget-picker-item"
              @click="createNodeFromWidget(w)"
          >
            <span
                class="oj-widget-picker-icon"
                :style="{ backgroundColor: w.categoryColor }"
            >
              <img
                  :src="w.icon"
                  alt=""
              />
            </span>
            <span class="oj-widget-picker-label">{{ w.label }}</span>
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
  watch,
  nextTick,
  ref,
  reactive,
  onMounted,
  onBeforeUnmount,
} from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import type { NodeDragEvent, NodeTypesObject } from '@vue-flow/core'

import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'

import { useWorkflowStore } from '@/stores/workflow'
import OjNode from '@/components/workflow/OjNode.vue'

import { getWidgetDef, WIDGET_DEFINITIONS, getCategoryColor } from '@/utils/widgetDefinitions'
import type { WidgetDefinition } from '@/utils/widgetDefinitions'

import { NODE_DIAMETER, MIN_ZOOM, MAX_ZOOM, getAngleScore } from '@/utils/workflowGeometry'

export default defineNuxtComponent({
  components: { VueFlow, Background },
  setup() {
    const workflowStore = useWorkflowStore()
    const { project, setViewport, dimensions, updateNodeInternals } = useVueFlow()

    // =========================================================
    // 좌표 변환 (핵심): client → canvas-local → project
    // =========================================================
    const wrapperRef = ref<HTMLElement | null>(null)

    const getCanvasRect = () => {
      const wrap = wrapperRef.value
      const el = wrap?.querySelector('.oj-workflow-canvas') as HTMLElement | null
      return el?.getBoundingClientRect() ?? null
    }

    // ✅ clientX/Y를 그대로 project에 넣으면 레이아웃 오프셋 때문에 항상 어긋남
    const toFlowPosFromClient = (clientX: number, clientY: number) => {
      const rect = getCanvasRect()
      if (!rect) {
        return project({ x: clientX, y: clientY })
      }
      return project({
        x: clientX - rect.left,
        y: clientY - rect.top,
      })
    }

    // store에는 channel만 저장 (Data#0 금지)
    const stripHandleIndex = (h?: string) => (h ? h.split('#')[0] : undefined)

    const ensureNodeInternals = async (nodeId: string) => {
      await nextTick()
      requestAnimationFrame(() => {
        updateNodeInternals([nodeId])
      })
    }

    // =========================================================
    // 노드 추가(클릭=중앙 / DnD=드롭 위치) - 기존 기능 영향 최소
    // =========================================================
    const createNodeAtFlowPos = async (widgetId: string, flowPos: { x: number; y: number }) => {
      const def = getWidgetDef(widgetId)
      if (!def) return null

      const newNodeId = `node_${Date.now()}_${Math.random().toString(16).slice(2)}`
      ;(workflowStore.nodes as any[]).push({
        id: newNodeId,
        widgetType: widgetId,
        name: def.label ?? widgetId,
        title: def.label ?? widgetId,
        position: { x: flowPos.x, y: flowPos.y },
        params: {},
      })

      // ✅ 핸들이 DOM에 올라오기 전에 엣지가 그려져 초기 연결이 떠보이는 현상 완화
      await ensureNodeInternals(newNodeId)

      return newNodeId
    }

    const createNodeAtCenter = async (widgetId: string) => {
      const rect = getCanvasRect()
      if (!rect) {
        await createNodeAtFlowPos(widgetId, { x: 0, y: 0 })
        return
      }
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const flowPos = toFlowPosFromClient(cx, cy)
      await createNodeAtFlowPos(widgetId, { x: flowPos.x, y: flowPos.y })
    }

    // 팔레트 클릭(중앙 생성) 이벤트
    const onAddWidgetEvent = (evt: Event) => {
      const e = evt as CustomEvent<{ widgetId: string }>
      const widgetId = e.detail?.widgetId
      if (!widgetId) return
      if (!getWidgetDef(widgetId)) return
      void createNodeAtCenter(widgetId)
    }

    // Drag & Drop → drop 위치 생성
    const handleDrop = async (e: DragEvent) => {
      const dt = e.dataTransfer
      if (!dt) return

      const widgetId =
          dt.getData('application/oj-widget') ||
          dt.getData('text/oj-widget') ||
          dt.getData('text/plain')

      if (!widgetId) return
      if (!getWidgetDef(widgetId)) return

      const flowPos = toFlowPosFromClient(e.clientX, e.clientY)
      await createNodeAtFlowPos(widgetId, { x: flowPos.x, y: flowPos.y })
    }

    // =========================================================
    // Widget Picker: "최초 호출 위치(anchor)"에 노드 생성
    // =========================================================
    const widgetPicker = reactive({
      visible: false,

      // 표시 좌표 (대화상자 위치)
      screenX: 0,
      screenY: 0,

      // ✅ 앵커: 최초 호출 위치(노드 생성 기준)
      anchorFlowX: 0,
      anchorFlowY: 0,
    })

    const pickerRef = ref<HTMLElement | null>(null)
    const searchInputRef = ref<HTMLInputElement | null>(null)
    const searchText = ref('')

    const allWidgets = computed(() =>
        Object.values(WIDGET_DEFINITIONS).map((w) => ({
          ...w,
          categoryColor: getCategoryColor(w.categoryId),
        })),
    )

    const filteredWidgets = computed(() => {
      const q = searchText.value.trim().toLowerCase()
      if (!q) return allWidgets.value
      return allWidgets.value.filter(
          (w) => w.label.toLowerCase().includes(q) || w.id.toLowerCase().includes(q),
      )
    })

    // ✅ 호출 위치(px,py) 저장: 노드는 항상 이 위치(anchorFlow) 기준으로 생성
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
    // VueFlow node types
    // =========================================================
    const nodeTypes: NodeTypesObject = { 'oj-node': markRaw(OjNode) as any }

    // =========================================================
    // [1] 노드 & 포트 계산 (edges 기반, 각도 정렬)
    // =========================================================
    const flowNodes = computed(() => {
      const nodes = workflowStore.nodes || []
      const edges = workflowStore.edges || []

      // 노드 중심 좌표
      const centerMap: Record<string, { x: number; y: number }> = {}
      nodes.forEach((n) => {
        centerMap[n.id] = {
          x: n.position.x + NODE_DIAMETER / 2,
          y: n.position.y + NODE_DIAMETER / 2,
        }
      })

      return nodes.map((n) => {
        const def = getWidgetDef(n.widgetType)
        const center = centerMap[n.id]

        // 들어오는/나가는 엣지
        const incoming = edges.filter((e) => e.target === n.id && centerMap[e.source])
        const outgoing = edges.filter((e) => e.source === n.id && centerMap[e.target])

        const hasAnyEdge = incoming.length > 0 || outgoing.length > 0

        // 입력 CCW, 출력 CW 정렬
        if (center) {
          incoming.sort((a, b) => {
            const srcA = centerMap[a.source]
            const srcB = centerMap[b.source]
            if (!srcA || !srcB) return 0
            const sa = getAngleScore(center, srcA, true)
            const sb = getAngleScore(center, srcB, true)
            return sa - sb
          })
          outgoing.sort((a, b) => {
            const tgtA = centerMap[a.target]
            const tgtB = centerMap[b.target]
            if (!tgtA || !tgtB) return 0
            const sa = getAngleScore(center, tgtA, false)
            const sb = getAngleScore(center, tgtB, false)
            return sa - sb
          })
        }

        // 입력 포트
        let inputsArray: { id: string; name: string }[]
        if (incoming.length > 0) {
          inputsArray = incoming.map((e, idx) => {
            const ch =
                e.targetChannel && String(e.targetChannel).trim() !== '' ? e.targetChannel : 'Data'
            return { id: `${ch}#${idx}`, name: ch }
          })
        } else if (!hasAnyEdge) {
          // 엣지가 전혀 없을 때만 widgetDefinitions 기반 표시
          const defInputs = ((def?.inputs || []) as any[]) ?? []
          inputsArray = defInputs.map((v) => {
            const ch = (typeof v === 'string' ? v : v.name) || 'Data'
            return { id: ch, name: ch }
          })
        } else {
          inputsArray = []
        }

        // 출력 포트
        let outputsArray: { id: string; name: string }[]
        if (outgoing.length > 0) {
          outputsArray = outgoing.map((e, idx) => {
            const ch =
                e.sourceChannel && String(e.sourceChannel).trim() !== '' ? e.sourceChannel : 'Data'
            return { id: `${ch}#${idx}`, name: ch }
          })
        } else if (!hasAnyEdge) {
          const defOutputs = ((def?.outputs || []) as any[]) ?? []
          outputsArray = defOutputs.map((v) => {
            const ch = (typeof v === 'string' ? v : v.name) || 'Data'
            return { id: ch, name: ch }
          })
        } else {
          outputsArray = []
        }

        return {
          id: n.id,
          type: 'oj-node',
          position: { x: n.position.x, y: n.position.y },
          data: {
            label: n.title || n.name,
            widgetId: n.widgetType,
            icon: def?.icon,
            inputs: inputsArray,
            outputs: outputsArray,
          },
        }
      })
    })

    // =========================================================
    // [2] 엣지 생성: 각도 정렬 기반 handle id 매핑
    // =========================================================
    const flowEdges = computed(() => {
      const nodes = workflowStore.nodes || []
      const edges = workflowStore.edges || []
      if (!edges.length) return []

      const centerMap: Record<string, { x: number; y: number }> = {}
      nodes.forEach((n) => {
        centerMap[n.id] = {
          x: n.position.x + NODE_DIAMETER / 2,
          y: n.position.y + NODE_DIAMETER / 2,
        }
      })

      const sourceHandleMap: Record<string, string> = {}
      const targetHandleMap: Record<string, string> = {}

      nodes.forEach((n) => {
        const center = centerMap[n.id]
        if (!center) return

        const outEdges = edges.filter((e) => e.source === n.id && centerMap[e.target])
        outEdges.sort((a, b) => {
          const tgtA = centerMap[a.target]
          const tgtB = centerMap[b.target]
          if (!tgtA || !tgtB) return 0
          return getAngleScore(center, tgtA, false) - getAngleScore(center, tgtB, false)
        })
        outEdges.forEach((e, idx) => {
          const ch =
              e.sourceChannel && String(e.sourceChannel).trim() !== '' ? e.sourceChannel : 'Data'
          sourceHandleMap[e.id] = `${ch}#${idx}`
        })

        const inEdges = edges.filter((e) => e.target === n.id && centerMap[e.source])
        inEdges.sort((a, b) => {
          const srcA = centerMap[a.source]
          const srcB = centerMap[b.source]
          if (!srcA || !srcB) return 0
          return getAngleScore(center, srcA, true) - getAngleScore(center, srcB, true)
        })
        inEdges.forEach((e, idx) => {
          const ch =
              e.targetChannel && String(e.targetChannel).trim() !== '' ? e.targetChannel : 'Data'
          targetHandleMap[e.id] = `${ch}#${idx}`
        })
      })

      return edges.map((e) => {
        const baseSource =
            e.sourceChannel && String(e.sourceChannel).trim() !== '' ? e.sourceChannel : 'Data'
        const baseTarget =
            e.targetChannel && String(e.targetChannel).trim() !== '' ? e.targetChannel : 'Data'

        const sHandle = sourceHandleMap[e.id] ?? baseSource
        const tHandle = targetHandleMap[e.id] ?? baseTarget

        return {
          id: `e-${e.id}`,
          source: e.source,
          target: e.target,
          sourceHandle: sHandle,
          targetHandle: tHandle,
          type: 'default',
          animated: false,
          style: {
            stroke: '#8EA0B2',
            strokeWidth: 2,
            strokeDasharray: '4 4',
          },
        }
      })
    })

    // =========================================================
    // 노드 드래그
    // =========================================================
    function handleNodeDrag(event: NodeDragEvent) {
      const target = workflowStore.nodes.find((n) => n.id === event.node.id)
      if (target) {
        target.position.x = event.node.position.x
        target.position.y = event.node.position.y
      }
    }

    // =========================================================
    // 최초 viewport fit (1회)
    // =========================================================
    const hasViewportFitted = ref(false)

    const fitAllNodesWithViewport = async () => {
      if (hasViewportFitted.value || flowNodes.value.length === 0) return
      await nextTick()

      const nodes = flowNodes.value
      let minX = Infinity,
          maxX = -Infinity,
          minY = Infinity,
          maxY = -Infinity

      nodes.forEach((n) => {
        if (n.position.x < minX) minX = n.position.x
        if (n.position.x > maxX) maxX = n.position.x
        if (n.position.y < minY) minY = n.position.y
        if (n.position.y > maxY) maxY = n.position.y
      })
      if (!isFinite(minX)) return

      const viewW = dimensions.value?.width || 800
      const viewH = dimensions.value?.height || 600

      const rawW = maxX - minX + NODE_DIAMETER
      const rawH = maxY - minY + NODE_DIAMETER

      const zoom = Math.min(viewW / (rawW * 1.5), viewH / (rawH * 1.5), MAX_ZOOM)

      const cx = minX + rawW / 2
      const cy = minY + rawH / 2

      await setViewport({
        x: viewW / 2 - cx * Math.max(MIN_ZOOM, zoom),
        y: viewH / 2 - cy * Math.max(MIN_ZOOM, zoom),
        zoom: Math.max(MIN_ZOOM, zoom),
      })

      hasViewportFitted.value = true
    }

    const handlePaneReady = () => {
      fitAllNodesWithViewport()
    }

    // =========================================================
    // 연결 생성 (store에는 channel만 저장)
    // =========================================================
    const connectingFrom = ref<any>(null)

    const handleConnectStart = (params: any) => {
      connectingFrom.value = params
    }

    const handleConnect = (params: any) => {
      const newEdge = {
            id: `e-${Date.now()}`,
            source: params.source,
            target: params.target,
            sourceChannel: stripHandleIndex(params.sourceHandle) || 'Data',
            targetChannel: stripHandleIndex(params.targetHandle) || 'Data',
          }
      ;(workflowStore.edges as any[]).push(newEdge)

      void ensureNodeInternals(params.source)
      void ensureNodeInternals(params.target)
    }

    const handleConnectEnd = (evt: any) => {
      if (!connectingFrom.value) return
      const mouse = evt?.event as MouseEvent
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
      if (widgetPicker.visible) widgetPicker.visible = false
    }

    // =========================================================
    // 피커에서 위젯 선택 → "최초 호출 위치(anchor)"에 생성
    // + 연결 중이면 자동 엣지 생성
    // =========================================================
    const createNodeFromWidget = async (w: WidgetDefinition & { categoryColor?: string }) => {
      // ✅ 노드는 anchorFlow 위치에 생성 (표시 위치 screenX/Y와 무관)
      const newNodeId = await createNodeAtFlowPos(w.id, {
        x: widgetPicker.anchorFlowX,
        y: widgetPicker.anchorFlowY,
      })

      if (!newNodeId) {
        closeWidgetPicker()
        return
      }

      // 연결 드래그 중이면 자동 엣지 추가
      if (connectingFrom.value) {
        const from = connectingFrom.value
        const isSrc = from.handleType === 'source'

        const def = getWidgetDef(w.id)
        const defInputs = ((def?.inputs || []) as any[]) ?? []
        const defOutputs = ((def?.outputs || []) as any[]) ?? []

        const firstInput =
            (defInputs[0] && typeof defInputs[0] === 'object' ? defInputs[0].name : defInputs[0]) ||
            'Data'
        const firstOutput =
            (defOutputs[0] && typeof defOutputs[0] === 'object' ? defOutputs[0].name : defOutputs[0]) ||
            'Data'

        const fromChannel = stripHandleIndex(from.handleId) || 'Data'

        const targetPort = isSrc ? firstInput : fromChannel
        const sourcePort = isSrc ? fromChannel : firstOutput

        ;(workflowStore.edges as any[]).push({
          id: `edge_${Date.now()}`,
          source: isSrc ? from.nodeId : newNodeId,
          target: isSrc ? newNodeId : from.nodeId,
          sourceChannel: sourcePort,
          targetChannel: targetPort,
        })

        await ensureNodeInternals(from.nodeId)
        await ensureNodeInternals(newNodeId)
      }

      closeWidgetPicker()
    }

    // 최초 노드 로드 시 1회 fit
    watch(
        () => flowNodes.value.length,
        async (newLen, oldLen) => {
          if (oldLen === 0 && newLen > 0) {
            hasViewportFitted.value = false
            await fitAllNodesWithViewport()
          }
        },
    )

    // 전역 이벤트(ESC 닫기 / 바깥 클릭 닫기)
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeWidgetPicker()
    }

    const onGlobalMouseDown = (e: MouseEvent) => {
      if (widgetPicker.visible && pickerRef.value && !pickerRef.value.contains(e.target as Node)) {
        closeWidgetPicker()
      }
    }

    onMounted(() => {
      window.addEventListener('keydown', onKeyDown)
      window.addEventListener('mousedown', onGlobalMouseDown)

      // 팔레트 클릭 중앙 생성
      window.addEventListener('oj:add-widget', onAddWidgetEvent as any)
    })

    onBeforeUnmount(() => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('mousedown', onGlobalMouseDown)

      window.removeEventListener('oj:add-widget', onAddWidgetEvent as any)
    })

    return {
      wrapperRef,

      flowNodes,
      flowEdges,
      nodeTypes,

      handleDrop,

      handleNodeDrag,
      handlePaneReady,

      handleConnectStart,
      handleConnect,
      handleConnectEnd,

      handlePaneContextMenu,
      handlePaneClick,

      widgetPicker,
      pickerRef,
      searchInputRef,
      searchText,

      filteredWidgets,
      createNodeFromWidget,
    }
  },
})
</script>

<style scoped>
.oj-workflow-wrapper {
  flex: 1;
  display: flex;
  height: 100%;
  min-width: 0;
}

.oj-workflow-canvas {
  width: 100%;
  height: 100%;
  background: #f8fafc;
}

/* ---------- picker ---------- */
.oj-widget-picker {
  position: fixed;
  z-index: 1000;
  min-width: 260px;
  padding: 8px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.oj-widget-picker-search {
  width: 100%;
  padding: 6px;
  border: 1px solid #ccc;
  border-radius: 4px;
  outline: none;
}

.oj-widget-picker-search:focus {
  border-color: #2196f3;
}

.oj-widget-picker-list {
  max-height: 200px;
  overflow-y: auto;
  list-style: none;
  padding: 0;
  margin: 0;
}

.oj-widget-picker-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px;
  cursor: pointer;
  border-radius: 4px;
}

.oj-widget-picker-item:hover {
  background: #f0f0f0;
}

.oj-widget-picker-icon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.oj-widget-picker-icon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.oj-widget-picker-label {
  font-size: 13px;
  color: #333;
}
</style>
