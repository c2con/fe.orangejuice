// stores/historyStore.ts
import { defineStore } from 'pinia'
import { useWorkflowStore } from '@/stores/workflow'

/** =========================
 *  Store Types (workflow.ts와 동일하게 맞추기)
 *  ========================= */
export type WorkflowNode = {
    id: string
    widgetType: string
    name: string
    title: string
    label: string
    position: { x: number; y: number }
    params: Record<string, any>
}

export type WorkflowEdge = {
    id: string
    source: string
    target: string
    sourceChannel: string | null
    targetChannel: string | null
    enable: boolean
    label: string | null
}

/** workflow store shape (Pinia store instance 타입) */
type WorkflowStore = ReturnType<typeof useWorkflowStore>

const deepClone = <T>(v: T): T => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sc = (globalThis as any).structuredClone as ((x: any) => any) | undefined
    if (sc) return sc(v)
    return JSON.parse(JSON.stringify(v)) as T
}

export type CommandType =
    | 'node/add'
    | 'node/delete'
    | 'node/move'
    | 'node/updateParams'
    | 'edge/add'
    | 'edge/delete'
    | 'batch'

export type SerializedCommand = {
    id: string
    type: CommandType
    timestamp: number
    payload: any
    version: 'v1'
}

/**
 * ✅ 핵심 변경점:
 * do/undo가 workflow store를 인자로 받는다.
 * (Command 내부에서 useWorkflowStore() 호출 금지)
 */
export interface HistoryCommand {
    id: string
    type: CommandType
    timestamp: number
    payload: any
    do(workflow: WorkflowStore): void
    undo(workflow: WorkflowStore): void
    serialize(): SerializedCommand
}

const newId = (prefix: string) =>
    `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`

const snapshotNode = (n: any) => ({
    id: String(n.id),
    widgetType: String(n.widgetType ?? ''),
    name: String(n.name ?? ''),
    title: String(n.title ?? ''),
    label: String(n.label ?? ''),
    position: { x: Number(n.position?.x ?? 0), y: Number(n.position?.y ?? 0) },
    params: (n.params && typeof n.params === 'object') ? JSON.parse(JSON.stringify(n.params)) : {},
})

const snapshotEdge = (e: any) => ({
    id: String(e.id),
    source: String(e.source),
    target: String(e.target),
    sourceChannel: e.sourceChannel ?? null,
    targetChannel: e.targetChannel ?? null,
    enable: Boolean(e.enable),
    label: e.label ?? null,
})

/** =========================
 *  Commands
 *  ========================= */

const cmdNodeAdd = (
    node: WorkflowNode,
    fixed?: Pick<SerializedCommand, 'id' | 'timestamp'>,
): HistoryCommand => {
    const id = fixed?.id ?? newId('cmd')
    const timestamp = fixed?.timestamp ?? Date.now()
    const payload = { node: deepClone(node) }

    return {
        id,
        type: 'node/add',
        timestamp,
        payload,
        do(workflow) {
            ;(workflow.nodes ??= [] as any)
            const exists = (workflow.nodes as any[]).some((n: any) => n.id === payload.node.id)
            if (!exists) (workflow.nodes as any[]).push(deepClone(payload.node) as any)
        },
        undo(workflow) {
            ;(workflow.nodes ??= [] as any)
            ;(workflow.edges ??= [] as any)
            workflow.nodes = (workflow.nodes as any[]).filter((n: any) => n.id !== payload.node.id) as any
            workflow.edges = (workflow.edges as any[]).filter(
                (e: any) => e.source !== payload.node.id && e.target !== payload.node.id,
            ) as any
        },
        serialize() {
            return { id, type: 'node/add', timestamp, payload: deepClone(payload), version: 'v1' }
        },
    }
}

const cmdNodeMove = (
    nodeId: string,
    from: { x: number; y: number },
    to: { x: number; y: number },
    label: string,
    fixed?: Pick<SerializedCommand, 'id' | 'timestamp'>,
): HistoryCommand => {
    const id = fixed?.id ?? newId('cmd')
    const timestamp = fixed?.timestamp ?? Date.now()

    const payload = {
        nodeId: String(nodeId),
        label: String(label ?? ''),
        from: { x: Number(from.x), y: Number(from.y) },
        to: { x: Number(to.x), y: Number(to.y) },
    }

    return {
        id,
        type: 'node/move',
        timestamp,
        payload,

        do(workflow) {
            const n = (workflow.nodes as any[]).find(
                (x: any) => x.id === payload.nodeId,
            )
            if (!n) return
            n.position = { x: payload.to.x, y: payload.to.y }
        },

        undo(workflow) {
            const n = (workflow.nodes as any[]).find(
                (x: any) => x.id === payload.nodeId,
            )
            if (!n) return
            n.position = { x: payload.from.x, y: payload.from.y }
        },

        serialize() {
            return {
                id,
                type: 'node/move',
                timestamp,
                payload,
                version: 'v1',
            }
        },
    }
}


const cmdEdgeAdd = (
    edge: WorkflowEdge,
    fixed?: Pick<SerializedCommand, 'id' | 'timestamp'>,
): HistoryCommand => {
    const id = fixed?.id ?? newId('cmd')
    const timestamp = fixed?.timestamp ?? Date.now()
    const payload = { edge: snapshotEdge(edge) } // ✅ 스냅샷

    return {
        id,
        type: 'edge/add',
        timestamp,
        payload,

        do(workflow) {
            ;(workflow.edges ??= [] as any)
            const exists = (workflow.edges as any[]).some(
                (e: any) => e.id === payload.edge.id,
            )
            if (!exists) (workflow.edges as any[]).push(payload.edge as any)
        },

        undo(workflow) {
            ;(workflow.edges ??= [] as any)
            workflow.edges = (workflow.edges as any[]).filter(
                (e: any) => e.id !== payload.edge.id,
            ) as any
        },

        serialize() {
            return {
                id,
                type: 'edge/add',
                timestamp,
                payload, // ✅ 이미 직렬화 안전
                version: 'v1',
            }
        },
    }
}


const cmdEdgesDelete = (
    edgesSnapshot: WorkflowEdge[],
    fixed?: Pick<SerializedCommand, 'id' | 'timestamp'>,
): HistoryCommand => {
    const id = fixed?.id ?? newId('cmd')
    const timestamp = fixed?.timestamp ?? Date.now()
    const payload = { edges: deepClone(edgesSnapshot) }

    return {
        id,
        type: 'edge/delete',
        timestamp,
        payload,
        do(workflow) {
            ;(workflow.edges ??= [] as any)
            const delIds = new Set<string>((payload.edges as WorkflowEdge[]).map((e) => e.id))
            workflow.edges = (workflow.edges as any[]).filter((e: any) => !delIds.has(e.id)) as any
        },
        undo(workflow) {
            ;(workflow.edges ??= [] as any)
            const existing = new Set<string>((workflow.edges as any[]).map((e: any) => e.id))
            ;(payload.edges as WorkflowEdge[]).forEach((e) => {
                if (!existing.has(e.id)) (workflow.edges as any[]).push(deepClone(e) as any)
            })
        },
        serialize() {
            return { id, type: 'edge/delete', timestamp, payload: deepClone(payload), version: 'v1' }
        },
    }
}

const cmdNodesDelete = (
    nodesSnapshot: WorkflowNode[],
    fixed?: Pick<SerializedCommand, 'id' | 'timestamp'>,
): HistoryCommand => {
    const id = fixed?.id ?? newId('cmd')
    const timestamp = fixed?.timestamp ?? Date.now()
    const payload = { nodes: deepClone(nodesSnapshot) }

    return {
        id,
        type: 'node/delete',
        timestamp,
        payload,
        do(workflow) {
            ;(workflow.nodes ??= [] as any)
            ;(workflow.edges ??= [] as any)
            const delIds = new Set<string>((payload.nodes as WorkflowNode[]).map((n) => n.id))
            workflow.nodes = (workflow.nodes as any[]).filter((n: any) => !delIds.has(n.id)) as any
            workflow.edges = (workflow.edges as any[]).filter(
                (e: any) => !delIds.has(e.source) && !delIds.has(e.target),
            ) as any
        },
        undo(workflow) {
            ;(workflow.nodes ??= [] as any)
            const existing = new Set<string>((workflow.nodes as any[]).map((n: any) => n.id))
            ;(payload.nodes as WorkflowNode[]).forEach((n) => {
                if (!existing.has(n.id)) (workflow.nodes as any[]).push(deepClone(n) as any)
            })
        },
        serialize() {
            return { id, type: 'node/delete', timestamp, payload: deepClone(payload), version: 'v1' }
        },
    }
}

const cmdBatch = (
    children: HistoryCommand[],
    label?: string,
    fixed?: Pick<SerializedCommand, 'id' | 'timestamp'>,
): HistoryCommand => {
    const id = fixed?.id ?? newId('cmd')
    const timestamp = fixed?.timestamp ?? Date.now()
    const payload = {
        label: label ?? null,
        children: children.map((c) => c.serialize()),
    }

    return {
        id,
        type: 'batch',
        timestamp,
        payload,
        do(workflow) {
            children.forEach((c) => c.do(workflow))
        },
        undo(workflow) {
            ;[...children].reverse().forEach((c) => c.undo(workflow))
        },
        serialize() {
            return { id, type: 'batch', timestamp, payload: deepClone(payload), version: 'v1' }
        },
    }
}

/** =========================
 *  Deserialize (always returns command)
 *  ========================= */
const deserialize = (sc: SerializedCommand): HistoryCommand => {
    const fixed = { id: sc.id, timestamp: sc.timestamp }

    switch (sc.type) {
        case 'node/add':
            return cmdNodeAdd(sc.payload?.node as WorkflowNode, fixed)

        case 'edge/add':
            return cmdEdgeAdd(sc.payload?.edge as WorkflowEdge, fixed)

        case 'edge/delete':
            return cmdEdgesDelete((sc.payload?.edges ?? []) as WorkflowEdge[], fixed)

        case 'node/delete':
            return cmdNodesDelete((sc.payload?.nodes ?? []) as WorkflowNode[], fixed)

        case 'batch': {
            const kidsSer = Array.isArray(sc.payload?.children) ? (sc.payload.children as SerializedCommand[]) : []
            const kids = kidsSer.map(deserialize)
            return cmdBatch(kids, sc.payload?.label ?? undefined, fixed)
        }

        default:
            return cmdBatch([], 'noop', fixed)
    }
}

/** =========================
 *  Factories (Canvas에서 호출)
 *  ========================= */
export const makeAddNodeCommand = (node: WorkflowNode) => cmdNodeAdd(node)

export const makeAddEdgeCommand = (edge: WorkflowEdge) => cmdEdgeAdd(edge)

export const makeDeleteEdgesCommand = (edgeIds: string[]) => {
    const workflow = useWorkflowStore()
    const snap = (workflow.edges as any[]).filter((e: any) => edgeIds.includes(e.id)) as WorkflowEdge[]
    return cmdEdgesDelete(snap)
}

export const makeDeleteNodesBatchCommand = (nodeIds: string[]) => {
    const workflow = useWorkflowStore()
    const nodeIdSet = new Set(nodeIds)

    const connectedEdges = (workflow.edges as any[]).filter(
        (e: any) => nodeIdSet.has(e.source) || nodeIdSet.has(e.target),
    ) as WorkflowEdge[]

    const nodesToDelete = (workflow.nodes as any[]).filter((n: any) => nodeIdSet.has(n.id)) as WorkflowNode[]

    const c1 = cmdEdgesDelete(connectedEdges)
    const c2 = cmdNodesDelete(nodesToDelete)

    return cmdBatch([c1, c2], 'delete nodes')
}

export const makeMoveNodeCommand = (
    nodeId: string,
    from: { x: number; y: number },
    to: { x: number; y: number },
    fixed?: Pick<SerializedCommand, 'id' | 'timestamp'>,
) => {
    const workflow = useWorkflowStore()

    // 현재 워크플로우에서 노드 라벨 조회
    const node = (workflow.nodes as any[]).find(
        (n: any) => String(n.id) === String(nodeId),
    )

    const label =
        typeof node?.label === 'string' && node.label.trim()
            ? node.label.trim()
            : ''

    // ✅ label을 payload에 포함한 move command 생성
    return cmdNodeMove(nodeId, from, to, label, fixed)
}

/** =========================
 *  Store
 *  ========================= */
type Baseline = { nodes: WorkflowNode[]; edges: WorkflowEdge[] }

export const useHistoryStore = defineStore('history', {
    state: () => ({
        undoStack: [] as HistoryCommand[],
        redoStack: [] as HistoryCommand[],
        baseline: null as Baseline | null,
    }),

    getters: {
        cursor: (s) => s.undoStack.length,

        timeline: (s): SerializedCommand[] => {
            const applied = s.undoStack.map((c) => c.serialize())
            const undone = [...s.redoStack].reverse().map((c) => c.serialize())
            return [...applied, ...undone]
        },
    },

    actions: {
        ensureBaseline() {
            if (this.baseline) return

            const workflow = useWorkflowStore()

            this.baseline = {
                nodes: (workflow.nodes ?? []).map(snapshotNode),
                edges: (workflow.edges ?? []).map(snapshotEdge),
            }
        },

        execute(cmd: HistoryCommand) {
            this.ensureBaseline()
            const workflow = useWorkflowStore()

            cmd.do(workflow)

            this.undoStack.push(cmd)
            this.redoStack = []
        },

        undo() {
            const cmd = this.undoStack.pop()
            if (!cmd) return

            const workflow = useWorkflowStore()
            cmd.undo(workflow)

            this.redoStack.push(cmd)
        },

        redo() {
            const cmd = this.redoStack.pop()
            if (!cmd) return

            const workflow = useWorkflowStore()
            cmd.do(workflow)

            this.undoStack.push(cmd)
        },

        jumpTo(appliedCount: number) {
            this.ensureBaseline()
            const workflow = useWorkflowStore()
            const base = this.baseline
            if (!base) return

            // baseline
            workflow.nodes = deepClone(base.nodes) as any
            workflow.edges = deepClone(base.edges) as any

            // all commands (applied + undone)
            const applied = [...this.undoStack]
            const undone = [...this.redoStack].reverse()
            const all = [...applied, ...undone]

            const n = Math.max(0, Math.min(appliedCount, all.length))

            const toApply = all.slice(0, n)
            const remaining = all.slice(n)

            // apply
            const newUndo: HistoryCommand[] = []
            for (const c of toApply) {
                c.do(workflow)
                newUndo.push(c)
            }

            this.undoStack = newUndo
            this.redoStack = [...remaining].reverse()
        },

        exportBundle() {
            this.ensureBaseline()
            const workflow = useWorkflowStore()

            const bundle = {
                format: 'oj-workflow-bundle',
                version: 'v1',
                workflow: {
                    nodes: (workflow.nodes ?? []).map(snapshotNode),
                    edges: (workflow.edges ?? []).map(snapshotEdge),
                    meta: {},
                },
                history: {
                    baseline: deepClone(this.baseline),
                    undo: this.undoStack.map((c) => c.serialize()),
                    redo: this.redoStack.map((c) => c.serialize()),
                },
            }

            return JSON.stringify(bundle, null, 2)
        },

        importBundle(jsonText: string) {
            const workflow = useWorkflowStore()
            const obj = JSON.parse(jsonText)

            // workflow
            const w = obj?.workflow
            if (Array.isArray(w?.nodes) && Array.isArray(w?.edges)) {
                workflow.nodes = deepClone(w.nodes) as any
                workflow.edges = deepClone(w.edges) as any
            }

            // history
            const h = obj?.history
            const baseline = (h?.baseline ?? { nodes: workflow.nodes, edges: workflow.edges }) as Baseline
            this.baseline = deepClone(baseline)

            const undoSer: SerializedCommand[] = Array.isArray(h?.undo) ? h.undo : []
            const redoSer: SerializedCommand[] = Array.isArray(h?.redo) ? h.redo : []

            this.undoStack = undoSer.map(deserialize)
            this.redoStack = redoSer.map(deserialize)
        },
    },
})
