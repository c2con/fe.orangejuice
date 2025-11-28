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
    const nodeTypes = { 'oj-node': markRaw(OjNode) }

    function handleNodeDrag(event: NodeDragEvent) {
      const targetNode = workflowStore.nodes.find(n => n.id === event.node.id)
      if (targetNode) targetNode.position = event.node.position
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

        // 소스 노드 Y좌표 오름차순 정렬
        incomingEdges.sort((a, b) => {
          const nA = workflowStore.nodes.find(n => n.id === a.source)
          const nB = workflowStore.nodes.find(n => n.id === b.source)
          return (nA?.position.y || 0) - (nB?.position.y || 0)
        })

        const sortedInputs: string[] = []
        incomingEdges.forEach(edge => {
          const portName = edge.data?.sink_channel || edge.label || 'Data'
          if (!sortedInputs.includes(portName)) sortedInputs.push(portName)
        })

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
        workflowStore.nodes.map((n) => {
          // 정의 정보 가져오기
          const def = getWidgetDef(n.widgetType)

          return {
            id: n.id,
            type: "oj-node",
            position: { x: n.position.x, y: n.position.y },
            data: {
              label: n.title || n.name,
              widgetId: n.widgetType, // 매칭용 ID
              icon: def.icon,         // 아이콘 경로 전달

              // [입력] 동적 계산된 목록
              inputs: nodeRealInputs.value[n.id] || [],

              // [출력] 정의된 고정 목록 전달 (이게 없어서 출력이 안 나왔음)
              outputs: def.outputs || (def.hasOutput ? ['Data'] : [])
            },
          }
        })
    );

    // 3. 엣지 생성 (핸들 ID 매핑)
    const flowEdges = computed(() => {
      const nodeIds = new Set(flowNodes.value.map((n) => n.id))
      const validEdges = workflowStore.edges.filter(
          (e) => nodeIds.has(e.source) && nodeIds.has(e.target)
      )

      const mappedEdges = []

      // 소스 노드별 그룹화
      const edgesBySource: Record<string, typeof validEdges> = {}
      validEdges.forEach(edge => {
        if (!edgesBySource[edge.source]) edgesBySource[edge.source] = []
        edgesBySource[edge.source].push(edge)
      })

      for (const sourceId in edgesBySource) {
        const edges = edgesBySource[sourceId]

        // 타겟 Y좌표 순 정렬
        const edgesWithTargetY = edges.map(edge => {
          const targetNode = workflowStore.nodes.find(n => n.id === edge.target)
          return { edge, y: targetNode ? targetNode.position.y : 0 }
        })
        edgesWithTargetY.sort((a, b) => a.y - b.y)

        edgesWithTargetY.forEach((item, index) => {
          const targetId = item.edge.target
          const portName = item.edge.data?.sink_channel || item.edge.label || 'Data'

          // 타겟 노드의 입력 포트 목록에서 인덱스 찾기
          const targetPortList = nodeRealInputs.value[targetId] || []
          const inputIndex = targetPortList.indexOf(portName)
          const targetHandleId = inputIndex >= 0 ? `in-${inputIndex}` : 'in-0'

          mappedEdges.push({
            id: item.edge.id,
            source: item.edge.source,
            target: item.edge.target,
            label: item.edge.label ?? undefined,
            // 출력 핸들 ID: 위젯 정의의 outputs 인덱스 사용
            // (간소화를 위해 여기서는 순서대로 0,1..로 매핑.
            //  정확히 하려면 source_channel 이름을 outputs 배열에서 찾아야 함)
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