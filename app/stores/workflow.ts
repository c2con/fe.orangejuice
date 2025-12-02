// stores/workflow.ts
import { defineStore } from 'pinia'
import axios from 'axios'

/**
 * 워크플로우 노드
 * - name      : 백엔드에서 온 원래 위젯 이름 (예: "File", "DataSampler")
 * - title     : Orange Canvas 에서 사용자가 붙인 이름 (없으면 name 사용)
 * - label     : 실제 캔버스에 표시할 라벨 (title 우선, 없으면 name)
 * - widgetType: 프론트에서 widgetDefinitions / 아이콘 조회에 사용할 ID
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

export const useWorkflowStore = defineStore('workflow', {
    state: () => ({
        id: null as string | null,
        name: '' as string,
        nodes: [] as WorkflowNode[],
        edges: [] as WorkflowEdge[],
    }),

    actions: {
        /**
         * 백엔드에 .ows 파일 업로드 → 워크플로우 JSON 수신
         * nodes / edges 를 내부 상태로 변환
         */
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

                const x = Number(rawX)
                const y = Number(rawY)

                const name: string = n.name ?? ''
                const title: string = n.title ?? name

                return {
                    id: String(n.id),
                    name,
                    title,
                    // 캔버스 라벨: title 우선, 없으면 name
                    label: title || name,
                    // 프론트에서 widget 정의/아이콘 조회에 쓸 ID
                    // 당장은 name 과 동일하게 사용 (나중에 매핑 테이블 생기면 여기서 변환)
                    widgetType: name,
                    position: {
                        x: Number.isFinite(x) ? x : 0,
                        y: Number.isFinite(y) ? y : 0,
                    },
                    params: n.params ?? {},
                } as WorkflowNode
            })

            // Vue Flow에 존재하는 유효한 노드 id 집합
            const validNodeIds = new Set(this.nodes.map(n => n.id))

            // 2) 에지 변환 (source/target 이 없거나, 노드가 존재하지 않는 애는 제외)
            this.edges = rawEdges
                .filter((e: any) => {
                    const s = e.source?.nodeId
                    const t = e.target?.nodeId

                    if (!s || !t) {
                        return false
                    }

                    const sid = String(s)
                    const tid = String(t)

                    if (!validNodeIds.has(sid) || !validNodeIds.has(tid)) {
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
                    // 백엔드에서 edge label 이 따로 오면 사용, 없으면 null
                    label: e.channel ?? null,
                }))
        },
    },
})
