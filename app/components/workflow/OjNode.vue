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
          <img v-if="iconSrc" :src="iconSrc" alt="" class="oj-node-icon" />
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

const inputData = computed(() => {
  const count = inputPorts.value.length
  const { points, pathD } = getArcGeometry(false, count)

  const mappedPoints =
      count > 0
          ? inputPorts.value.map((name, i) => {
            const p = points[i] ?? points[0] ?? { x: '0', y: '0' }
            return {
              id: `in-${i}`,
              x: p.x,
              y: p.y,
              name
            }
          })
          : []

  // count === 0 일 때도 points[0] 가 있다는 보장을 위해 length 체크
  if (mappedPoints.length === 0 && count === 0 && hasInput.value && points.length > 0) {
    const p0 = points[0] ?? { x: '0', y: '0' }
    return {
      pathD,
      points: [{ id: 'in-0', x: p0.x, y: p0.y, name: 'Data' }]
    }
  }

  return { pathD, points: mappedPoints }
})

const inputArcPath = computed(() => inputData.value.pathD)
const inputHandles = computed(() => inputData.value.points)

// === [핵심 로직] 좌표 방어 로직이 포함된 각도 정렬 ===
const outputData = computed(() => {
  if (!edges.value) return { pathD: '', points: [] as { id: string; x: string; y: string }[] }

  const myEdges = edges.value.filter(e => e.source === props.id)
  const count = myEdges.length

  const sourceNode = findNode(props.id)
  const sX = sourceNode?.computedPosition?.x ?? sourceNode?.position?.x ?? 0
  const sY = sourceNode?.computedPosition?.y ?? sourceNode?.position?.y ?? 0

  const srcCenterX = sX + NODE_DIAMETER / 2
  const srcCenterY = sY + NODE_DIAMETER / 2

  const edgesWithAngle = myEdges.map((e, idx) => {
    const targetNode = findNode(e.target)

    const tX = targetNode?.computedPosition?.x ?? targetNode?.position?.x ?? 0
    const tY = targetNode?.computedPosition?.y ?? targetNode?.position?.y ?? 0
    const tW = targetNode?.dimensions?.width ?? NODE_DIAMETER
    const tH = targetNode?.dimensions?.height ?? NODE_DIAMETER

    const targetCenterX = tX + tW / 2
    const targetCenterY = tY + tH / 2

    const dx = targetCenterX - srcCenterX
    const dy = targetCenterY - srcCenterY

    const angle = (Math.atan2(dy, dx) * 180) / Math.PI

    return { edge: e, angle, originalIdx: idx }
  })

  edgesWithAngle.sort((a, b) => a.angle - b.angle)

  const { points, pathD } = getArcGeometry(true, count)

  if (count === 0 && points.length > 0) {
    const p0 = points[0] ?? { x: '0', y: '0' }
    return { pathD, points: [{ id: 'out-def', x: p0.x, y: p0.y }] }
  }

  const mappedPoints = points.map((p, i) => {
    const info = edgesWithAngle[i]
    if (!info) {
      return { id: `out-${i}`, x: p.x, y: p.y }
    }
    const handleId = (info.edge.sourceHandle as string | undefined) ?? `out-${info.originalIdx}`
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