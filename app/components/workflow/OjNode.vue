<template>
  <div class="oj-node-root">

    <div class="oj-node-body" :style="{ width: `${NODE_DIAMETER}px`, height: `${NODE_DIAMETER}px` }">

      <div class="oj-canvas-layer">
        <svg class="oj-svg-canvas" viewBox="0 0 200 200">
          <path
              v-if="hasInput"
              :d="inputArcPath"
              class="oj-arc-path"
              :class="{ 'is-connected': inputConnected, 'is-dashed': !inputConnected }"
          />
          <path
              v-if="hasOutput"
              :d="outputArcPath"
              class="oj-arc-path"
              :class="{ 'is-connected': outputConnected, 'is-dashed': !outputConnected }"
          />
        </svg>
      </div>

      <div class="oj-handle-layer">
        <Handle
            v-if="hasInput"
            v-for="handle in inputHandles"
            :key="handle.id"
            :id="handle.id"
            type="target"
            position="left"
            class="oj-node-handle"
            :class="{ 'is-connected': inputConnected }"
            :style="{
            left: `calc(50% + ${handle.x}px)`,
            top: `calc(50% + ${handle.y}px)`
          }"
            :title="handle.name"
        />
        <Handle
            v-if="hasOutput"
            v-for="handle in outputHandles"
            :key="handle.id"
            :id="handle.id"
            type="source"
            position="right"
            class="oj-node-handle"
            :class="{ 'is-connected': outputConnected }"
            :style="{
            left: `calc(50% + ${handle.x}px)`,
            top: `calc(50% + ${handle.y}px)`
          }"
        />
      </div>

      <div class="oj-node-main" :style="circleStyle">
        <div class="oj-node-inner">
          <img v-if="iconSrc" :src="iconSrc" alt="" class="oj-node-icon" />
        </div>
      </div>

    </div>

    <div class="oj-node-label">{{ data.label }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Handle, useVueFlow } from '@vue-flow/core'
import { getWidgetColors } from '@/utils/widgetStyle'
import { getWidgetDef } from '@/utils/widgetDefinitions'

// === [디자인 설정값] ===
const NODE_R = 23
const NODE_DIAMETER = 46
const ARC_GAP = 5
const ARC_R = NODE_R + ARC_GAP
const ARC_ANGLE = 85
const ARC_Y_OFFSET = 0
const CENTER = 100

interface NodeData {
  widgetId: string
  label: string
  inputs?: string[]
}

const props = defineProps<{ id: string; data: NodeData }>()
const { edges, findNode } = useVueFlow()

const widgetDef = computed(() => getWidgetDef(props.data.widgetId))
const inputPorts = computed(() => props.data.inputs || widgetDef.value.inputs)
const hasInput = computed(() => inputPorts.value.length > 0)
const hasOutput = computed(() => widgetDef.value.hasOutput)
const iconSrc = computed(() => widgetDef.value.icon)

const inputConnected = computed(() => edges.value.some(e => e.target === props.id))
const outputConnected = computed(() => edges.value.some(e => e.source === props.id))

const colors = computed(() => getWidgetColors(props.data.widgetId))
const circleStyle = computed(() => ({
  background: colors.value.bg || '#fff0e0',
  borderColor: colors.value.border || '#ffcd85',
  width: '100%',
  height: '100%',
  boxSizing: 'border-box'
}))

// === [수학 로직] ===
function getArcGeometry(isOutput: boolean, count: number) {
  const cx = 0
  const cy = -ARC_Y_OFFSET

  const halfAngle = ARC_ANGLE / 2
  const toRad = (deg: number) => (deg * Math.PI) / 180

  let startDeg, endDeg
  if (isOutput) {
    // 오른쪽: 위 -> 아래
    startDeg = -halfAngle
    endDeg = halfAngle
  } else {
    // 왼쪽: 아래 -> 위 (시계방향 그리기)
    startDeg = 180 - halfAngle
    endDeg = 180 + halfAngle
  }

  const sx = cx + ARC_R * Math.cos(toRad(startDeg))
  const sy = cy + ARC_R * Math.sin(toRad(startDeg))
  const ex = cx + ARC_R * Math.cos(toRad(endDeg))
  const ey = cy + ARC_R * Math.sin(toRad(endDeg))

  const pathD = `M ${CENTER + sx} ${CENTER + sy}
                 A ${ARC_R} ${ARC_R} 0 0 1 ${CENTER + ex} ${CENTER + ey}`

  const points = []
  const safeCount = count === 0 ? 1 : count
  const step = ARC_ANGLE / (safeCount + 1)

  for (let i = 0; i < safeCount; i++) {
    let deg
    if (isOutput) {
      // 오른쪽: 위 -> 아래
      deg = -halfAngle + (step * (i + 1))
    } else {
      // 왼쪽: 위 -> 아래 (입력 꼬임 방지)
      deg = (180 + halfAngle) - (step * (i + 1))
    }

    const rad = toRad(deg)
    const px = cx + ARC_R * Math.cos(rad)
    const py = cy + ARC_R * Math.sin(rad)

    points.push({ x: px.toFixed(2), y: py.toFixed(2) })
  }

  return { pathD, points }
}

const inputData = computed(() => {
  const count = inputPorts.value.length
  const { points, pathD } = getArcGeometry(false, count)
  const mappedPoints = inputPorts.value.map((name, i) => ({
    id: `in-${i}`,
    x: points[i].x,
    y: points[i].y,
    name: name
  }))

  if (mappedPoints.length === 0 && count === 0 && hasInput.value) {
    return { pathD, points: [{ id: 'in-0', x: points[0].x, y: points[0].y, name: 'Data' }] }
  }
  return { pathD, points: mappedPoints }
})
const inputArcPath = computed(() => inputData.value.pathD)
const inputHandles = computed(() => inputData.value.points)

// const outputData = computed(() => {
//   const myEdges = edges.value.filter(e => e.source === props.id)
//   const count = myEdges.length
//   const edgesWithY = myEdges.map((e, idx) => {
//     const targetNode = findNode(e.target)
//     return { id: e.sourceHandle || `out-${idx}`, y: targetNode?.position.y ?? 0 }
//   })
//   edgesWithY.sort((a, b) => a.y - b.y)
//
//   const { points, pathD } = getArcGeometry(true, count)
//   const mappedPoints = (count === 0)
//       ? [{ id: 'out-def', ...points[0] }]
//       : points.map((p, i) => ({ id: `out-${i}`, x: p.x, y: p.y }))
//
//   return { pathD, points: mappedPoints }
// })

// [수정됨] 벡터(각도) 기반의 포트 매핑 로직
// [수정] Y좌표가 아닌 '각도(Angle)' 기준으로 포트 순서 정렬
// [1] 사용자 제공 알고리즘: TypeScript 변환
// 점 A(p1), B(p2), C(p3)의 방향성 계산
function getOrientation(p1: {x: number, y: number}, p2: {x: number, y: number}, p3: {x: number, y: number}) {
  // val = (by - ay) * (cx - bx) - (bx - ax) * (cy - by)
  const val = (p2.y - p1.y) * (p3.x - p2.x) - (p2.x - p1.x) * (p3.y - p2.y)

  if (val === 0) return 0 // Collinear
  return (val > 0) ? 1 : 2 // Clockwise or Counter-Clockwise
}

// 점 q가 선분 pr 위에 있는지 확인
function onSegment(p: {x: number, y: number}, q: {x: number, y: number}, r: {x: number, y: number}) {
  return (q.x <= Math.max(p.x, r.x) && q.x >= Math.min(p.x, r.x) &&
      q.y <= Math.max(p.y, r.y) && q.y >= Math.min(p.y, r.y))
}

// 두 선분 (p1-q1)과 (p2-q2)가 교차하는지 판별
function doIntersect(p1: {x: number, y: number}, q1: {x: number, y: number}, p2: {x: number, y: number}, q2: {x: number, y: number}) {
  const o1 = getOrientation(p1, q1, p2)
  const o2 = getOrientation(p1, q1, q2)
  const o3 = getOrientation(p2, q2, p1)
  const o4 = getOrientation(p2, q2, q1)

  // 일반적인 교차 상황
  if (o1 !== o2 && o3 !== o4) return true

  // 특수 케이스 (일직선 상에 점이 포함될 때)
  if (o1 === 0 && onSegment(p1, p2, q1)) return true
  if (o2 === 0 && onSegment(p1, q2, q1)) return true
  if (o3 === 0 && onSegment(p2, p1, q2)) return true
  if (o4 === 0 && onSegment(p2, q1, q2)) return true

  return false
}

// [수정] 좌표계 오차를 수정한 교차 판별 로직

// ... (getOrientation, onSegment, doIntersect 함수는 이전과 동일하므로 유지) ...
// 만약 함수가 없다면 이전 답변의 함수들을 그대로 복사해서 script 상단에 두세요.

// [OjNode.vue] <script setup> 내부

// ... (getOrientation, onSegment, doIntersect 함수는 파이썬 로직 그대로 유지) ...

const outputData = computed(() => {
  const myEdges = edges.value.filter(e => e.source === props.id)
  const count = myEdges.length

  // 1. 기하학적 포트 위치(Slot) 생성 (상대 좌표)
  const { points, pathD } = getArcGeometry(true, count)

  if (count === 0) {
    return { pathD, points: [{ id: 'out-def', ...points[0] }] }
  }

  // 2. [소스 노드] 절대 좌표 기준값 준비
  const sourceNode = findNode(props.id)
  // 노드가 없으면 0 처리, position은 반응형 객체이므로 안전하게 접근
  const sX = Number(sourceNode?.position?.x ?? 0)
  const sY = Number(sourceNode?.position?.y ?? 0)

  // 핸들(points)은 노드 중앙(50%, 50%)을 기준으로 배치되므로
  // 절대 좌표 계산 시 반지름(23px)을 더해줘야 함
  const centerOffset = NODE_DIAMETER / 2

  // 3. 초기 매핑
  let items = myEdges.map((edge, idx) => {
    const targetNode = findNode(edge.target)

    // [핵심 수정 1] 타겟 위치를 '노드 중앙'이 아니라 '왼쪽 입력 포트' 위치로 설정
    // 입력 포트는 노드의 왼쪽(Left)에 위치하므로 x좌표에 width를 더하지 않음.
    // 높이는 중앙(height/2)으로 설정.
    const tX = Number(targetNode?.position?.x ?? 0)
    const tY = Number(targetNode?.position?.y ?? 0)
    const tH = targetNode?.dimensions?.height ?? NODE_DIAMETER

    // 타겟이 왼쪽(-x방향)으로 조금 나와있는 핸들 위치라고 가정 (더 정확한 교차 판별)
    return {
      edge,
      targetPos: {
        x: tX,           // 왼쪽 가장자리
        y: tY + (tH / 2) // 높이는 중앙
      },
      originalIdx: idx
    }
  })

  // 4. 교차 스왑 루프 (Bubble Sort 방식)
  let swapped = true
  let loopCount = 0
  const MAX_LOOPS = count * count

  while (swapped && loopCount < MAX_LOOPS) {
    swapped = false
    loopCount++

    for (let i = 0; i < count - 1; i++) {
      const itemA = items[i]
      const itemB = items[i + 1]

      // [소스 좌표] 상대 좌표(point) + 노드위치(sX) + 반지름(centerOffset)
      const p1 = {
        x: sX + centerOffset + parseFloat(String(points[i].x)),
        y: sY + centerOffset + parseFloat(String(points[i].y))
      }
      const q1 = itemA.targetPos // Target A (Left Side)

      const p2 = {
        x: sX + centerOffset + parseFloat(String(points[i+1].x)),
        y: sY + centerOffset + parseFloat(String(points[i+1].y))
      }
      const q2 = itemB.targetPos // Target B (Left Side)

      // 두 직선 (p1-q1)과 (p2-q2)가 교차하는가?
      if (doIntersect(p1, q1, p2, q2)) {
        // 교차하면 순서 스왑
        items[i] = itemB
        items[i + 1] = itemA
        swapped = true
      }
    }
  }

  // 5. 결과 매핑
  const mappedPoints = points.map((p, i) => {
    const item = items[i]
    // 원래 엣지가 가지고 있던 핸들 ID를 현재 위치(p)에 할당
    const handleId = item.edge.sourceHandle || `out-${item.originalIdx}`

    return {
      id: handleId,
      x: p.x,
      y: p.y
    }
  })

  return { pathD, points: mappedPoints }
})

const outputArcPath = computed(() => outputData.value.pathD)
const outputHandles = computed(() => outputData.value.points)
</script>

<style scoped>
.oj-node-root {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: max-content;
}

.oj-node-body {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.oj-node-main {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  border-radius: 50%;
  border: 2px solid #ccc;
  background: white;
  display: flex; align-items: center; justify-content: center;
  z-index: 10;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
  box-sizing: border-box;
}

.oj-node-inner {
  width: 70%; height: 70%;
  border-radius: 50%; background: rgba(255, 255, 255, 0.9);
  display: flex; align-items: center; justify-content: center;
  z-index: 2;
}
.oj-node-icon { width: 60%; height: 60%; object-fit: contain; opacity: 0.85; }

.oj-canvas-layer {
  position: absolute;
  top: 50%; left: 50%;
  width: 200px; height: 200px;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: -1;
}
.oj-svg-canvas { width: 100%; height: 100%; overflow: visible; }

.oj-handle-layer {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  z-index: 20;
  pointer-events: none;
}

.oj-arc-path { fill: none; stroke: #bdc3c7; stroke-width: 4px; stroke-linecap: round; transition: all 0.3s ease; }
.oj-arc-path.is-dashed { stroke-dasharray: 5 5; opacity: 0.6; }
.oj-arc-path.is-connected { stroke: #7f8c8d; stroke-dasharray: none; opacity: 1; }

/* === [핵심 수정] 핸들 스타일 === */
.oj-node-handle {
  position: absolute;
  width: 4px; height: 4px;
  border-radius: 50%;

  /* [수정] margin 제거 (중복 이동 원인 제거) */
  /* margin-top: -3px; margin-left: -3px; */

  /* [유지] transform으로만 중심 정렬 */
  transform: translate(-50%, -50%);

  cursor: crosshair;
  pointer-events: auto;

  background: transparent;
  border: 1px solid transparent;
  transition: all 0.2s;
}

.oj-node-handle.is-connected {
  background: #555;
  border-color: #fff;
}

.oj-node-handle:hover {
  background: #333;
  border-color: #fff;
  transform: translate(-50%, -50%) scale(1.4);
}

.oj-node-label { margin-top: 4px; font-size: 11px; color: #333; font-family: sans-serif; text-align: center; white-space: nowrap; text-shadow: 0 1px 1px rgba(255,255,255,0.8); }
</style>