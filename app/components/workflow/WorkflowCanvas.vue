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
      />
    </ClientOnly>
  </div>
</template>

<script lang="ts">
import { defineNuxtComponent } from '#app'
import { computed, markRaw } from 'vue'
import { VueFlow } from '@vue-flow/core'
import type { NodeDragEvent, NodeTypesObject, Edge } from '@vue-flow/core'

import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'

import { useWorkflowStore } from '@/stores/workflow'
import type { WorkflowEdge } from '@/stores/workflow'
import OjNode from '@/components/workflow/OjNode.vue'
import { getWidgetDef } from '@/utils/widgetDefinitions'

export default defineNuxtComponent({
  ssr: false,
  components: {
    VueFlow,
  },
  setup() {
    const workflowStore = useWorkflowStore()

    // VueFlow 커스텀 노드 타입
    const nodeTypes: NodeTypesObject = {
      'oj-node': markRaw(OjNode) as any,
    }

    // 1) 노드별 "실제 입력 포트 이름" 목록 계산
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
          // 입력 포트 이름: targetChannel 우선, 없으면 label, 마지막으로 'Data'
          const portName = edge.targetChannel ?? edge.label ?? 'Data'
          if (!sortedInputs.includes(portName)) {
            sortedInputs.push(portName)
          }
        })

        const def = getWidgetDef(node.widgetType)
        // 연결된 에지가 없지만 위젯이 입력을 가진다면 기본 'Data' 추가
        if (sortedInputs.length === 0 && def.hasInput) {
          sortedInputs.push('Data')
        }

        inputsMap[node.id] = sortedInputs
      })

      return inputsMap
    })

    // 2) VueFlow 노드 생성
    const flowNodes = computed(() =>
        workflowStore.nodes.map((n) => {
          const def = getWidgetDef(n.widgetType)

          // 위젯 정의 기반 출력 포트 목록
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

              // [입력] – edge 기반으로 계산된 실제 포트 이름
              inputs: nodeRealInputs.value[n.id] || [],

              // [출력] – 위젯 정의 기반 고정 목록
              outputs: defOutputs,
            },
          }
        }),
    )

    // 3) VueFlow 엣지 생성 (입력/출력 핸들을 각도 기반으로 매핑)
    const flowEdges = computed<Edge[]>(() => {
      const nodeIds = new Set(flowNodes.value.map((n) => n.id))
      const storeEdges = workflowStore.edges as WorkflowEdge[]

      // 1) 실제 캔버스에 존재하는 노드 사이의 엣지만 사용
      const validEdges: WorkflowEdge[] = storeEdges.filter(
          (e) => nodeIds.has(e.source) && nodeIds.has(e.target),
      )

      // Edge 객체를 한 번만 만들어두고 id로 접근
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

      // ------------------------------------------------------------------
      // 2) [출력] 소스 기준 각도 정렬 → sourceHandle = out-0, out-1, ...
      // ------------------------------------------------------------------
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

      // ------------------------------------------------------------------
      // 3) [입력] 타겟 기준 각도 정렬 → targetHandle = in-0, in-1, ...
      // ------------------------------------------------------------------
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

      // ------------------------------------------------------------------
      // 4) 스타일 공통 적용 후 반환
      // ------------------------------------------------------------------
      baseEdges.forEach((e) => {
        e.style = { stroke: '#bdc3c7', strokeWidth: 2 }
      })

      return baseEdges
    })


    // 4) 노드 드래그 시 위치를 스토어에 반영
    function handleNodeDrag(event: NodeDragEvent) {
      const targetNode = workflowStore.nodes.find((n) => n.id === event.node.id)
      if (targetNode) {
        targetNode.position.x = event.node.position.x
        targetNode.position.y = event.node.position.y
      }
    }

    return {
      flowNodes,
      flowEdges,
      nodeTypes,
      handleNodeDrag,
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