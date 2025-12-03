<template>
  <div class="oj-workflow-wrapper">
    <ClientOnly>
      <VueFlow
          class="oj-workflow-canvas"
          :nodes="flowNodes"
          :edges="flowEdges"
          :node-types="nodeTypes"
          fit-view
          @node-drag="handleNodeDrag"
          @pane-ready="handlePaneReady"
      />
    </ClientOnly>
  </div>
</template>

<script lang="ts">
import { defineNuxtComponent } from '#app'
import { computed, markRaw, watch, nextTick } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import type { NodeDragEvent, NodeTypesObject, Edge } from '@vue-flow/core'

import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'

import { useWorkflowStore } from '@/stores/workflow'
import type { WorkflowEdge } from '@/stores/workflow'
import OjNode from '@/components/workflow/OjNode.vue'
import { getWidgetDef } from '@/utils/widgetDefinitions'
import { NODE_DIAMETER } from '@/utils/workflowGeometry'

export default defineNuxtComponent({
  ssr: false,
  components: {
    VueFlow,
  },
  setup() {
    const workflowStore = useWorkflowStore()

    // VueFlow API (뷰포트 제어용)
    const { setViewport, dimensions } = useVueFlow()

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

      // 타겟 노드 기준으로 그룹핑
      storeEdges.forEach((edge) => {
        ;(edgesByTarget[edge.target] ??= []).push(edge)
      })

      workflowStore.nodes.forEach((node) => {
        const incomingEdges = edgesByTarget[node.id] || []

        // 소스 노드의 Y 좌표 기준으로 정렬 (위→아래)
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

      // --- source 기준 정렬 → out-0, out-1, ...
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

      // --- target 기준 정렬 → in-0, in-1, ...
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
    // 5) 노드 드래그 시 위치를 스토어에 반영
    // -----------------------------
    function handleNodeDrag(event: NodeDragEvent) {
      const targetNode = workflowStore.nodes.find((n) => n.id === event.node.id)
      if (targetNode) {
        targetNode.position.x = event.node.position.x
        targetNode.position.y = event.node.position.y
      }
    }

    // -----------------------------
    // 6) 뷰포트 계산 (노드 bounding box 기준)
    // -----------------------------
    const VIEWPORT_PADDING_X = 0.15
    const VIEWPORT_PADDING_Y = 0.15
    const MIN_ZOOM = 0.05
    const MAX_ZOOM = 1.5


    const fitAllNodesWithViewport = async () => {
      const nodes = flowNodes.value
      if (!nodes.length) return

      await nextTick()

      const dim = dimensions.value
      const viewW = dim?.width ?? 0
      const viewH = dim?.height ?? 0
      if (viewW <= 0 || viewH <= 0) return

      // 1) 노드 bounding box (원래 그래프 크기)
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

      // 노드 하나도 없으면 종료
      if (!isFinite(minX) || !isFinite(maxX) || !isFinite(minY) || !isFinite(maxY)) return

      // 노드 크기까지 포함한 "원래" 폭/높이
      const rawWidth = (maxX - minX) + NODE_DIAMETER
      const rawHeight = (maxY - minY) + NODE_DIAMETER

      // 2) padding 비율만큼 bbox 를 확장 (유격)
      const marginX = rawWidth * VIEWPORT_PADDING_X
      const marginY = rawHeight * VIEWPORT_PADDING_Y

      const graphWidth = rawWidth + marginX * 2
      const graphHeight = rawHeight + marginY * 2

      // 3) 줌 배율 계산 (확장된 graphWidth/Height 기준)
      const zoomX = viewW / graphWidth
      const zoomY = viewH / graphHeight
      let zoom = Math.min(zoomX, zoomY)
      zoom = Math.min(Math.max(zoom, MIN_ZOOM), MAX_ZOOM)

      // 4) 그래프 중심 ↔ 화면 중심 정렬
      const graphCenterX = minX + rawWidth / 2
      const graphCenterY = minY + rawHeight / 2

      const screenCenterX = viewW / 2
      const screenCenterY = viewH / 2

      const x = screenCenterX - graphCenterX * zoom
      const y = screenCenterY - graphCenterY * zoom

      await setViewport({ x, y, zoom })
    }

    // pane 준비 시
    const handlePaneReady = async () => {
      await fitAllNodesWithViewport()
    }

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
</style>
