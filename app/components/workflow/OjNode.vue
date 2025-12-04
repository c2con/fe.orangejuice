<template>
  <div class="oj-node-root">

    <div
        class="oj-node-body"
        :style="{ width: `${NODE_DIAMETER}px`, height: `${NODE_DIAMETER}px` }"
    >

      <div class="oj-canvas-layer">
        <svg class="oj-svg-canvas" viewBox="0 0 200 200">
          <path
              v-if="hasInput"
              :d="inputArcPath"
              class="oj-arc-path"
              :class="{ 'is-connected': inputConnected, 'is-dashed': !inputConnected }"
              @mousedown.left="onArcMouseDown($event, 'input')"
          />

          <path
              v-if="hasOutput"
              :d="outputArcPath"
              class="oj-arc-path"
              :class="{ 'is-connected': outputConnected, 'is-dashed': !outputConnected }"
              @mousedown.left="onArcMouseDown($event, 'output')"
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
import {
  Handle,
  Position,
  useVueFlow,
  useHandle,
} from '@vue-flow/core'
import { getWidgetColors } from '@/utils/widgetStyle'
import { getWidgetDef } from '@/utils/widgetDefinitions'
import type { WidgetDefinition } from '@/utils/widgetDefinitions'
import {
  NODE_DIAMETER,
  ARC_R,
  ARC_ANGLE,
  ARC_Y_OFFSET,
  CENTER,
  getAngleScore,
  getNodeCenter,
} from '@/utils/workflowGeometry'

interface NodeData {
  widgetId: string
  label: string
  inputs?: string[]
  outputs?: string[]
}

interface WidgetColors {
  bg: string
  border: string
}

const props = defineProps<{ id: string; data: NodeData }>()

// Vue Flow 상태
const { edges, findNode } = useVueFlow()


// 위젯 정의
const widgetDef = computed<WidgetDefinition>(() => {
  const def = getWidgetDef(props.data.widgetId) as WidgetDefinition | undefined
  return (
      def ?? {
        id: props.data.widgetId,
        label: props.data.label,
        categoryId: 'data',
        inputs: ['Data'],
        outputs: ['Data'],
        hasInput: true,
        hasOutput: true,
        icon: '/icons/widgets/default.svg',
      }
  )
})

// 포트 정의
const inputPorts = computed(() => {
  const dataInputs = props.data.inputs
  if (dataInputs && dataInputs.length > 0) return dataInputs
  return widgetDef.value.inputs ?? []
})

const outputPorts = computed(() => {
  const dataOutputs = props.data.outputs
  if (dataOutputs && dataOutputs.length > 0) return dataOutputs
  return widgetDef.value.outputs ?? []
})

const hasInput = computed(() => {
  const definedInputs = inputPorts.value.length > 0
  const hasIncomingEdges = edges.value?.some((e) => e.target === props.id) ?? false
  return definedInputs || hasIncomingEdges
})

const hasOutput = computed(() => {
  const definedOutputs = outputPorts.value.length > 0
  const hasOutgoingEdges = edges.value?.some((e) => e.source === props.id) ?? false
  return definedOutputs || hasOutgoingEdges
})

const iconSrc = computed(() => widgetDef.value.icon ?? '')

const inputConnected = computed(
    () => edges.value?.some((e) => e.target === props.id) ?? false,
)
const outputConnected = computed(
    () => edges.value?.some((e) => e.source === props.id) ?? false,
)

const colors = computed<WidgetColors>(() => {
  const c = getWidgetColors(props.data.widgetId) as WidgetColors | undefined
  return c ?? { bg: '#fff0e0', border: '#ffcd85' }
})

const circleStyle = computed<CSSProperties>(() => ({
  background: colors.value.bg,
  borderColor: colors.value.border,
  width: '100%',
  height: '100%',
  boxSizing: 'border-box',
}))

// 원호에서 마우스를 누르면 -> 해당 side의 handle의 onMouseDown을 그대로 호출
const onArcMouseDown = (e: MouseEvent, side: 'input' | 'output') => {
  e.preventDefault()
  e.stopPropagation()

  if (side === 'output') {
    const h = outputHandles.value[0]?.vue
    h?.handlePointerDown(e)
  } else {
    const h = inputHandles.value[0]?.vue
    h?.handlePointerDown(e)
  }
}

// ===== 아치 및 핸들 위치 계산 =====
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
      // 오른쪽: 위 → 아래 (CW 기준)
      deg = -halfAngle + step * (i + 1)
    } else {
      // 왼쪽: 아래 → 위 (CCW 기준)
      deg = 180 + halfAngle - step * (i + 1)
    }

    const rad = toRad(deg)
    const px = cx + ARC_R * Math.cos(rad)
    const py = cy + ARC_R * Math.sin(rad)
    points.push({ x: px.toFixed(2), y: py.toFixed(2) })
  }

  return { pathD, points }
}

// ===== 각도 기반 엣지 정렬(공통) =====
// isInputSide=true  → 입력: y축 음 방향 기준 CCW
// isInputSide=false → 출력: y축 음 방향 기준 CW
function sortEdgesByAngle(isInputSide: boolean) {
  if (!edges.value) return []

  const myEdges = edges.value.filter((e) =>
      isInputSide ? e.target === props.id : e.source === props.id,
  )
  if (myEdges.length === 0) return []

  const myNode = findNode(props.id)
  const myCenter = getNodeCenter(myNode)

  const edgesWithScore = myEdges.map((e, idx) => {
    const otherId = isInputSide ? e.source : e.target
    const otherNode = findNode(otherId)
    const otherCenter = getNodeCenter(otherNode)

    const score = getAngleScore(myCenter, otherCenter, isInputSide)
    return { edge: e, originalIdx: idx, score }
  })

  // 각도 점수 작은 순 → 위쪽 핸들
  edgesWithScore.sort((a, b) => a.score - b.score)
  return edgesWithScore
}

// ===== Input 데이터 =====
const inputData = computed(() => {
  const incomingEdges = edges.value?.filter((e) => e.target === props.id) ?? []
  const edgeCount = incomingEdges.length
  const portCount = inputPorts.value.length

  const handleCount = edgeCount > 0 ? edgeCount : portCount
  if (handleCount === 0) {
    return {
      pathD: '',
      points: [] as { id: string; x: string; y: string; name: string }[],
    }
  }

  const { points, pathD } = getArcGeometry(false, handleCount)

  // 엣지가 없으면 포트 정의 순서대로만 표시
  if (edgeCount === 0) {
    if (portCount > 0) {
      const pts = inputPorts.value.map((name, i) => {
        const p = points[i] ?? points[0] ?? { x: '0', y: '0' }
        return { id: `in-${i}`, x: p.x, y: p.y, name }
      })
      return { pathD, points: pts }
    }

    const p0 = points[0] ?? { x: '0', y: '0' }
    return {
      pathD,
      points: [{ id: 'in-0', x: p0.x, y: p0.y, name: 'Data' }],
    }
  }

  // 엣지가 있는 경우: 각도 순으로 재배치
  const sorted = sortEdgesByAngle(true)

  const mappedPoints = sorted.map((info, i) => {
    const p = points[i] ?? points[points.length - 1] ?? { x: '0', y: '0' }
    const handleId =
        (info.edge.targetHandle as string | undefined) ?? `in-${info.originalIdx}`
    const name =
        inputPorts.value[i] ??
        inputPorts.value[0] ??
        'Data'

    return {
      id: handleId,
      x: p.x,
      y: p.y,
      name,
    }
  })

  return { pathD, points: mappedPoints }
})

const inputArcPath = computed(() => inputData.value.pathD)
const inputHandles = computed(() =>
    inputData.value.points.map((p, idx) => ({
      ...p,
      vue: useHandle({
        nodeId: props.id,
        handleId: `in-${idx}`,
        type: 'target',
      })
    }))
)

// ===== Output 데이터 =====
const outputData = computed(() => {
  const outgoingEdges = edges.value?.filter((e) => e.source === props.id) ?? []
  const edgeCount = outgoingEdges.length

  const handleCount = edgeCount > 0 ? edgeCount : 1
  const { points, pathD } = getArcGeometry(true, handleCount)

  // 엣지가 없으면 기본 1개 핸들
  if (edgeCount === 0) {
    const p0 = points[0] ?? { x: '0', y: '0' }
    return {
      pathD,
      points: [{ id: 'out-0', x: p0.x, y: p0.y }],
    }
  }

  const sorted = sortEdgesByAngle(false)

  const mappedPoints = sorted.map((info, i) => {
    const p = points[i] ?? points[points.length - 1] ?? { x: '0', y: '0' }
    const handleId =
        (info.edge.sourceHandle as string | undefined) ?? `out-${info.originalIdx}`
    return {
      id: handleId,
      x: p.x,
      y: p.y,
    }
  })

  return { pathD, points: mappedPoints }
})

const outputArcPath = computed(() => outputData.value.pathD)
const outputHandles = computed(() =>
    outputData.value.points.map((p, idx) => ({
      ...p,
      vue: useHandle({
        nodeId: props.id,
        handleId: `out-${idx}`,
        type: 'source',
      })
    }))
)
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
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 2px solid #ccc;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  box-sizing: border-box;
}

.oj-node-inner {
  width: 70%;
  height: 70%;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}

.oj-node-icon {
  width: 60%;
  height: 60%;
  object-fit: contain;
  opacity: 0.85;
}

.oj-canvas-layer {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 200px;
  height: 200px;
  transform: translate(-50%, -50%);
  pointer-events: auto;   /* ✅ 원호도 마우스 이벤트 대상 */
  z-index: -1;            /* 일단 장식 레이어 그대로 유지 */
}

.oj-svg-canvas {
  width: 100%;
  height: 100%;
  overflow: visible;
}

.oj-handle-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 20;
  pointer-events: auto;   /* ✅ 핸들이 클릭/드래그 받는 레이어 */
}

/* 원호 */
.oj-arc-path {
  fill: none;
  stroke: #bdc3c7;
  stroke-width: 4px;
  stroke-linecap: round;
  transition: all 0.3s ease;

  cursor: crosshair;      /* 🔥핸들과 동일한 “큰 +” */
  pointer-events: stroke;
}

.oj-arc-path.is-dashed {
  stroke: #d0d0d0;       /* 옅은 회색 */
  stroke-dasharray: 6 6; /* 점선 */
  opacity: 0.5;          /* 옅게 표시 */
}

.oj-arc-path.is-connected {
  stroke: #7f8c8d;
  stroke-dasharray: none;
  opacity: 1;
}

/* 핸들 */
.oj-node-handle {
  position: absolute;
  width: 4px;
  height: 4px;
  border-radius: 50%;

  /* transform 으로만 중심 정렬 */
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

.oj-node-label {
  margin-top: 4px;
  font-size: 11px;
  color: #333;
  font-family: sans-serif;
  text-align: center;
  white-space: nowrap;
  text-shadow: 0 1px 1px rgba(255, 255, 255, 0.8);
}
</style>
