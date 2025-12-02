// utils/workflowGeometry.ts

// === [1] 디자인 상수 (Design Constants) ===
export const NODE_R = 23
export const NODE_DIAMETER = 46
export const ARC_GAP = 5
export const ARC_R = NODE_R + ARC_GAP
export const ARC_ANGLE = 85
export const ARC_Y_OFFSET = 0
export const CENTER = 100

// === [2] 공통 유틸 함수 (Shared Utility Functions) ===

// [수정됨] node 파라미터가 undefined일 수 있음을 명시
export const getNodeCenter = (
    node: { position: { x: number, y: number }, dimensions?: { width: number, height: number } } | undefined | null
) => {
    // 여기서 체크하므로 안전함
    if (!node) return { x: 0, y: 0 }

    const w = node.dimensions?.width ?? NODE_DIAMETER
    const h = node.dimensions?.height ?? NODE_DIAMETER
    return {
        x: node.position.x + w / 2,
        y: node.position.y + h / 2
    }
}

// 12시(Up) 기준 각도 점수 계산
export const getAngleScore = (centerA: {x:number, y:number}, centerB: {x:number, y:number}, isInput: boolean) => {
    const dx = centerB.x - centerA.x
    const dy = centerB.y - centerA.y

    const rad = Math.atan2(dy, dx)
    const deg = rad * (180 / Math.PI)

    if (isInput) {
        // [입력] 반시계(CCW) 측정
        return (270 - deg + 360) % 360
    } else {
        // [출력] 시계(CW) 측정
        return (deg + 90 + 360) % 360
    }
}