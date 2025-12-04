<template>
  <div class="oj-workflow-wrapper">
    <ClientOnly>
      <VueFlow
          class="oj-workflow-canvas"
          :nodes="flowNodes"
          :edges="flowEdges"
          :node-types="nodeTypes"
          @pane-ready="handlePaneReady"
          @node-drag="handleNodeDrag"

          @connect-start="handleConnectStart"
          @connect="handleConnect"
          @connect-end="handleConnectEnd"

          @pane-click="handlePaneClick"
          @pane-context-menu="handlePaneContextMenu"
      />
    </ClientOnly>
    <!-- 위젯 선택 팝업 -->
    <div
        v-if="widgetPicker.visible"
        ref="pickerRef"
        class="oj-widget-picker"
        :style="{
      left: widgetPicker.screenX + 'px',
      top: widgetPicker.screenY + 'px'
    }"
        @mousedown.stop
        @contextmenu.prevent
    >
      <input
          v-model="searchText"
          class="oj-widget-picker-search"
          placeholder="Search for a widget..."
      />

      <ul class="oj-widget-picker-list">
        <li
            v-for="w in filteredWidgets"
            :key="w.id"
            class="oj-widget-picker-item"
            @click="createNodeFromWidget(w)"
        >
        <span class="oj-widget-picker-icon" :style="{ backgroundColor: w.categoryColor }">
          <!-- 아이콘은 widgetDefinitions.ts의 icon 필드 사용 -->
          <img :src="w.icon" alt="" />
        </span>
          <span class="oj-widget-picker-label">{{ w.label }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script lang="ts">
import { defineNuxtComponent } from '#app'
import { computed, markRaw, watch, nextTick, ref, reactive, onMounted, onBeforeUnmount } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import type { NodeDragEvent, NodeTypesObject, Edge } from '@vue-flow/core'

import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'

import { useWorkflowStore } from '@/stores/workflow'
import type { WorkflowEdge } from '@/stores/workflow'
import OjNode from '@/components/workflow/OjNode.vue'
import { getWidgetDef, WIDGET_DEFINITIONS } from '@/utils/widgetDefinitions'
import type { WidgetDefinition } from '@/utils/widgetDefinitions'
import { NODE_DIAMETER } from '@/utils/workflowGeometry'

export default defineNuxtComponent({
  ssr: false,
  components: {
    VueFlow,
  },
  setup() {
    const hasViewportFitted = ref(false)

    const workflowStore = useWorkflowStore()

    // VueFlow API
    const {
      setViewport,
      dimensions,
      project,
    } = useVueFlow()

    // -----------------------------
    // 연결 / 위젯 팝업 상태
    // -----------------------------
    const connectingFrom = ref<{
      nodeId: string
      handleId?: string
      handleType: 'source' | 'target'
    } | null>(null)

    const hasConnected = ref(false)

    const widgetPicker = reactive({
      visible: false,
      screenX: 0,
      screenY: 0,
      flowX: 0,
      flowY: 0,
    })

    const pickerRef = ref<HTMLElement | null>(null)

    const closeWidgetPicker = () => {
      widgetPicker.visible = false
      searchText.value = ''
      connectingFrom.value = null
      hasConnected.value = false
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && widgetPicker.visible) {
        closeWidgetPicker()
      }
    }
    const onGlobalMouseDown = (e: MouseEvent) => {
      if (!widgetPicker.visible) return
      const el = pickerRef.value
      if (el && el.contains(e.target as Node)) {
        // 팝업 내부 클릭이면 무시
        return
      }
      closeWidgetPicker()
    }

    onMounted(() => {
      window.addEventListener('keydown', onKeyDown)
      window.addEventListener('mousedown', onGlobalMouseDown)
    })

    onBeforeUnmount(() => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('mousedown', onGlobalMouseDown)
    })

    // 위젯 검색어 & 필터 목록
    const searchText = ref('')

    const allWidgets = computed<WidgetDefinition[]>(() =>
        Object.values(WIDGET_DEFINITIONS),
    )

    const filteredWidgets = computed<WidgetDefinition[]>(() => {
      const q = searchText.value.trim().toLowerCase()
      if (!q) return allWidgets.value
      return allWidgets.value.filter((w) =>
          w.label.toLowerCase().includes(q) ||
          w.id.toLowerCase().includes(q),
      )
    })

    // -----------------------------
    // 1) 커스텀 노드 타입
    // -----------------------------
    const nodeTypes: NodeTypesObject = {
      'oj-node': markRaw(OjNode) as any,
    }

    // -----------------------------
    // 2) 노드별 실제 입력 포트 이름 계산
    // -----------------------------
    const nodeRealInputs = computed<Record<string, string[]>>(() => {
      const inputsMap: Record<string, string[]> = {}
      const edgesByTarget: Record<string, WorkflowEdge[]> = {}
      const storeEdges = workflowStore.edges as WorkflowEdge[]

      storeEdges.forEach((edge) => {
        ;(edgesByTarget[edge.target] ??= []).push(edge)
      })

      workflowStore.nodes.forEach((node) => {
        const incomingEdges = edgesByTarget[node.id] || []

        const sortedEdges = incomingEdges
            .map((e) => {
              const src = workflowStore.nodes.find((n) => n.id === e.source)
              return { edge: e, y: src ? src.position.y : 0 }
            })
            .sort((a, b) => a.y - b.y)

        const sortedInputs: string[] = []

        sortedEdges.forEach(({ edge }) => {
          const portName = edge.targetChannel ?? edge.label ?? 'Data'
          if (!sortedInputs.includes(portName)) {
            sortedInputs.push(portName)
          }
        })

        const def = getWidgetDef(node.widgetType)
        if (sortedInputs.length === 0 && def.hasInput) {
          sortedInputs.push('Data')
        }

        inputsMap[node.id] = sortedInputs
      })

      return inputsMap
    })

    // -----------------------------
    // 3) VueFlow 노드 생성
    // -----------------------------
    const flowNodes = computed(() =>
        workflowStore.nodes.map((n) => {
          const def = getWidgetDef(n.widgetType)

          const defOutputs =
              def.outputs && def.outputs.length > 0
                  ? def.outputs
                  : def.hasOutput
                      ? ['Data']
                      : []

          return {
            id: n.id,
            type: 'oj-node',
            position: { x: n.position.x, y: n.position.y },
            data: {
              label: n.title || n.name,
              widgetId: n.widgetType,
              icon: def.icon,
              inputs: nodeRealInputs.value[n.id] || [],
              outputs: defOutputs,
            },
          }
        }),
    )

    // -----------------------------
    // 4) VueFlow 엣지 생성 (각도 기반 핸들 매핑)
    // -----------------------------
    const flowEdges = computed<Edge[]>(() => {
      const nodeIds = new Set(flowNodes.value.map((n) => n.id))
      const storeEdges = workflowStore.edges as WorkflowEdge[]

      const validEdges: WorkflowEdge[] = storeEdges.filter(
          (e) => nodeIds.has(e.source) && nodeIds.has(e.target),
      )

      const edgeMap: Record<string, Edge> = {}
      const baseEdges: Edge[] = validEdges.map((e) => {
        const edge: Edge = {
          id: e.id,
          source: e.source,
          target: e.target,
          label: e.label ?? undefined,
        }
        edgeMap[e.id] = edge
        return edge
      })

      const findNodeById = (id: string) =>
          workflowStore.nodes.find((n) => n.id === id)

      // source 기준 정렬
      const edgesBySource: Record<string, WorkflowEdge[]> = {}
      validEdges.forEach((e) => {
        ;(edgesBySource[e.source] ??= []).push(e)
      })

      for (const sourceId in edgesBySource) {
        const list = edgesBySource[sourceId]!
        const sourceNode = findNodeById(sourceId)
        const sX = sourceNode?.position.x ?? 0
        const sY = sourceNode?.position.y ?? 0

        const edgesWithAngle = list
            .map((e) => {
              const targetNode = findNodeById(e.target)
              const tX = targetNode?.position.x ?? 0
              const tY = targetNode?.position.y ?? 0
              const dx = tX - sX
              const dy = tY - sY
              const angle = (Math.atan2(dy, dx) * 180) / Math.PI
              return { e, angle }
            })
            .sort((a, b) => a.angle - b.angle)

        edgesWithAngle.forEach(({ e }, idx) => {
          const be = edgeMap[e.id]
          if (be) be.sourceHandle = `out-${idx}`
        })
      }

      // target 기준 정렬
      const edgesByTarget: Record<string, WorkflowEdge[]> = {}
      validEdges.forEach((e) => {
        ;(edgesByTarget[e.target] ??= []).push(e)
      })

      for (const targetId in edgesByTarget) {
        const list = edgesByTarget[targetId]!
        const targetNode = findNodeById(targetId)
        const tX = targetNode?.position.x ?? 0
        const tY = targetNode?.position.y ?? 0

        const edgesWithAngle = list
            .map((e) => {
              const sourceNode = findNodeById(e.source)
              const sX = sourceNode?.position.x ?? 0
              const sY = sourceNode?.position.y ?? 0
              const dx = tX - sX
              const dy = tY - sY
              const angle = (Math.atan2(dy, dx) * 180) / Math.PI
              return { e, angle }
            })
            .sort((a, b) => a.angle - b.angle)

        edgesWithAngle.forEach(({ e }, idx) => {
          const be = edgeMap[e.id]
          if (be) be.targetHandle = `in-${idx}`
        })
      }

      baseEdges.forEach((e) => {
        e.style = { stroke: '#bdc3c7', strokeWidth: 2 }
      })

      return baseEdges
    })

    // -----------------------------
    // 5) 노드 드래그 → 스토어 반영
    // -----------------------------
    function handleNodeDrag(event: NodeDragEvent) {
      const targetNode = workflowStore.nodes.find((n) => n.id === event.node.id)
      if (targetNode) {
        targetNode.position.x = event.node.position.x
        targetNode.position.y = event.node.position.y
      }
    }

    // -----------------------------
    // 6) 뷰포트 계산
    // -----------------------------
    const VIEWPORT_PADDING_X = 0.15
    const VIEWPORT_PADDING_Y = 0.1
    const MIN_ZOOM = 0.05
    const MAX_ZOOM = 1.5

    const fitAllNodesWithViewport = async () => {
      if (hasViewportFitted.value) return

      const nodes = flowNodes.value
      if (!nodes.length) return

      await nextTick()

      const dim = dimensions.value
      const viewW = dim?.width ?? 0
      const viewH = dim?.height ?? 0
      if (viewW <= 0 || viewH <= 0) return

      let minX = Infinity
      let maxX = -Infinity
      let minY = Infinity
      let maxY = -Infinity

      nodes.forEach((n) => {
        const x = n.position.x
        const y = n.position.y
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      })

      if (
          !isFinite(minX) ||
          !isFinite(maxX) ||
          !isFinite(minY) ||
          !isFinite(maxY)
      ) return

      const rawWidth = maxX - minX + NODE_DIAMETER
      const rawHeight = maxY - minY + NODE_DIAMETER

      const marginX = rawWidth * VIEWPORT_PADDING_X
      const marginY = rawHeight * VIEWPORT_PADDING_Y

      const graphWidth = rawWidth + marginX * 2
      const graphHeight = rawHeight + marginY * 2

      const zoomX = viewW / graphWidth
      const zoomY = viewH / graphHeight
      let zoom = Math.min(zoomX, zoomY)
      zoom = Math.min(Math.max(zoom, MIN_ZOOM), MAX_ZOOM)

      const graphCenterX = minX + rawWidth / 2
      const graphCenterY = minY + rawHeight / 2

      const screenCenterX = viewW / 2
      const screenCenterY = viewH / 2

      const x = screenCenterX - graphCenterX * zoom
      const y = screenCenterY - graphCenterY * zoom

      await setViewport({ x, y, zoom })

      hasViewportFitted.value = true
    }

    const handlePaneReady = async () => {
      await fitAllNodesWithViewport()
    }

    // -----------------------------
    // 7) 연결 이벤트 (arc/handle 공통)
    // -----------------------------
    const handleConnectStart = (connectionEvent: any) => {
      const { nodeId, handleId, handleType } = connectionEvent
      if (!nodeId || !handleType) {
        connectingFrom.value = null
        return
      }

      connectingFrom.value = {
        nodeId,
        handleId,
        handleType,
      }
      hasConnected.value = false
    }

    const handleConnect = (connection: any) => {
      hasConnected.value = true
      // 실제 edge 추가는 store 기반으로 하고 있으니 여기서는 플래그만
    }

    const openWidgetPickerAt = (clientX: number, clientY: number) => {
      const flowPos = project({ x: clientX, y: clientY })

      widgetPicker.visible = true
      widgetPicker.screenX = clientX
      widgetPicker.screenY = clientY
      widgetPicker.flowX = flowPos.x
      widgetPicker.flowY = flowPos.y
    }

    // connect-end: 마우스를 떼는 순간 (성공/실패 모두)
    const handleConnectEnd = (connectionEvent: any) => {
      // 연결이 실제로 만들어졌으면(=다른 노드에 연결됨) 팝업 X
      if (!connectingFrom.value || hasConnected.value) {
        connectingFrom.value = null
        hasConnected.value = false
        return
      }

      // VueFlow 가 넘겨주는 객체에서 실제 MouseEvent 추출
      const mouse: MouseEvent | undefined =
          connectionEvent?.event ?? connectionEvent

      if (!mouse) {
        connectingFrom.value = null
        hasConnected.value = false
        return
      }

      // 빈 공간에 드롭한 경우 → 팝업 위치 잡기
      const { clientX, clientY } = mouse
      const flowPos = project({ x: clientX, y: clientY })

      widgetPicker.visible = true
      widgetPicker.screenX = clientX
      widgetPicker.screenY = clientY
      widgetPicker.flowX = flowPos.x
      widgetPicker.flowY = flowPos.y

      connectingFrom.value = null
      hasConnected.value = false
    }

    const handlePaneContextMenu = (event: MouseEvent) => {
      event.preventDefault()
      // 순수 오른쪽 클릭이므로 기존 연결 상태는 초기화
      connectingFrom.value = null
      hasConnected.value = false
      openWidgetPickerAt(event.clientX, event.clientY)
    }

    const handlePaneClick = () => {
      if (widgetPicker.visible) {
        closeWidgetPicker()
      }
    }

    // -----------------------------
    // 8) 위젯 선택 → 새 노드 & 엣지 생성
    // -----------------------------
    const createNodeFromWidget = (w: WidgetDefinition) => {
      const newNodeId = `node_${Date.now()}`

      const newNode: any = {
            id: newNodeId,
            widgetType: w.id,
            name: w.label,
            title: w.label,
            position: { x: widgetPicker.flowX, y: widgetPicker.flowY },
          }

      ;(workflowStore.nodes as any[]).push(newNode)

      // 연결 드래그에서 온 경우에만 edge 생성
      if (connectingFrom.value) {
        const from = connectingFrom.value
        const newEdge: any = {
              id: `edge_${Date.now()}`,
              source: from.handleType === 'source' ? from.nodeId : newNodeId,
              target: from.handleType === 'source' ? newNodeId : from.nodeId,
            }
        ;(workflowStore.edges as any[]).push(newEdge)
      }

      closeWidgetPicker()
    }

    // -----------------------------
    // 9) 노드 수 변화 시 최초 1회 fit
    // -----------------------------
    watch(
        () => flowNodes.value.length,
        async (newLen, oldLen) => {
          if (oldLen === 0 && newLen > 0) {
            await fitAllNodesWithViewport()
          }
        },
    )

    return {
      flowNodes,
      flowEdges,
      nodeTypes,
      handleNodeDrag,
      handlePaneReady,
      handleConnectStart,
      handleConnect,
      handleConnectEnd,
      handlePaneContextMenu,
      handlePaneClick,

      widgetPicker,
      pickerRef,
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
  min-width: 0;
  height: 100%;
  display: flex;
}

.oj-workflow-canvas {
  width: 100%;
  height: 100%;
  background: #f8fafc;
}

/* 팝업 컨테이너 */
.oj-widget-picker {
  position: absolute;
  min-width: 260px;
  max-height: 380px;
  border: 1px solid #c4c4c4;
  background: #fdfdfd;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
  border-radius: 4px;
  overflow: hidden;
  z-index: 50;
  font-size: 12px;
  box-sizing: border-box;
}

/* 검색창 */
.oj-widget-picker-search {
  width: 100%;
  border: none;
  border-bottom: 1px solid #d0d0d0;
  padding: 4px 8px;
  font-size: 12px;
  outline: none;
  box-sizing: border-box;
}

/* 리스트 */
.oj-widget-picker-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 340px;
  overflow-y: auto;
}

/* 항목 */
.oj-widget-picker-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 6px;
  cursor: pointer;
  white-space: nowrap;
}

.oj-widget-picker-item:hover {
  background: #e6f0ff;
}

/* 아이콘 영역 (카테고리 색 배경을 줄 거면 여기서) */
.oj-widget-picker-icon {
  width: 20px;
  height: 20px;
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.oj-widget-picker-icon img {
  width: 100%;
  height: 100%;
  display: block;
}

.oj-widget-picker-label {
  flex: 1;
}
</style>
