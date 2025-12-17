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

/**
 * 워크플로우 엣지
 * - sourceChannel / targetChannel 은 OWS 의 channel 정보(예: "Data", "Selected Data")
 */
export interface WorkflowEdge {
    id: string
    source: string
    target: string
    sourceChannel: string | null
    targetChannel: string | null
    enable: boolean
    label: string | null
}

/**
 * 워크스페이스 파일 / 폴더
 */
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

/**
 * 스토어 state
 */
export interface WorkflowState {
    id: string | null
    name: string
    nodes: WorkflowNode[]
    edges: WorkflowEdge[]

    workspaceFolders: WorkspaceFolder[]
    selectedWorkspaceFolderId: string | null
    selectedWorkspaceFileId: string | null
}

export const useWorkflowStore = defineStore('workflow', {
    state: (): WorkflowState => ({
        id: null,
        name: '',
        nodes: [],
        edges: [],

        workspaceFolders: [],
        selectedWorkspaceFolderId: null,
        selectedWorkspaceFileId: null,
    }),

    actions: {
        // -----------------------------
        // 워크스페이스 (폴더 / 파일)
        // -----------------------------
        addWorkspaceFolder(name: string) {
            const id = `folder-${Date.now()}`
            const folder: WorkspaceFolder = {
                id,
                name,
                isOpen: true,
                files: [],
            }
            this.workspaceFolders.push(folder)
            this.selectedWorkspaceFolderId = id
            this.selectedWorkspaceFileId = null
        },

        renameWorkspaceFolder(folderId: string, newName: string) {
            const folder = this.workspaceFolders.find((f) => f.id === folderId)
            if (folder) folder.name = newName
        },

        deleteWorkspaceFolder(folderId: string) {
            const idx = this.workspaceFolders.findIndex((f) => f.id === folderId)
            if (idx === -1) return
            // 비어있는 폴더만 삭제 (필요하면 로직 조절)
            console.log(`[Debug] idx: ${idx}`);
            console.log('[Debug] folder:', this.workspaceFolders[idx]);
            console.log('[Debug] files:', this.workspaceFolders[idx]?.files);

            if (this.workspaceFolders[idx]?.files?.length) {
                console.warn('Files 데이터가 비어있어서 렌더링을 중단합니다.');
                return
            }
            this.workspaceFolders.splice(idx, 1)

            if (this.selectedWorkspaceFolderId === folderId) {
                this.selectedWorkspaceFolderId = null
                this.selectedWorkspaceFileId = null
            }
        },

        toggleWorkspaceFolderOpen(folderId: string) {
            const folder = this.workspaceFolders.find((f) => f.id === folderId)
            if (folder) folder.isOpen = !folder.isOpen
        },

        selectWorkspaceFolder(folderId: string | null) {
            this.selectedWorkspaceFolderId = folderId
            if (folderId === null) {
                this.selectedWorkspaceFileId = null
            }
        },

        addWorkspaceFile(folderId: string, name: string) {
            const folder = this.workspaceFolders.find((f) => f.id === folderId)
            if (!folder) return

            const id = `file-${Date.now()}`
            const file: WorkspaceFile = { id, name }
            folder.files.push(file)

            this.selectedWorkspaceFolderId = folderId
            this.selectedWorkspaceFileId = id
        },

        renameWorkspaceFile(folderId: string, fileId: string, newName: string) {
            const folder = this.workspaceFolders.find((f) => f.id === folderId)
            if (!folder) return
            const file = folder.files.find((f) => f.id === fileId)
            if (file) file.name = newName
        },

        deleteWorkspaceFile(folderId: string, fileId: string) {
            const folder = this.workspaceFolders.find((f) => f.id === folderId)
            if (!folder) return
            const idx = folder.files.findIndex((f) => f.id === fileId)
            if (idx === -1) return
            folder.files.splice(idx, 1)

            if (this.selectedWorkspaceFileId === fileId) {
                this.selectedWorkspaceFileId = null
            }
        },

        selectWorkspaceFile(folderId: string, fileId: string) {
            this.selectedWorkspaceFolderId = folderId
            this.selectedWorkspaceFileId = fileId
        },

        // -----------------------------
        // OWS 임포트 (백엔드 → nodes/edges)
        // -----------------------------
        async importFromOws(file: File): Promise<void> {
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
            this.name = data.name ?? ''

            const rawNodes: any[] = Array.isArray(data.nodes) ? data.nodes : []
            const rawEdges: any[] = Array.isArray(data.edges) ? data.edges : []

            this.nodes = rawNodes.map((n: any): WorkflowNode => {
                const rawX = n.pos?.x ?? n.position?.x
                const rawY = n.pos?.y ?? n.position?.y

                const x = Number(rawX)
                const y = Number(rawY)

                const name: string = n.name ?? ''
                const title: string = n.title ?? name

                return {
                    id: String(n.id),
                    name,
                    title,
                    label: title || name,
                    widgetType: n.widget ?? n.name ?? '',
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
                    // OWS 파서가 주는 형태: source: "0", target: "1"
                    const sid = String(e.source)
                    const tid = String(e.target)
                    return validNodeIds.has(sid) && validNodeIds.has(tid)
                })
                .map(
                    (e: any, idx: number): WorkflowEdge => ({
                        id: String(e.id ?? idx),
                        source: String(e.source),
                        target: String(e.target),
                        sourceChannel: e.sourceChannel ?? null,
                        targetChannel: e.targetChannel ?? null,
                        enable: e.enable ?? true,
                        label: e.label ?? null,
                    }),
                )
        },

        // stores/workflow.ts (actions 안에 추가)
        addNode(widgetType: string, position: { x: number; y: number }, title?: string) {
            const id = `node_${Date.now()}_${Math.random().toString(16).slice(2)}`
            const name = title ?? widgetType
            const node = {
                    id,
                    name,
                    title: name,
                    label: name,
                    widgetType,
                    position: { x: position.x, y: position.y },
                    params: {},
                }
            ;(this.nodes as any[]).push(node)
            return id
        },
        addEdge(edge: WorkflowEdge) {
            this.edges.push(edge)
        },

    },
})
