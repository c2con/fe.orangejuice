// stores/workflow.ts
import { defineStore } from 'pinia'
import axios from 'axios'

/**
 * 워크플로우 노드
 */
export interface WorkflowNode {
    id: string
    name: string
    title: string
    label: string
    widgetType: string
    position: { x: number; y: number }
    params: Record<string, any>
}

export interface WorkflowEdge {
    id: string
    source: string
    target: string
    sourceChannel?: string | null
    targetChannel?: string | null
    label?: string | null
}

/** 워크스페이스 트리에서 사용하는 파일/폴더 타입 */
export interface WorkspaceFile {
    id: string
    name: string
}

export interface WorkspaceFolder {
    id: string
    name: string
    isOpen: boolean
    files: WorkspaceFile[]
}

/** 전체 스토어 상태 타입 */
interface WorkflowState {
    id: string | null
    name: string
    nodes: WorkflowNode[]
    edges: WorkflowEdge[]

    workspaceFolders: WorkspaceFolder[]
    selectedWorkspaceFolderId: string | null
    selectedWorkspaceFileId: string | null
}

export const useWorkflowStore = defineStore('workflow', {
    // ⭐ state의 리턴 타입을 WorkflowState로 고정
    state: (): WorkflowState => ({
        id: null,
        name: '',
        nodes: [],
        edges: [],

        // 여기서 [] 때문에 files가 never[] 로 추론되던 문제를 방지
        workspaceFolders: [] as WorkspaceFolder[],
        selectedWorkspaceFolderId: null,
        selectedWorkspaceFileId: null,
    }),

    actions: {
        async importFromOws(file: File) {
            const form = new FormData()
            form.append('file', file)

            const { data } = await axios.post(
                'http://localhost:8000/api/workflow/import-ows',
                form,
                {
                    headers: { 'Content-Type': 'multipart/form-data' },
                },
            )

            this.id = data.id
            this.name = data.name

            const rawNodes = data.nodes ?? []
            const rawEdges = data.edges ?? []

            this.nodes = rawNodes.map((n: any) => {
                const rawX = n.pos?.x
                const rawY = n.pos?.y

                const x = Number(rawX)
                const y = Number(rawY)

                const name: string = n.name ?? ''
                const title: string = n.title ?? name

                return {
                    id: String(n.id),
                    name,
                    title,
                    label: title || name,
                    widgetType: name,
                    position: {
                        x: Number.isFinite(x) ? x : 0,
                        y: Number.isFinite(y) ? y : 0,
                    },
                    params: n.params ?? {},
                }
            })

            const validNodeIds = new Set(this.nodes.map((n) => n.id))

            this.edges = rawEdges
                .filter((e: any) => {
                    const s = e.source?.nodeId
                    const t = e.target?.nodeId
                    if (!s || !t) return false

                    const sid = String(s)
                    const tid = String(t)

                    return validNodeIds.has(sid) && validNodeIds.has(tid)
                })
                .map((e: any, idx: number) => ({
                    id: String(e.id ?? idx),
                    source: String(e.source.nodeId),
                    target: String(e.target.nodeId),
                    sourceChannel: e.source?.channel ?? null,
                    targetChannel: e.target?.channel ?? null,
                    label: e.channel ?? null,
                }))
        },
    },
})
