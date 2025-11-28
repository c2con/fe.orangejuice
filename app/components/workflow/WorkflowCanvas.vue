<template>
  <div class="oj-workflow-wrapper">
    <VueFlow
        class="oj-workflow-canvas"
        :nodes="flowNodes"
        :edges="flowEdges"
        :node-types="nodeTypes"
        fit-view
        @node-drag="handleNodeDrag"
    />
  </div>
</template>

<script lang="ts">
import { defineNuxtComponent } from '#app'
import { computed, markRaw } from 'vue'
import { VueFlow } from '@vue-flow/core'
import type { NodeDragEvent } from '@vue-flow/core'

import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'

import { useWorkflowStore } from '@/stores/workflow'
import OjNode from '@/components/workflow/OjNode.vue'
import { getWidgetDef } from '@/utils/widgetDefinitions'

export default defineNuxtComponent({
  ssr: false,
  components: {
    VueFlow,
  },
  setup() {
    const workflowStore = useWorkflowStore()

    const nodeTypes = {
      'oj-node': markRaw(OjNode),
    }

    // 드래그 시 좌표 동기화 (연결선 꼬임 방지용)
    function handleNodeDrag(event: NodeDragEvent) {
      const targetNode = workflowStore.nodes.find(n => n.id === event.node.id)
      if (targetNode) {
        targetNode.position = event.node.position
      }
    }

    // 1. 엣지 기반 입력 포트 계산 (소스 Y좌표 정렬)
    const nodeRealInputs = computed(() => {
      const inputsMap: Record<string, string[]> = {}

      const edgesByTarget: Record<string, typeof workflowStore.edges> = {}
      workflowStore.edges.forEach(edge => {
        if (!edgesByTarget[edge.target]) edgesByTarget[edge.target] = []
        edgesByTarget[edge.target].push(edge)
      })

      workflowStore.nodes.forEach(node => {
        const incomingEdges = edgesByTarget[node.id] || []

        // 소스 노드 Y좌표 오름차순 정렬 (위 -> 아래)
        incomingEdges.sort((a, b) => {
          const sourceNodeA = workflowStore.nodes.find(n => n.id === a.source)
          const sourceNodeB = workflowStore.nodes.find(n => n.id === b.source)
          const yA = sourceNodeA ? sourceNodeA.position.y : 0
          const yB = sourceNodeB ? sourceNodeB.position.y : 0
          return yA - yB
        })

        const sortedInputs: string[] = []
        incomingEdges.forEach(edge => {
          const portName = edge.data?.sink_channel || edge.label || 'Data'
          if (!sortedInputs.includes(portName)) {
            sortedInputs.push(portName)
          }
        })

        // [수정] 정의 조회 시 widgetType 사용 (이게 더 정확함)
        const def = getWidgetDef(node.widgetType)
        if (sortedInputs.length === 0 && def.hasInput) {
          sortedInputs.push('Data')
        }

        inputsMap[node.id] = sortedInputs
      })

      return inputsMap
    })

    // 2. 노드 생성
    const flowNodes = computed(() =>
        workflowStore.nodes.map((n) => ({
          id: n.id,
          type: "oj-node",
          position: { x: n.position.x, y: n.position.y },
          data: {
            // [원복] 아이콘/색상 결정 ID는 widgetType 사용 (기존에 잘 나오던 값)
            widgetId: n.widgetType,

            // [유지] 라벨 표시는 title(사용자 지정) 우선, 없으면 name(기본값)
            label: n.title || n.name,

            inputs: nodeRealInputs.value[n.id] || [],
          },
        })),
    );

    // 3. 엣지 생성 (핸들 ID 매핑)
    const flowEdges = computed(() => {
      const nodeIds = new Set(flowNodes.value.map((n) => n.id))
      const validEdges = workflowStore.edges.filter(
          (e) => nodeIds.has(e.source) && nodeIds.has(e.target)
      )

      const mappedEdges = []
      const edgesBySource: Record<string, typeof validEdges> = {}

      validEdges.forEach(edge => {
        if (!edgesBySource[edge.source]) edgesBySource[edge.source] = []
        edgesBySource[edge.source].push(edge)
      })

      for (const sourceId in edgesBySource) {
        const edges = edgesBySource[sourceId]

        // 타겟 Y좌표 순 정렬 (출력 순서)
        const edgesWithTargetY = edges.map(edge => {
          const targetNode = workflowStore.nodes.find(n => n.id === edge.target)
          return { edge, y: targetNode ? targetNode.position.y : 0 }
        })
        edgesWithTargetY.sort((a, b) => a.y - b.y)

        edgesWithTargetY.forEach((item, index) => {
          const targetId = item.edge.target
          const portName = item.edge.data?.sink_channel || item.edge.label || 'Data'

          const targetPortList = nodeRealInputs.value[targetId] || []
          const inputIndex = targetPortList.indexOf(portName)
          const targetHandleId = inputIndex >= 0 ? `in-${inputIndex}` : 'in-0'

          mappedEdges.push({
            id: item.edge.id,
            source: item.edge.source,
            target: item.edge.target,
            label: item.edge.label ?? undefined,
            sourceHandle: `out-${index}`,
            targetHandle: targetHandleId,
            style: { stroke: '#bdc3c7', strokeWidth: 2 },
          })
        })
      }

      return mappedEdges
    })

    return {
      nodeTypes,
      flowNodes,
      flowEdges,
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