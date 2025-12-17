import historyIconUrl from '@/assets/icons/history.svg?url'
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
import { useVueFlow } from '@vue-flow/core'
import type {
    Edge as FlowEdge,
    Node as FlowNode,
    NodeDragEvent,
    NodeTypesObject,
    EdgeTypesObject,
} from '@vue-flow/core'

import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'

import OjNode from '@/components/workflow/OjNode.vue'
import OjEdge from '@/components/workflow/OjEdge.vue'

import { useWorkflowStore } from '@/stores/workflow'
import { useHistoryStore, makeAddNodeCommand, makeAddEdgeCommand, makeDeleteEdgesCommand, makeDeleteNodesBatchCommand } from '@/stores/historyStore'

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
    sourceChannel: string | null
    targetChannel: string | null
    enable: boolean
    label: string | null
}

type PickerWidget = WidgetDefinition & { id: string; categoryColor: string }

export function useWorkflowCanvas() {
    const workflowStore = useWorkflowStore()
    const historyStore = useHistoryStore()

    // 우측 패널 열림/닫힘 (원래 지침은 uiStore 권장인데, 일단 바로 동작하는 형태로 local 처리)
    const isHistoryOpen = ref(false)
    const didConnectInGesture = ref(false)

    const vf: any = useVueFlow()

    const project = vf.project as (p: { x: number; y: number }) => { x: number; y: number }
    const setViewport = vf.setViewport as (v: { x: number; y: number; zoom: number }) => Promise<void> | void
    const dimensions = vf.dimensions as { value?: { width: number; height: number } }
    const updateNodeInternals = vf.updateNodeInternals as (ids: string[]) => void

    const getSelectedEdgesRaw = vf.getSelectedEdges
    const removeEdgesRaw = vf.removeEdges

    const getSelectedNodesRaw = vf.getSelectedNodes
    const removeNodesRaw = vf.removeNodes

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
        if (!rect) return project({x: clientX, y: clientY})
        return project({
            x: clientX - rect.left,
            y: clientY - rect.top,
        })
    }

    const stripHandleIndex = (h?: string | null) => (h ? h.split('#')[0] : undefined)

    const ensureNodeInternals = async (nodeId: string) => {
        await nextTick()

        if (typeof updateNodeInternals !== 'function') return

        requestAnimationFrame(() => {
            try {
                updateNodeInternals([nodeId])
            } catch (e) {
                console.warn('[ensureNodeInternals] failed:', e)
            }
        })
    }

    const safeScore = (
        center: { x: number; y: number },
        other: { x: number; y: number } | undefined,
        isInput: boolean,
    ) => {
        const p = other ?? center
        return getAngleScore(center, p, isInput)
    }

    // =========================================================
    // Node / Edge Types
    // =========================================================
    const nodeTypes: NodeTypesObject = {'oj-node': markRaw(OjNode) as any}
    const edgeTypes: EdgeTypesObject = {'oj-edge': markRaw(OjEdge) as any}

    const dragStartPos = new Map<string, { x: number; y: number }>()
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
        return Object.entries(WIDGET_DEFINITIONS).map(([id, w]) => ({
            ...(w as any),
            id,
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
        void nextTick(() => {
            searchText.value = ''
            searchInputRef.value?.focus?.()
        })
    }

    const closeWidgetPicker = () => {
        widgetPicker.visible = false
    }

    // =========================================================
    // Node add (History Command 경유)
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
            position: {x, y},
            params: {},
        }
    }

    const addNodeAtFlowPos = async (widgetId: string, x: number, y: number) => {
        const node = createStoreNode(widgetId, x, y)

        // 0) 상태 점검
        console.log('[addNode] before', {
            widgetId,
            x,
            y,
            nodesLen: workflowStore.nodes?.length,
            edgesLen: workflowStore.edges?.length,
        })

        // 1) history execute 시도
        const beforeLen = workflowStore.nodes?.length ?? 0
        try {
            console.log('[HISTORY] before execute, undo len =', historyStore.undoStack.length)
            historyStore.execute(makeAddNodeCommand(node))
            console.log('[HISTORY] after execute, undo len =', historyStore.undoStack.length)
        } catch (e) {
            console.error('[addNode] history execute failed:', e)
        }

        // 2) history가 실제로 nodes를 늘렸는지 확인
        const afterLen = workflowStore.nodes?.length ?? 0
        console.log('[addNode] after execute', {beforeLen, afterLen})

        // 3) ✅ 안 늘었으면 fallback으로 직접 push (무조건 화면에 나오게)
        if (afterLen === beforeLen) {
            console.warn('[addNode] fallback push node (history did not mutate store)')
            ;(workflowStore.nodes ??= [] as any)
            workflowStore.nodes.push(node as any)
        }

        await nextTick()

        // 4) internals 업데이트는 "가능할 때만"
        try {
            await ensureNodeInternals(node.id)
        } catch (e) {
            console.warn('[addNode] ensureNodeInternals failed:', e)
        }

        console.log('[addNode] final nodesLen=', workflowStore.nodes.length)
        return node.id
    }

    const createNodeFromWidget = async (w: PickerWidget) => {
        if (!w?.id) return

        try {
            console.log('[picker] select', w.id, widgetPicker.anchorFlowX, widgetPicker.anchorFlowY)

            await addNodeAtFlowPos(w.id, widgetPicker.anchorFlowX, widgetPicker.anchorFlowY)

            console.log('[picker] added. nodes=', workflowStore.nodes.length)
            closeWidgetPicker() // ✅ 성공했을 때만 닫기
        } catch (err) {
            console.error('[picker] add node failed:', err)
            // 실패 시에는 닫지 말고 그대로 두는게 UX도 좋음
        }
    }

    const onNodeDragStart = (e: any) => {
        const id = String(e?.node?.id ?? '')
        if (!id) return
        dragStartPos.set(id, { x: e.node.position.x, y: e.node.position.y })
    }

    const onNodeDragStop = (e: any) => {
        const id = String(e?.node?.id ?? '')
        if (!id) return

        const from = dragStartPos.get(id)
        const to = { x: e.node.position.x, y: e.node.position.y }
        dragStartPos.delete(id)

        if (!from) return
        if (from.x === to.x && from.y === to.y) return // 움직임 없으면 기록 안 함

        historyStore.execute(makeMoveNodeCommand(id, from, to))
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

            const defaultIn = (defInputs[0] ?? 'Data') as string
            const defaultOut = (defOutputs[0] ?? 'Data') as string

            const inputsArray =
                incoming.length > 0
                    ? incoming.map((e, idx) => {
                        const ch = (e.targetChannel && String(e.targetChannel).trim() !== '') ? String(e.targetChannel) : defaultIn
                        return {id: `${ch}#${idx}`, name: ch}
                    })
                    : (defInputs.length > 0 ? [{id: `${defaultIn}#0`, name: defaultIn}] : [])

            const outputsArray =
                outgoing.length > 0
                    ? outgoing.map((e, idx) => {
                        const ch = (e.sourceChannel && String(e.sourceChannel).trim() !== '') ? String(e.sourceChannel) : defaultOut
                        return {id: `${ch}#${idx}`, name: ch}
                    })
                    : (defOutputs.length > 0 ? [{id: `${defaultOut}#0`, name: defaultOut}] : [])


            return {
                id: n.id,
                type: 'oj-node',
                position: {x: n.position.x, y: n.position.y},
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
    // Flow Edges (OjEdge 사용)
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
            const enabled = e.enable
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

                // ✅ 커스텀 edge로 라벨(textPath) 렌더
                type: 'oj-edge',

                // ✅ OjEdge가 읽는 data
                data: {
                    label,
                    enabled,
                },
            } as FlowEdge
        })
    })

    // =========================================================
    // Node Drag (현재는 즉시 반영, 추후 node/move 커맨드로 분리 가능)
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
        didConnectInGesture.value = false
    }

    const handleConnect = (params: any) => {
        console.log('[edge connect]', params.sourceHandle, '->', params.targetHandle)
        const sId = String(params.source || '')
        const tId = String(params.target || '')
        if (!sId || !tId) return

        // 중복 연결 방지(있다면 유지)
        if (hasSameConnection(sId, tId)) return

        const newEdge: StoreEdge = {
            id: `edge_${Date.now()}_${Math.random().toString(16).slice(2)}`,
            source: sId,
            target: tId,
            sourceChannel: stripHandleIndex(params.sourceHandle) ?? 'Data',
            targetChannel: stripHandleIndex(params.targetHandle) ?? 'Data',
            enable: false,
            label: null,
        }

        // ✅ 직접 push 금지
        // workflowStore.edges.push(newEdge)  <-- 있으면 제거

        // ✅ 히스토리로만 추가
        historyStore.execute(makeAddEdgeCommand(newEdge))

        didConnectInGesture.value = true
        void ensureNodeInternals(sId)
        void ensureNodeInternals(tId)
    }



    const handleConnectEnd = (evt: any) => {
        const mouse = evt?.event as MouseEvent | undefined

        // ✅ 연결 성공이면 팝업 띄우지 않음
        if (didConnectInGesture.value) {
            connectingFrom.value = null
            return
        }

        // ✅ 연결 실패(빈 공간 드롭)일 때만 팝업
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

        await setViewport({
            x: viewW / 2 - cx * zoom,
            y: viewH / 2 - cy * zoom,
            zoom,
        })

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
    // Delete helpers (VueFlow selection 정리)
    // =========================================================
    const readSelectedEdges = (): any[] => {
        if (typeof getSelectedEdgesRaw === 'function') {
            try {
                return getSelectedEdgesRaw() || []
            } catch {
                return []
            }
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

    const readSelectedNodes = (): any[] => {
        if (typeof getSelectedNodesRaw === 'function') {
            try {
                return getSelectedNodesRaw() || []
            } catch {
                return []
            }
        }
        if (getSelectedNodesRaw && typeof getSelectedNodesRaw === 'object' && 'value' in getSelectedNodesRaw) {
            return (getSelectedNodesRaw.value as any[]) || []
        }
        return []
    }

    const removeNodesSafe = (nodeIds: string[]) => {
        if (!nodeIds.length) return
        if (typeof removeNodesRaw === 'function') {
            removeNodesRaw(nodeIds)
            return
        }
        if (removeNodesRaw && typeof removeNodesRaw === 'object' && typeof removeNodesRaw.value === 'function') {
            removeNodesRaw.value(nodeIds)
        }
    }

    // =========================================================
    // Delete Selected Edges (History Command 경유)
    // =========================================================
    const deleteSelectedEdges = async () => {
        const selected = readSelectedEdges()
        if (!selected.length) return

        const edges = (workflowStore.edges || []) as unknown as StoreEdge[]
        const storeEdgeIds: string[] = []
        const flowEdgeIds: string[] = []
        const affectedNodeIds = new Set<string>()

        selected.forEach((fe: any) => {
            const flowId = String(fe.id || '')
            if (!flowId) return
            flowEdgeIds.push(flowId)

            const storeId = flowId.startsWith('e-') ? flowId.slice(2) : flowId
            const edge = edges.find((e) => e.id === storeId)
            if (!edge) return

            storeEdgeIds.push(storeId)
            affectedNodeIds.add(edge.source)
            affectedNodeIds.add(edge.target)
        })

        // VueFlow selection 먼저 제거
        removeEdgesSafe(flowEdgeIds)

        // 스토어 변경은 History 커맨드로
        historyStore.execute(makeDeleteEdgesCommand(storeEdgeIds))

        await nextTick()
        affectedNodeIds.forEach((nid) => updateNodeInternals([nid]))
    }

    // =========================================================
    // Delete Selected Nodes (batch: 연결 edge 삭제 + node 삭제)
    // =========================================================
    const deleteSelectedNodes = async () => {
        const selected = readSelectedNodes()
        if (!selected.length) return

        const nodeIds: string[] = []
        selected.forEach((fn: any) => {
            const nid = String(fn.id || '')
            if (nid) nodeIds.push(nid)
        })
        if (!nodeIds.length) return

        // VueFlow selection 먼저 제거
        removeNodesSafe(nodeIds)

        // batch 커맨드 실행 (edge+node 동시)
        historyStore.execute(makeDeleteNodesBatchCommand(nodeIds))

        await nextTick()
    }

    // =========================================================
    // Delete / Backspace
    // =========================================================
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

        const selectedNodes = readSelectedNodes()
        if (selectedNodes.length) {
            e.preventDefault()
            e.stopPropagation()
            void deleteSelectedNodes()
            return
        }

        const selectedEdges = readSelectedEdges()
        if (selectedEdges.length) {
            e.preventDefault()
            e.stopPropagation()
            void deleteSelectedEdges()
            return
        }
    }

    // =========================================================
    // Global mouse down: picker 밖 클릭 닫기
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
    }
}