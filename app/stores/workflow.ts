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
 * 워크스페이스 문서(=파일) 단위로 보관하는 워크플로우
 * - 백엔드 없이도 문서 전환 시 노드/엣지 스왑이 가능하도록 in-memory 저장
 */
export interface WorkspaceDocument {
    fileId: string
    name: string
    workflowId: string | null
    workflowName: string
    nodes: WorkflowNode[]
    edges: WorkflowEdge[]
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

    /** fileId -> document */
    documents: Record<string, WorkspaceDocument>
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

        documents: {},
    }),

    actions: {
        /**
         * 앱 시작 시 워크스페이스 기본 구조 보장
         * - 기본 폴더 1개
         * - 그 아래 새 문서 1개
         */
        ensureDefaultWorkspace() {
            if (this.workspaceFolders.length > 0) {
                // 선택된 문서가 없으면 첫 문서를 선택
                if (!this.selectedWorkspaceFileId) {
                    const f = this.workspaceFolders[0]
                    const file = f?.files?.[0]
                    if (f && file) this.selectWorkspaceFile(f.id, file.id)
                }
                return
            }

            const folderId = `folder-${Date.now()}`
            const fileId = `file-${Date.now()}`

            const folder: WorkspaceFolder = {
                id: folderId,
                name: '기본',
                isOpen: true,
                files: [{ id: fileId, name: '새 문서' }],
            }

            this.workspaceFolders.push(folder)
            this.documents[fileId] = {
                fileId,
                name: '새 문서',
                workflowId: null,
                workflowName: '',
                nodes: [],
                edges: [],
            }

            this.selectedWorkspaceFolderId = folderId
            this.selectedWorkspaceFileId = fileId
            this.applyDocumentToCanvas(fileId)
        },

        /** fileId에 저장된 워크플로우를 캔버스(현재 nodes/edges)로 반영 */
        applyDocumentToCanvas(fileId: string) {
            const doc = this.documents[fileId]
            if (!doc) {
                this.id = null
                this.name = ''
                this.nodes = []
                this.edges = []
                return
            }
            this.id = doc.workflowId
            this.name = doc.workflowName
            this.nodes = doc.nodes
            this.edges = doc.edges
        },

        /** 현재 캔버스 상태를 문서에 저장 */
        snapshotCanvasToDocument(fileId: string) {
            const doc = this.documents[fileId]
            if (!doc) return
            doc.workflowId = this.id
            doc.workflowName = this.name
            doc.nodes = this.nodes
            doc.edges = this.edges
        },

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

            // 비어있는 폴더만 삭제
            if (this.workspaceFolders[idx]?.files?.length) {
                return
            }

            this.workspaceFolders.splice(idx, 1)

            if (this.selectedWorkspaceFolderId === folderId) {
                this.selectedWorkspaceFolderId = null
                this.selectedWorkspaceFileId = null
                this.id = null
                this.name = ''
                this.nodes = []
                this.edges = []
            }
        },

        toggleWorkspaceFolderOpen(folderId: string) {
            const folder = this.workspaceFolders.find((f) => f.id === folderId)
            if (folder) folder.isOpen = !folder.isOpen
        },

        selectWorkspaceFolder(folderId: string | null) {
            if (this.selectedWorkspaceFileId) {
                this.snapshotCanvasToDocument(this.selectedWorkspaceFileId)
            }

            this.selectedWorkspaceFolderId = folderId
            this.selectedWorkspaceFileId = null
        },

        addWorkspaceFile(folderId: string, name: string) {
            const folder = this.workspaceFolders.find((f) => f.id === folderId)
            if (!folder) return

            const id = `file-${Date.now()}`
            const file: WorkspaceFile = { id, name }
            folder.files.push(file)

            // 문서 생성
            this.documents[id] = {
                fileId: id,
                name,
                workflowId: null,
                workflowName: '',
                nodes: [],
                edges: [],
            }

            this.selectedWorkspaceFolderId = folderId
            this.selectedWorkspaceFileId = id

            // 새 문서 선택 시 빈 캔버스로
            this.applyDocumentToCanvas(id)
        },

        renameWorkspaceFile(folderId: string, fileId: string, newName: string) {
            const folder = this.workspaceFolders.find((f) => f.id === folderId)
            if (!folder) return
            const file = folder.files.find((f) => f.id === fileId)
            if (file) file.name = newName

            const doc = this.documents[fileId]
            if (doc) doc.name = newName
        },

        deleteWorkspaceFile(folderId: string, fileId: string) {
            const folder = this.workspaceFolders.find((f) => f.id === folderId)
            if (!folder) return
            const idx = folder.files.findIndex((f) => f.id === fileId)
            if (idx === -1) return
            folder.files.splice(idx, 1)

            delete this.documents[fileId]

            if (this.selectedWorkspaceFileId === fileId) {
                this.selectedWorkspaceFileId = null
                this.id = null
                this.name = ''
                this.nodes = []
                this.edges = []
            }
        },

        selectWorkspaceFile(folderId: string, fileId: string) {
            // 현재 선택 문서의 작업 내용을 저장
            if (this.selectedWorkspaceFileId) {
                this.snapshotCanvasToDocument(this.selectedWorkspaceFileId)
            }
            this.selectedWorkspaceFolderId = folderId
            this.selectedWorkspaceFileId = fileId

            // 새 문서 로드
            this.applyDocumentToCanvas(fileId)
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
                { headers: { 'Content-Type': 'multipart/form-data' } },
            )

            const rawNodes: any[] = Array.isArray(data.nodes) ? data.nodes : []
            const rawEdges: any[] = Array.isArray(data.edges) ? data.edges : []

            const nodes = rawNodes.map((n: any): WorkflowNode => {
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

            const validNodeIds = new Set(nodes.map((n) => n.id))

            const edges = rawEdges
                .filter((e: any) => {
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

            // ✅ "현재 선택된 문서"에 임포트 결과를 저장하고 캔버스 반영
            const selectedFileId = this.selectedWorkspaceFileId
            if (selectedFileId && this.documents[selectedFileId]) {
                const doc = this.documents[selectedFileId]
                doc.workflowId = String(data.id ?? null)
                doc.workflowName = String(data.name ?? '')
                doc.nodes = nodes
                doc.edges = edges
                this.applyDocumentToCanvas(selectedFileId)
                return
            }

            // fallback: 문서가 없으면 캔버스에만 반영
            this.id = String(data.id ?? null)
            this.name = String(data.name ?? '')
            this.nodes = nodes
            this.edges = edges
        },

        // -----------------------------
        // Canvas 편집 API (기존)
        // -----------------------------
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

            // 현재 문서에 반영
            if (this.selectedWorkspaceFileId) {
                this.snapshotCanvasToDocument(this.selectedWorkspaceFileId)
            }
            return id
        },

        addEdge(edge: WorkflowEdge) {
            this.edges.push(edge)
            if (this.selectedWorkspaceFileId) {
                this.snapshotCanvasToDocument(this.selectedWorkspaceFileId)
            }
        },

        clearWorkflow() {
            this.nodes = []
            this.edges = []
            this.id = null
            this.name = ''
            this.selectedWorkspaceFileId = null
        },
    },
})
