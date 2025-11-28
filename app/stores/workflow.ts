// stores/workflow.ts
import { defineStore } from 'pinia'
import axios from 'axios'

export interface WorkflowNode {
    id: string
    widgetType: string
    title: string
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

export const useWorkflowStore = defineStore('workflow', {
    state: () => ({
        id: null as string | null,
        name: '' as string,
        nodes: [] as WorkflowNode[],
        edges: [] as WorkflowEdge[],
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

            // 1) 노드 변환 (좌표를 숫자로 강제 변환)
            this.nodes = rawNodes.map((n: any) => {
                const rawX = n.pos?.x
                const rawY = n.pos?.y

                // 숫자로 변환 (문자열이어도 OK, NaN이면 0으로)
                const x = Number(rawX)
                const y = Number(rawY)

                return {
                    id: String(n.id),
                    widgetType: n.widgetType,
                    title: n.title,
                    position: {
                        x: Number.isFinite(x) ? x : 0,
                        y: Number.isFinite(y) ? y : 0,
                    },
                    params: n.params ?? {},
                } as WorkflowNode
            })

            // VueFlow에 존재하는 유효한 노드 id 집합
            const validNodeIds = new Set(this.nodes.map(n => n.id))

            // 2) 에지 변환 (source/target 이 없는 애, 노드가 존재하지 않는 애는 제외)
            this.edges = rawEdges
                .filter((e: any) => {
                    const s = e.source?.nodeId
                    const t = e.target?.nodeId

                    if (!s || !t) {
                        // console.warn('[workflow] skip edge(no source/target):', e)
                        return false
                    }

                    const sid = String(s)
                    const tid = String(t)

                    if (!validNodeIds.has(sid) || !validNodeIds.has(tid)) {
                        // console.warn('[workflow] skip edge(invalid node):', sid, '->', tid)
                        return false
                    }

                    return true
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
