// utils/workflowGeometry.ts

// === [1] 디자인 상수 (Design Constants) ===
export const NODE_R = 23
export const NODE_DIAMETER = 46
// 아크 반지름: 노드보다 약간 크게
export const ARC_R = NODE_R + 8
// 아크가 벌어지는 각도 (60도 = 위아래 총 120도 범위 커버)
export const ARC_ANGLE = 60
export const ARC_Y_OFFSET = 0

// 뷰포트 관련 상수 (필요 시 사용)
export const VIEWPORT_PADDING_X = 0.15
export const VIEWPORT_PADDING_Y = 0.1
export const MIN_ZOOM = 0.05
export const MAX_ZOOM = 1.5
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

/**
 * 두 점(노드 중심) 사이의 각도를 0~360 점수로 환산합니다.
 * - Output(Source): 12시(0) 기준 시계방향(CW) 증가
 * - Input(Target): 12시(0) 기준 반시계방향(CCW) 증가
 */
export function getAngleScore(
    centerA: { x: number; y: number },
    centerB: { x: number; y: number },
    isInput: boolean
): number {
    const dx = centerB.x - centerA.x
    const dy = centerB.y - centerA.y

    // atan2: 3시 방향(0도) 기준 시계방향(y축 아래가 양수일 때) 라디안
    // (화면 좌표계는 y가 아래로 증가하므로 일반 수학과 다름)
    // Math.atan2(y, x) -> -PI ~ +PI
    const rad = Math.atan2(dy, dx)
    let deg = rad * (180 / Math.PI) // -180 ~ 180

    // 화면 좌표계 기준: 3시(0), 6시(90), 9시(180/-180), 12시(-90)
    // 이를 12시 기준(0)으로 변환해야 함.

    if (isInput) {
        // [입력 포트 우선순위]: 12시 기준 반시계(CCW)
        // 12시(-90) -> 0
        // 9시(180) -> 90
        // 6시(90) -> 180
        // 3시(0) -> 270
        // 식: (270 - deg) % 360
        let score = 270 - deg
        return (score + 360) % 360
    } else {
        // [출력 포트 우선순위]: 12시 기준 시계(CW)
        // 12시(-90) -> 0
        // 3시(0) -> 90
        // 6시(90) -> 180
        // 9시(180) -> 270
        // 식: (deg + 90) % 360
        let score = deg + 90
        return (score + 360) % 360
    }
}