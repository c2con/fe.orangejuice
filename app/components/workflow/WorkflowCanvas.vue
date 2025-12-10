<template>
  <div class="oj-workflow-wrapper">
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
        <Background pattern-color="#888" :gap="20" :size="1.5" />
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
            <span class="oj-widget-picker-icon" :style="{ backgroundColor: w.categoryColor }">
              <img :src="w.icon" alt="" />
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
    const { project, setViewport, dimensions } = useVueFlow()

    const widgetPicker = reactive({ visible: false, screenX: 0, screenY: 0, flowX: 0, flowY: 0 })
    const pickerRef = ref<HTMLElement | null>(null)
    const searchInputRef = ref<HTMLInputElement | null>(null)
    const searchText = ref('')

    const allWidgets = computed(() => Object.values(WIDGET_DEFINITIONS).map((w) => ({ ...w, categoryColor: getCategoryColor(w.categoryId) })))
    const filteredWidgets = computed(() => {
      const q = searchText.value.trim().toLowerCase()
      if (!q) return allWidgets.value
      return allWidgets.value.filter((w) => w.label.toLowerCase().includes(q) || w.id.toLowerCase().includes(q))
    })

    const nodeTypes: NodeTypesObject = { 'oj-node': markRaw(OjNode) as any }

    // [디버그]
    watch(() => workflowStore.nodes.length, (len) => {
      if (len > 0) console.log("🍊 Nodes Loaded:", len);
    });

    // ------------------------------------------------------------------
    // [1] 노드 & 포트 계산 (타입 에러 완전 제거)
    // ------------------------------------------------------------------
// [1] 노드 & 포트 계산: 엣지 기준, 각도 정렬
    const flowNodes = computed(() => {
      const nodes = workflowStore.nodes || []
      const edges = workflowStore.edges || []

      // 노드 중심 좌표 (각도계산용)
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

        // 이 노드로 들어오는 / 나가는 엣지
        const incoming = edges.filter(
            (e) => e.target === n.id && centerMap[e.source],
        )
        const outgoing = edges.filter(
            (e) => e.source === n.id && centerMap[e.target],
        )

        const hasAnyEdge = incoming.length > 0 || outgoing.length > 0

        // 각도 기준 정렬 (입력: CCW, 출력: CW)
        // center가 없으면 각도 정렬 자체를 스킵
        if (center) {
          incoming.sort((a, b) => {
            const srcA = centerMap[a.source]
            const srcB = centerMap[b.source]

            // 소스 노드 중심이 계산 안 되면 비교 불가 → 0
            if (!srcA || !srcB) return 0

            const sa = getAngleScore(center, srcA, true)   // 입력: isInput = true (CCW)
            const sb = getAngleScore(center, srcB, true)

            return sa - sb
          })
        }
        if (center) {
          outgoing.sort((a, b) => {
            const tgtA = centerMap[a.target]
            const tgtB = centerMap[b.target]

            if (!tgtA || !tgtB) return 0

            const sa = getAngleScore(center, tgtA, false)  // 출력: isInput = false (CW)
            const sb = getAngleScore(center, tgtB, false)

            return sa - sb
          })
        }

        // ---- 입력 포트 배열 ----
        let inputsArray: { id: string; name: string }[]
        if (incoming.length > 0) {
          // ✅ 엣지 기반: 엣지 개수만큼 포트 생성
          inputsArray = incoming.map((e, idx) => {
            const ch =
                e.targetChannel && e.targetChannel.trim() !== ''
                    ? e.targetChannel
                    : 'Data'
            return {
              id: `${ch}#${idx}`, // 고유 handle id
              name: ch,
            }
          })
        } else if (!hasAnyEdge) {
          // ⚪ 엣지가 전혀 없는 노드만 widgetDefinitions 기반 포트 표시
          const defInputs = (def.inputs || []) as any[]
          inputsArray = defInputs.map((v, idx) => {
            const ch = (typeof v === 'string' ? v : v.name) || 'Data'
            return { id: ch, name: ch }
          })
        } else {
          // 입력 엣지는 없고, 다른 방향 엣지는 있는 경우 → 입력 포트 없음
          inputsArray = []
        }

        // ---- 출력 포트 배열 ----
        let outputsArray: { id: string; name: string }[]
        if (outgoing.length > 0) {
          outputsArray = outgoing.map((e, idx) => {
            const ch =
                e.sourceChannel && e.sourceChannel.trim() !== ''
                    ? e.sourceChannel
                    : 'Data'
            return {
              id: `${ch}#${idx}`,
              name: ch,
            }
          })
        } else if (!hasAnyEdge) {
          const defOutputs = (def.outputs || []) as any[]
          outputsArray = defOutputs.map((v, idx) => {
            const ch = (typeof v === 'string' ? v : v.name) || 'Data'
            return { id: ch, name: ch }
          })
        } else {
          // 출력 엣지는 없고, 다른 방향 엣지는 있는 경우 → 출력 포트 없음
          outputsArray = []
        }

        return {
          id: n.id,
          type: 'oj-node',
          position: { x: n.position.x, y: n.position.y },
          data: {
            label: n.title || n.name,
            widgetId: n.widgetType,
            icon: def.icon,
            inputs: inputsArray,
            outputs: outputsArray,
          },
        }
      })
    })

    // ------------------------------------------------------------------
    // [2] 엣지 생성 (ID 충돌 방지: e- 접두어)
    // ------------------------------------------------------------------
// [2] 엣지 생성: 각도 순서대로 handle id 매핑
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

      // 노드별로 in/out 엣지를 다시 정렬해서 동일 규칙으로 handle id 부여
      nodes.forEach((n) => {
        const center = centerMap[n.id]
        if (!center) return

        const outEdges = edges.filter(
            (e) => e.source === n.id && centerMap[e.target],
        )
        outEdges.sort((a, b) => {
          // center 가 없으면 비교 자체를 하지 않는다
          if (!center) return 0

          const tgtA = centerMap[a.target]
          const tgtB = centerMap[b.target]

          // 혹시라도 대상 노드 중심이 없으면 비교 불가 → 0
          if (!tgtA || !tgtB) return 0

          const sa = getAngleScore(center, tgtA, false)  // ▶ 여기서 타입 확정
          const sb = getAngleScore(center, tgtB, false)

          return sa - sb
        })
        outEdges.forEach((e, idx) => {
          const ch =
              e.sourceChannel && e.sourceChannel.trim() !== ''
                  ? e.sourceChannel
                  : 'Data'
          sourceHandleMap[e.id] = `${ch}#${idx}`
        })

        const inEdges = edges.filter(
            (e) => e.target === n.id && centerMap[e.source],
        )
        inEdges.sort((a, b) => {
          // 현재 노드 중심도 undefined 가능성이 있다고 TS는 봄
          if (!center) return 0

          const srcA = centerMap[a.source]
          const srcB = centerMap[b.source]

          // source 중심이 없으면 비교 불가 → 0
          if (!srcA || !srcB) return 0

          const sa = getAngleScore(center, srcA, true)   // 입력: CCW
          const sb = getAngleScore(center, srcB, true)

          return sa - sb
        })
        inEdges.forEach((e, idx) => {
          const ch =
              e.targetChannel && e.targetChannel.trim() !== ''
                  ? e.targetChannel
                  : 'Data'
          targetHandleMap[e.id] = `${ch}#${idx}`
        })
      })

      return edges.map((e) => {
        const baseSource =
            e.sourceChannel && e.sourceChannel.trim() !== ''
                ? e.sourceChannel
                : 'Data'
        const baseTarget =
            e.targetChannel && e.targetChannel.trim() !== ''
                ? e.targetChannel
                : 'Data'

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

    // ... (이하 드래그 핸들러 등은 기존과 동일) ...
    function handleNodeDrag(event: NodeDragEvent) {
      const target = workflowStore.nodes.find((n) => n.id === event.node.id)
      if (target) {
        target.position.x = event.node.position.x
        target.position.y = event.node.position.y
      }
    }

    const hasViewportFitted = ref(false)
    const fitAllNodesWithViewport = async () => {
      if (hasViewportFitted.value || flowNodes.value.length === 0) return
      await nextTick()
      const nodes = flowNodes.value
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
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
        x: (viewW / 2) - (cx * Math.max(MIN_ZOOM, zoom)),
        y: (viewH / 2) - (cy * Math.max(MIN_ZOOM, zoom)),
        zoom: Math.max(MIN_ZOOM, zoom)
      })
      hasViewportFitted.value = true
    }

    const handlePaneReady = () => { fitAllNodesWithViewport() }

    const connectingFrom = ref<any>(null)
    const handleConnectStart = (params: any) => { connectingFrom.value = params }
    const handleConnect = (params: any) => {
      const newEdge = {
            id: `e-${Date.now()}`,
            source: params.source,
            target: params.target,
            sourceChannel: params.sourceHandle || 'Data',
            targetChannel: params.targetHandle || 'Data',
          }
      ;(workflowStore.edges as any[]).push(newEdge)
    }
    const handleConnectEnd = (evt: any) => {
      if (!connectingFrom.value) return
      const mouse = evt?.event as MouseEvent
      if (mouse) openWidgetPickerAt(mouse.clientX, mouse.clientY)
      connectingFrom.value = null
    }

    const openWidgetPickerAt = (px: number, py: number) => {
      // 클릭한 화면 좌표를 그대로 대화상자 좌상단으로 사용
      widgetPicker.screenX = px
      widgetPicker.screenY = py

      // VueFlow 좌표로 변환
      const flowPos = project({ x: px, y: py })

      widgetPicker.flowX = flowPos.x
      widgetPicker.flowY = flowPos.y

      widgetPicker.visible = true

      // (선택) 검색창 자동 포커스
      nextTick(() => {
        if (searchInputRef.value) searchInputRef.value.focus()
      })
    }
    const closeWidgetPicker = () => { widgetPicker.visible = false }
    const handlePaneContextMenu = (e: MouseEvent) => { e.preventDefault(); openWidgetPickerAt(e.clientX, e.clientY) }
    const handlePaneClick = (e: MouseEvent) => {
      // 왼쪽 버튼 클릭일 때만 동작 (원하면 제거해도 됨)
      if (e.button !== 0) return

      openWidgetPickerAt(e.clientX, e.clientY)
    }

    const createNodeFromWidget = (w: WidgetDefinition & { categoryColor?: string }) => {
      const newNodeId = `node_${Date.now()}`
      const newNode: any = {
            id: newNodeId, widgetType: w.id, name: w.label, title: w.label,
            position: { x: widgetPicker.flowX, y: widgetPicker.flowY }, params: {}
          }
      ;(workflowStore.nodes as any[]).push(newNode)
      if (connectingFrom.value) {
        const from = connectingFrom.value
        const isSrc = from.handleType === 'source'
        const def = getWidgetDef(w.id);
        const defInputs = (def.inputs || []) as any[];
        const defOutputs = (def.outputs || []) as any[];

        const firstInput = (defInputs[0] && typeof defInputs[0] === 'object' ? defInputs[0].name : defInputs[0]) || 'Data';
        const firstOutput = (defOutputs[0] && typeof defOutputs[0] === 'object' ? defOutputs[0].name : defOutputs[0]) || 'Data';

        const targetPort = isSrc ? firstInput : (from.handleId);
        const sourcePort = isSrc ? (from.handleId) : firstOutput;
        const newEdge = {
              id: `edge_${Date.now()}`,
              source: isSrc ? from.nodeId : newNodeId,
              target: isSrc ? newNodeId : from.nodeId,
              sourceChannel: sourcePort,
              targetChannel: targetPort
            }
        ;(workflowStore.edges as any[]).push(newEdge)
      }
      closeWidgetPicker()
    }

    watch(() => flowNodes.value.length, async (newLen, oldLen) => {
      if (oldLen === 0 && newLen > 0) {
        hasViewportFitted.value = false
        await fitAllNodesWithViewport()
      }
    })

    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') closeWidgetPicker() }
    const onGlobalMouseDown = (e: MouseEvent) => {
      if (widgetPicker.visible && pickerRef.value && !pickerRef.value.contains(e.target as Node)) {
        closeWidgetPicker()
      }
    }
    onMounted(() => {
      window.addEventListener('keydown', onKeyDown)
      window.addEventListener('mousedown', onGlobalMouseDown)
    })
    onBeforeUnmount(() => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('mousedown', onGlobalMouseDown)
    })

    return {
      flowNodes, flowEdges, nodeTypes,
      handleNodeDrag, handlePaneReady, handleConnectStart, handleConnect, handleConnectEnd,
      handlePaneContextMenu, handlePaneClick, widgetPicker, pickerRef, searchInputRef,
      filteredWidgets, createNodeFromWidget, searchText
    }
  }
})
</script>

<style scoped>
.oj-workflow-wrapper { flex: 1; display: flex; height: 100%; min-width: 0; }
.oj-workflow-canvas { width: 100%; height: 100%; background: #f8fafc; }
.oj-widget-picker { position: fixed; z-index: 1000; min-width: 260px; padding: 8px; background: white; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); display: flex; flex-direction: column; gap: 8px; }
.oj-widget-picker-search { width: 100%; padding: 6px; border: 1px solid #ccc; border-radius: 4px; outline: none; }
.oj-widget-picker-search:focus { border-color: #2196F3; }
.oj-widget-picker-list { max-height: 200px; overflow-y: auto; list-style: none; padding: 0; margin: 0; }
.oj-widget-picker-item { display: flex; align-items: center; gap: 8px; padding: 6px; cursor: pointer; border-radius: 4px; }
.oj-widget-picker-item:hover { background: #f0f0f0; }
.oj-widget-picker-icon { width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.oj-widget-picker-icon img { width: 100%; height: 100%; object-fit: contain; }
.oj-widget-picker-label { font-size: 13px; color: #333; }
</style>