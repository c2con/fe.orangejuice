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
    const flowNodes = computed(() => {
      const nodes = workflowStore.nodes || []
      const edges = workflowStore.edges || []

      type Ports = { inputs: Set<string>; outputs: Set<string> }

      const usedPorts: Record<string, Ports> = {}
      const inputAngleMap: Record<string, Record<string, number>> = {}
      const outputAngleMap: Record<string, Record<string, number>> = {}

      // 1) 노드 중심 좌표 (각도 계산용)
      const centerMap: Record<string, { x: number; y: number }> = {}
      nodes.forEach((n) => {
        centerMap[n.id] = {
          x: n.position.x + NODE_DIAMETER / 2,
          y: n.position.y + NODE_DIAMETER / 2,
        }
        usedPorts[n.id] = { inputs: new Set(), outputs: new Set() }
        inputAngleMap[n.id] = {}
        outputAngleMap[n.id] = {}
      })

      // 2) 엣지 정보를 포트 + 각도 score 로 변환
      edges.forEach((edge) => {
        const srcCenter = centerMap[edge.source]
        const tgtCenter = centerMap[edge.target]
        if (!srcCenter || !tgtCenter) return

        const inCh =
            edge.targetChannel && edge.targetChannel.trim() !== ''
                ? edge.targetChannel
                : 'Data'
        const outCh =
            edge.sourceChannel && edge.sourceChannel.trim() !== ''
                ? edge.sourceChannel
                : 'Data'

        // ---- 타깃 노드(입력 포트) 처리 ----
        const targetPorts = usedPorts[edge.target]
        if (targetPorts) {
          targetPorts.inputs.add(inCh)

          const map =
              inputAngleMap[edge.target] ??
              (inputAngleMap[edge.target] = {})

          const score = getAngleScore(tgtCenter, srcCenter, true) // ✅ 입력: isInput = true
          const prev = map[inCh]
          // 같은 채널로 여러 노드가 연결되면 "가장 위쪽(가장 작은 score)" 유지
          if (prev === undefined || score < prev) {
            map[inCh] = score
          }
        }

        // ---- 소스 노드(출력 포트) 처리 ----
        const sourcePorts = usedPorts[edge.source]
        if (sourcePorts) {
          sourcePorts.outputs.add(outCh)

          const map =
              outputAngleMap[edge.source] ??
              (outputAngleMap[edge.source] = {})

          const score = getAngleScore(srcCenter, tgtCenter, false) // ✅ 출력: isInput = false
          const prev = map[outCh]
          if (prev === undefined || score < prev) {
            map[outCh] = score
          }
        }
      })

      // 3) 최종 VueFlow 노드로 변환
      return nodes.map((n) => {
        const def = getWidgetDef(n.widgetType)

        const ports = usedPorts[n.id]
        const inScores = inputAngleMap[n.id] || {}
        const outScores = outputAngleMap[n.id] || {}

        let inputNames: string[] = []
        let outputNames: string[] = []

        if (ports && (ports.inputs.size > 0 || ports.outputs.size > 0)) {
          // (A) 엣지 기반 포트가 있는 경우 → 각도 score 로 정렬
          inputNames = Array.from(ports.inputs)
          outputNames = Array.from(ports.outputs)

          // ✅ 입력 포트: 12시 기준 CCW, score 작은 순 = 화면에서 위쪽
          inputNames.sort(
              (a, b) =>
                  (inScores[a] ?? Number.POSITIVE_INFINITY) -
                  (inScores[b] ?? Number.POSITIVE_INFINITY),
          )

          // ✅ 출력 포트: 12시 기준 CW, score 작은 순 = 화면에서 위쪽
          outputNames.sort(
              (a, b) =>
                  (outScores[a] ?? Number.POSITIVE_INFINITY) -
                  (outScores[b] ?? Number.POSITIVE_INFINITY),
          )
        } else {
          // (B) 엣지가 전혀 없는 노드는 widgetDefinitions 기반
          const defInputs = (def.inputs || []) as any[]
          const defOutputs = (def.outputs || []) as any[]

          inputNames = defInputs.map((v) =>
              typeof v === 'string' ? v : v.name,
          )
          outputNames = defOutputs.map((v) =>
              typeof v === 'string' ? v : v.name,
          )
        }

        // (C) 그래도 비어 있으면 hasInput / hasOutput 플래그 기준으로 기본 'Data'
        if (inputNames.length === 0 && def.hasInput) inputNames.push('Data')
        if (outputNames.length === 0 && def.hasOutput) outputNames.push('Data')

        const inputsArray = inputNames.map((name) => ({ name }))
        const outputsArray = outputNames.map((name) => ({ name }))

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
    const flowEdges = computed(() => {
      const nodes = workflowStore.nodes || []
      const edges = workflowStore.edges || []

      if (!edges || edges.length === 0) return []

      // 1) 노드 중심 좌표 계산
      const centerMap: Record<string, { x: number; y: number }> = {}
      nodes.forEach((n) => {
        centerMap[n.id] = {
          x: n.position.x + NODE_DIAMETER / 2,
          y: n.position.y + NODE_DIAMETER / 2,
        }
      })

      // 2) 각 연결선에 대해 source/target 기준 각도 score 계산 후 정렬
      const sorted = [...edges].sort((a, b) => {
        const sa = centerMap[a.source]
        const ta = centerMap[a.target]
        const sb = centerMap[b.source]
        const tb = centerMap[b.target]

        if (!sa || !ta || !sb || !tb) return 0

        // 출력 기준(소스 노드 입장) 각도 – CW 기준
        const srcScoreA = getAngleScore(sa, ta, false)
        const srcScoreB = getAngleScore(sb, tb, false)

        // 입력 기준(타깃 노드 입장) 각도 – CCW 기준
        const tgtScoreA = getAngleScore(ta, sa, true)
        const tgtScoreB = getAngleScore(tb, sb, true)

        // ① 먼저 source 노드별로 묶고
        if (a.source !== b.source) return a.source.localeCompare(b.source)
        // ② 같은 source 안에서는 source 각도(위쪽→아래쪽) 순으로 정렬
        if (srcScoreA !== srcScoreB) return srcScoreA - srcScoreB
        // ③ 그래도 같으면 target 노드 ID
        if (a.target !== b.target) return a.target.localeCompare(b.target)
        // ④ 마지막으로 target 각도
        if (tgtScoreA !== tgtScoreB) return tgtScoreA - tgtScoreB
        // ⑤ 완전 동점이면 id 로 안정적인 정렬
        return Number(a.id ?? 0) - Number(b.id ?? 0)
      })

      // 3) 정렬된 순서대로 VueFlow 엣지 생성
      return sorted.map((e) => {
        const sHandle =
            e.sourceChannel && e.sourceChannel.trim() !== ''
                ? e.sourceChannel
                : 'Data'
        const tHandle =
            e.targetChannel && e.targetChannel.trim() !== ''
                ? e.targetChannel
                : 'Data'

        return {
          id: `e-${e.id}`,
          source: e.source,
          target: e.target,
          sourceHandle: sHandle,
          targetHandle: tHandle,
          type: 'default',
          animated: false,
          style: {
            stroke: '#8EA0B2',        // 원호와 동일한 진한 회색
            strokeWidth: 2,
            strokeDasharray: '4 4',   // 점선
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

    const openWidgetPickerAt = (cx: number, cy: number) => {
      const flowPos = project({ x: cx, y: cy })
      widgetPicker.visible = true
      widgetPicker.screenX = cx; widgetPicker.screenY = cy
      widgetPicker.flowX = flowPos.x; widgetPicker.flowY = flowPos.y
      searchText.value = ''
      nextTick(() => searchInputRef.value?.focus())
    }
    const closeWidgetPicker = () => { widgetPicker.visible = false }
    const handlePaneContextMenu = (e: MouseEvent) => { e.preventDefault(); openWidgetPickerAt(e.clientX, e.clientY) }
    const handlePaneClick = () => { if (widgetPicker.visible) closeWidgetPicker() }

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
.oj-widget-picker { position: fixed; z-index: 1000; transform: translate(-50%, -50%); min-width: 260px; padding: 8px; background: white; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); display: flex; flex-direction: column; gap: 8px; }
.oj-widget-picker-search { width: 100%; padding: 6px; border: 1px solid #ccc; border-radius: 4px; outline: none; }
.oj-widget-picker-search:focus { border-color: #2196F3; }
.oj-widget-picker-list { max-height: 200px; overflow-y: auto; list-style: none; padding: 0; margin: 0; }
.oj-widget-picker-item { display: flex; align-items: center; gap: 8px; padding: 6px; cursor: pointer; border-radius: 4px; }
.oj-widget-picker-item:hover { background: #f0f0f0; }
.oj-widget-picker-icon { width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.oj-widget-picker-icon img { width: 100%; height: 100%; object-fit: contain; }
.oj-widget-picker-label { font-size: 13px; color: #333; }
</style>