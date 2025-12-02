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
            :position="Position.Left"
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
            :position="Position.Right"
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
          <img v-if="iconSrc" :src="iconSrc" alt="" class="oj-node-icon" @error="handleImgError"/>
        </div>
      </div>

    </div>

    <div class="oj-node-label">{{ data.label }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CSSProperties } from 'vue'
import { Handle, useVueFlow, Position } from '@vue-flow/core'
import { getWidgetColors } from '@/utils/widgetStyle'
import { getWidgetDef } from '@/utils/widgetDefinitions'

// === [디자인 설정값] ===
// 공통 상수 (없으면 직접 정의해서 사용해도 됨)
import {
  NODE_DIAMETER,
  ARC_R,
  ARC_ANGLE,
  ARC_Y_OFFSET,
  CENTER,
  getAngleScore,
  getNodeCenter
} from '@/utils/workflowGeometry'

interface NodeData {
  widgetId: string
  label: string
  inputs?: string[]
}

// 필요시 실제 타입에 맞게 조정
interface WidgetDef {
  inputs?: string[]
  hasOutput: boolean
  icon?: string
}

interface WidgetColors {
  bg: string
  border: string
}

const props = defineProps<{ id: string; data: NodeData }>()

// [중요] Vue Flow 상태 가져오기
const { edges, findNode } = useVueFlow()

// widgetDef가 항상 존재하도록 기본값 지정
const widgetDef = computed<WidgetDef>(() => {
  const def = getWidgetDef(props.data.widgetId) as WidgetDef | undefined
  return def ?? { inputs: [], hasOutput: true }
})

const inputPorts = computed(() => props.data.inputs ?? widgetDef.value.inputs ?? [])
const hasInput = computed(() => inputPorts.value.length > 0)
const hasOutput = computed(() => widgetDef.value.hasOutput)
const iconSrc = computed(() => widgetDef.value.icon ?? '')

const inputConnected = computed(() => edges.value.some(e => e.target === props.id))
const outputConnected = computed(() => edges.value.some(e => e.source === props.id))

// colors.value가 undefined 가 되지 않도록 기본값 지정
const colors = computed<WidgetColors>(() => {
  const c = getWidgetColors(props.data.widgetId) as WidgetColors | undefined
  return c ?? { bg: '#fff0e0', border: '#ffcd85' }
})

// style 타입을 CSSProperties 로 명시
const circleStyle = computed<CSSProperties>(() => ({
  background: colors.value.bg,
  borderColor: colors.value.border,
  width: '100%',
  height: '100%',
  boxSizing: 'border-box'
}))

// [추가] 기본 아이콘 경로 상수
const DEFAULT_ICON_PATH = "/icons/widgets/default.svg"
// [추가] 이미지 로딩 에러 핸들러
const handleImgError = (e: Event) => {
  const target = e.target as HTMLImageElement;

  // 이미 default.svg로 교체된 상태라면 무한루프 방지를 위해 종료
  if (target.src.includes('default.svg')) return;

  // 1. 에러 로그 출력 (개발 확인용)
  console.warn(`[OjNode] 아이콘 로딩 실패: ${target.src} -> default.svg로 대체함`);

  // 2. 이미지를 기본 아이콘으로 교체
  target.src = DEFAULT_ICON_PATH;
}

// === [기하학 로직] 아치 형태 ===
function getArcGeometry(isOutput: boolean, count: number) {
  const cx = 0
  const cy = -ARC_Y_OFFSET
  const halfAngle = ARC_ANGLE / 2
  const toRad = (deg: number) => (deg * Math.PI) / 180

  let startDeg: number
  let endDeg: number

  if (isOutput) {
    // 오른쪽: 위(-42.5) -> 아래(+42.5)
    startDeg = -halfAngle
    endDeg = halfAngle
  } else {
    // 왼쪽: 아래 -> 위
    startDeg = 180 - halfAngle
    endDeg = 180 + halfAngle
  }

  const sx = cx + ARC_R * Math.cos(toRad(startDeg))
  const sy = cy + ARC_R * Math.sin(toRad(startDeg))
  const ex = cx + ARC_R * Math.cos(toRad(endDeg))
  const ey = cy + ARC_R * Math.sin(toRad(endDeg))

  const pathD = `M ${CENTER + sx} ${CENTER + sy}
                 A ${ARC_R} ${ARC_R} 0 0 1 ${CENTER + ex} ${CENTER + ey}`

  const points: { x: string; y: string }[] = []
  const safeCount = count === 0 ? 1 : count
  const step = ARC_ANGLE / (safeCount + 1)

  for (let i = 0; i < safeCount; i++) {
    let deg: number
    if (isOutput) {
      deg = -halfAngle + step * (i + 1)
    } else {
      deg = 180 + halfAngle - step * (i + 1)
    }

    const rad = toRad(deg)
    const px = cx + ARC_R * Math.cos(rad)
    const py = cy + ARC_R * Math.sin(rad)
    points.push({ x: px.toFixed(2), y: py.toFixed(2) })
  }

  return { pathD, points }
}

const getNodeLabel = (id: string) => {
  const n = findNode(id)
  if (!n) return `ID:${id}`
  return n.data?.label ?? `ID:${id}`
}

function getSortedEdges(isInput: boolean) {
  if (!edges.value) return []

  const myEdges = edges.value.filter(e =>
      isInput ? e.target === props.id : e.source === props.id
  )

  if (myEdges.length === 0) return []

  const myNode = findNode(props.id)
  const myCenter = getNodeCenter(myNode)
  const myLabel = getNodeLabel(props.id)

  const edgesWithScore = myEdges.map((e, idx) => {
    const otherNodeId = isInput ? e.source : e.target
    const otherNode = findNode(otherNodeId)
    const otherCenter = getNodeCenter(otherNode)

    const score = getAngleScore(myCenter, otherCenter, isInput)

    return {
      edge: e,
      originalIdx: idx,
      score: score,
      otherLabel: getNodeLabel(otherNodeId)
    }
  })

  // [최종 정렬 방향]
  // Input/Output 모두 핸들이 [Top -> Bottom] 순서로 생성됨 (Index 0 = Top)
  // 각도 점수는 12시(Top)에서 멀어질수록 커짐 (Top=Small, Bottom=Large)
  // 따라서 Small -> Index 0 매칭을 위해 '오름차순' 사용
  edgesWithScore.sort((a, b) => a.score - b.score)

  // 디버깅 로그
  if (isInput) {
    console.groupCollapsed(`%c🟢 INPUT (CCW): ${myLabel}`, 'color:green')
  } else {
    console.groupCollapsed(`%c🔵 OUTPUT (CW): ${myLabel}`, 'color:blue')
  }
  console.log("Rule: 오름차순 (Top[Low Score] -> Bottom[High Score])")

  console.table(edgesWithScore.map((item, i) => ({
    "Order": i,
    "Target": item.otherLabel,
    "Score": Math.round(item.score),
    "Pos": i === 0 ? "Top (Start)" : "Bottom (End)"
  })))
  console.groupEnd()

  return edgesWithScore
}

// === [Input 데이터] ===
const inputData = computed(() => {
  // 1. 고정 포트 처리
  if (inputPorts.value.length > 0) {
    const count = inputPorts.value.length
    // points 순서: [Index 0 = Top] ... [Index N = Bottom]
    const { points, pathD } = getArcGeometry(false, count)

    const myNode = findNode(props.id)
    const myCenter = getNodeCenter(myNode)

    const portsWithScore = inputPorts.value.map((name, i) => {
      const portId = `in-${i}`
      const connectedEdges = edges.value.filter(e => e.target === props.id && e.targetHandle === portId)

      let avgScore = 999 // 연결 없으면 뒤(Bottom)로 보냄
      let connectedInfo = "None"

      if (connectedEdges.length > 0) {
        let sumScore = 0
        connectedEdges.forEach(e => {
          const srcNode = findNode(e.source)
          const srcCenter = getNodeCenter(srcNode)
          // Input=true (CCW)
          sumScore += getAngleScore(myCenter, srcCenter, true)
        })
        avgScore = sumScore / connectedEdges.length
        connectedInfo = connectedEdges.map(e => getNodeLabel(e.source)).join(", ")
      }

      return { name, id: portId, score: avgScore, originalIndex: i, connectedInfo }
    })

    // 고정 포트 정렬: 오름차순
    portsWithScore.sort((a, b) => {
      if (a.score === 999 && b.score === 999) return a.originalIndex - b.originalIndex
      return a.score - b.score
    })

    const mappedPoints = points.map((p, i) => {
      const portInfo = portsWithScore[i]
      const safeId = portInfo?.id ?? `in-${i}`
      const safeName = portInfo?.name ?? ''
      return { id: safeId, x: p.x, y: p.y, name: safeName }
    })
    return { pathD, points: mappedPoints }
  }

  // 2. 동적 포트 처리
  const sortedEdges = getSortedEdges(true) // 오름차순
  const count = Math.max(sortedEdges.length, 1)
  const { points, pathD } = getArcGeometry(false, count)

  const mappedPoints = points.map((p, i) => {
    const info = sortedEdges[i]
    const handleId = info?.edge.targetHandle ?? `in-${info?.originalIdx ?? i}`
    return { id: handleId, x: p.x, y: p.y, name: '' }
  })

  return { pathD, points: mappedPoints }
})

const inputArcPath = computed(() => inputData.value.pathD)
const inputHandles = computed(() => inputData.value.points)

// === [Output 데이터] ===
const outputData = computed(() => {
  const sortedEdges = getSortedEdges(false) // 오름차순
  const count = sortedEdges.length
  const effectiveCount = count === 0 ? 1 : count
  const { points, pathD } = getArcGeometry(true, effectiveCount)

  const mappedPoints = points.map((p, i) => {
    const info = sortedEdges[i]
    const handleId = info?.edge.sourceHandle ?? `out-${info?.originalIdx ?? i}`
    return { id: handleId, x: p.x, y: p.y }
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