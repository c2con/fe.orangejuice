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
    edgeIds: string[],
    edgesSnapshot: WorkflowEdge[],
    fixed?: Pick<SerializedCommand, 'id' | 'timestamp'>,
): HistoryCommand => {
    const id = fixed?.id ?? newId('cmd')
    const timestamp = fixed?.timestamp ?? Date.now()
    const payload = {
        edgeIds: deepClone(edgeIds),
        edges: deepClone(edgesSnapshot),
    }

    return {
        id,
        type: 'edge/delete',
        timestamp,
        payload,
        do(workflow) {
            // ✅ 기존 배열을 수정하는 대신, 필터링된 새 배열을 할당하여 반응성 트리거
            if (workflow.edges) {
                const delIds = new Set(payload.edgeIds);
                workflow.edges = workflow.edges.filter((e: any) => !delIds.has(e.id));
            }
        },
        undo(workflow) {
            if (!workflow.edges) workflow.edges = [];
            const existingIds = new Set(workflow.edges.map((e: any) => e.id));

            // 삭제되었던 엣지들을 다시 추가
            payload.edges.forEach((e: any) => {
                if (!existingIds.has(e.id)) {
                    workflow.edges.push(deepClone(e));
                }
            });
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
            const delIds = new Set((payload.nodes).map((n) => n.id));
            // ✅ 필터링된 "새 배열"을 할당해야 리액티비티가 발생합니다.
            workflow.edges = (workflow.edges as any[]).filter(
                (e: any) => !delIds.has(e.source) && !delIds.has(e.target)
            );
            workflow.nodes = (workflow.nodes as any[]).filter((n: any) => !delIds.has(n.id));
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
    children: HistoryCommand[], // 객체 리스트
    label?: string,
    fixed?: Pick<SerializedCommand, 'id' | 'timestamp'>,
): HistoryCommand => {
    const id = fixed?.id ?? newId('cmd')
    const timestamp = fixed?.timestamp ?? Date.now()

    return {
        id,
        type: 'batch',
        timestamp,
        // payload에는 UI 표시용 데이터와 직렬화 시 필요한 정보만 담음
        payload: {
            label: label ?? null,
            children: [] // 실제 serialize() 호출 시점에 채워짐
        },
        do(workflow) {
            children.forEach((c) => c.do(workflow))
        },
        undo(workflow) {
            ;[...children].reverse().forEach((c) => c.undo(workflow))
        },
        serialize() {
            return {
                id,
                type: 'batch',
                timestamp,
                payload: {
                    label: label ?? null,
                    // ✅ 호출되는 시점에 자식들을 직렬화하여 반환
                    children: children.map(c => c.serialize())
                },
                version: 'v1'
            }
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

        case 'edge/delete': {
            // payload 구조가 다를 수 있으므로 안전하게 추출
            const ids = Array.isArray(sc.payload?.edgeIds)
                ? sc.payload.edgeIds
                : (Array.isArray(sc.payload?.edges) ? sc.payload.edges.map((e: any) => e.id) : [])
            const snap = Array.isArray(sc.payload?.edges) ? sc.payload.edges : []
            return cmdEdgesDelete(ids, snap, fixed)
        }

        case 'node/delete':
            return cmdNodesDelete((sc.payload?.nodes ?? []) as WorkflowNode[], fixed)

        case 'batch': {
            const kidsSer = Array.isArray(sc.payload?.children) ? sc.payload.children : []
            const kids = kidsSer.map((k: any) => deserialize(k))
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

    // ✅ String으로 형변환하여 ID 매칭 확률을 높이고, 확실하게 snapshotEdge를 호출합니다.
    const idsToFind = new Set(edgeIds.map(id => String(id)));
    const snap = (workflow.edges as any[])
        .filter((e: any) => idsToFind.has(String(e.id)))
        .map(snapshotEdge);

    // 디버깅: 데이터가 제대로 잡히는지 콘솔에서 확인하세요.
    if (snap.length === 0) {
        console.error('[History] 삭제할 엣지 스냅샷 생성 실패. 대상 ID:', edgeIds);
    }

    return cmdEdgesDelete(edgeIds, snap)
}

export const makeDeleteNodesBatchCommand = (nodeIds: string[]) => {
    const workflow = useWorkflowStore();
    const nodeIdSet = new Set(nodeIds);

    // 엣지 스냅샷 (데이터가 있는지 콘솔로 찍어보세요)
    const connectedEdges = (workflow.edges as any[]).filter(
        (e: any) => nodeIdSet.has(e.source) || nodeIdSet.has(e.target)
    ).map(snapshotEdge); // 확실하게 스냅샷 객체 생성

    // 노드 스냅샷
    const nodesToDelete = (workflow.nodes as any[]).filter(
        (n: any) => nodeIdSet.has(n.id)
    ).map(snapshotNode);

    if (nodesToDelete.length === 0) {
        console.warn('[History] 삭제할 노드를 스토어에서 찾지 못함:', nodeIds);
    }

    const c1 = cmdEdgesDelete(connectedEdges.map(e => e.id), connectedEdges);
    const c2 = cmdNodesDelete(nodesToDelete);

    return cmdBatch([c1, c2], 'delete nodes');
};

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
            const applied = s.undoStack.map((c) => c.serialize()) // 여기서 serialize 실패 시 항목 누락
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
