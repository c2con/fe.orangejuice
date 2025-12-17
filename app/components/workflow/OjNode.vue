<template>
  <div class="oj-node-wrapper" :class="{ selected: selected }">
    <div class="oj-visual-container">

      <svg class="oj-arcs-svg" viewBox="0 0 100 80">
        <!-- 입력 원호: 슬롯이 정의돼 있으면 항상 표시 (연결 없으면 점선) -->
        <path
            v-if="hasInputSlot"
            :d="inputArcPath"
            class="oj-arc-path"
            :class="{ 'is-dashed': !inputConnected }"
        />
        <!-- ✅ 입력 원호 hit-area (아크 위에서 드래그 시작) -->
        <path
            v-if="hasInputSlot"
            :d="inputArcPath"
            class="oj-arc-hit"
            @pointerdown="onInputArcPointerDown"
        />

        <!-- 출력 원호: 슬롯이 정의돼 있으면 항상 표시 (연결 없으면 점선) -->
        <path
            v-if="hasOutputSlot"
            :d="outputArcPath"
            class="oj-arc-path"
            :class="{ 'is-dashed': !outputConnected }"
        />
        <!-- ✅ 출력 원호 hit-area -->
        <path
            v-if="hasOutputSlot"
            :d="outputArcPath"
            class="oj-arc-hit"
            @pointerdown="onOutputArcPointerDown"
        />
      </svg>

      <!-- ✅ 입력 핸들: 연결이 없으면 ghost(handle은 존재, 점은 안 보임) -->
      <div v-if="inputHandlesToRender.length > 0" class="handles-layer">
        <Handle
            v-for="(h, idx) in inputHandlesToRender"
            :key="`${id}-in-${idx}-${h.id}`"
            type="target"
            :position="Position.Left"
            :id="h.id"
            class="oj-handle"
            :class="{ 'is-ghost': h.ghost }"
            :style="getInputHandleStyle(idx, inputHandlesToRender.length)"
        >
          <span v-if="!h.ghost" class="handle-tooltip left">{{ h.name }}</span>
        </Handle>
      </div>

      <div class="oj-icon-circle" :style="{ borderColor: nodeColor }">
        <div class="circle-bg" :style="{ backgroundColor: nodeColor }"></div>
        <img v-if="data?.icon" :src="data.icon" class="node-icon" alt="" @error="onImageError" />
        <span v-else class="fallback-text" :style="{ color: nodeColor }">{{ label[0] }}</span>
      </div>

      <!-- ✅ 출력 핸들: 연결이 없으면 ghost -->
      <div v-if="outputHandlesToRender.length > 0" class="handles-layer">
        <Handle
            v-for="(h, idx) in outputHandlesToRender"
            :key="`${id}-out-${idx}-${h.id}`"
            type="source"
            :position="Position.Right"
            :id="h.id"
            class="oj-handle"
            :class="{ 'is-ghost': h.ghost }"
            :style="getOutputHandleStyle(idx, outputHandlesToRender.length)"
        >
          <span v-if="!h.ghost" class="handle-tooltip right">{{ h.name }}</span>
        </Handle>
      </div>
    </div>

    <div class="oj-node-label">{{ label }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import { Handle, Position, useHandle } from '@vue-flow/core'
import { getWidgetDef, getWidgetColor } from '@/utils/widgetDefinitions'

type Port = { id: string; name: string; ghost?: boolean }

const props = defineProps({
  id: { type: String, required: true },
  data: { type: Object, required: false, default: () => ({}) },
  selected: { type: Boolean, default: false },
})

const widgetDef = computed(() => getWidgetDef(props.data?.widgetId || props.data?.label))

// edges 기반(연결된 경우에만 들어오는 배열)
const inputs = computed<Port[]>(() => props.data?.inputs || [])
const outputs = computed<Port[]>(() => props.data?.outputs || [])

// ✅ 위젯 정의서 기반 슬롯(ghost handle 생성용)
const slotInputs = computed<string[]>(() => props.data?.slotInputs || [])
const slotOutputs = computed<string[]>(() => props.data?.slotOutputs || [])

// ✅ 슬롯 존재 여부: 아크를 항상 표시하기 위한 플래그
const hasInputSlot = computed(() => !!props.data?.hasInputSlot)
const hasOutputSlot = computed(() => !!props.data?.hasOutputSlot)

// ✅ 연결 여부: edges 기반 핸들이 있으면 연결된 것
const inputConnected = computed(() => inputs.value.length > 0)
const outputConnected = computed(() => outputs.value.length > 0)

const label = computed(() => props.data?.label || widgetDef.value?.label || 'Node')
const nodeColor = computed(() => getWidgetColor(props.data?.widgetId || props.data?.label))

// ======================================================
// ✅ ghost handle 포함 "렌더링할 핸들 목록"
// - 연결됨: edges 기반(보이는 점)
// - 미연결: 슬롯 기반 ghost(점은 숨김, 연결은 가능)
// ======================================================
const inputHandlesToRender = computed<Port[]>(() => {
  if (inputs.value.length > 0) {
    return inputs.value.map((h) => ({ ...h, ghost: false }))
  }
  // ghost는 slot 개수만큼 항상 제공 (handle id 규칙: `${name}#${idx}`)
  return slotInputs.value.map((name, idx) => ({
    id: `${name}#${idx}`,
    name,
    ghost: true,
  }))
})

const outputHandlesToRender = computed<Port[]>(() => {
  if (outputs.value.length > 0) {
    return outputs.value.map((h) => ({ ...h, ghost: false }))
  }
  return slotOutputs.value.map((name, idx) => ({
    id: `${name}#${idx}`,
    name,
    ghost: true,
  }))
})

// ======================================================
// Geometry
// ======================================================
const VIEW_W = 100
const VIEW_H = 80
const CX = VIEW_W / 2
const CY = VIEW_H / 2
const RADIUS = 36
const ARC_ANGLE = 90

const toRad = (deg: number) => deg * (Math.PI / 180)

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n))
}

const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
  const angleInRadians = toRad(angleInDegrees - 90)
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  }
}

const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
  const start = polarToCartesian(x, y, radius, endAngle)
  const end = polarToCartesian(x, y, radius, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'
  return ['M', start.x, start.y, 'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y].join(' ')
}

const inputArcPath = computed(() => {
  const start = 270 - ARC_ANGLE / 2 - 5
  const end = 270 + ARC_ANGLE / 2 + 5
  return describeArc(CX, CY, RADIUS, start, end)
})

const outputArcPath = computed(() => {
  const start = 90 - ARC_ANGLE / 2 - 5
  const end = 90 + ARC_ANGLE / 2 + 5
  return describeArc(CX, CY, RADIUS, start, end)
})

// 핸들 위치 (기존 방식 유지)
const getInputHandleStyle = (index: number, total: number) => {
  if (total <= 0) return {}
  const span = ARC_ANGLE

  if (total === 1) {
    const angleDeg = 180
    const x = CX + RADIUS * Math.cos(toRad(angleDeg))
    const y = CY + RADIUS * Math.sin(toRad(angleDeg))
    return { left: `${x}px`, top: `${y}px`, transform: 'translate(-50%, -50%)' }
  }

  const topAngle = 180 + span / 2
  const step = span / (total + 1)
  const angleDeg = topAngle - step * (index + 1)

  const x = CX + RADIUS * Math.cos(toRad(angleDeg))
  const y = CY + RADIUS * Math.sin(toRad(angleDeg))
  return { left: `${x}px`, top: `${y}px`, transform: 'translate(-50%, -50%)' }
}

const getOutputHandleStyle = (index: number, total: number) => {
  if (total <= 0) return {}
  const span = ARC_ANGLE

  if (total === 1) {
    const angleDeg = 0
    const x = CX + RADIUS * Math.cos(toRad(angleDeg))
    const y = CY + RADIUS * Math.sin(toRad(angleDeg))
    return { left: `${x}px`, top: `${y}px`, transform: 'translate(-50%, -50%)' }
  }

  const topAngle = -span / 2
  const step = span / (total + 1)
  const angleDeg = topAngle + step * (index + 1)

  const x = CX + RADIUS * Math.cos(toRad(angleDeg))
  const y = CY + RADIUS * Math.sin(toRad(angleDeg))
  return { left: `${x}px`, top: `${y}px`, transform: 'translate(-50%, -50%)' }
}

// ======================================================
// ✅ 아크→핸들 드래그 시작 브릿지
// - VueFlow는 Handle의 handlePointerDown(MouseEvent)로만 드래그가 시작됨
// - PointerEvent를 MouseEvent로 변환해서 호출
// ======================================================
function toMouseEvent(e: PointerEvent): MouseEvent {
  return new MouseEvent('mousedown', {
    bubbles: true,
    cancelable: true,
    clientX: e.clientX,
    clientY: e.clientY,
    button: 0,
    buttons: 1,
  })
}

function getLocalFromSvgEvent(e: PointerEvent): { x: number; y: number } {
  const svg = (e.currentTarget as SVGPathElement).ownerSVGElement
  if (!svg) return { x: 0, y: 0 }
  const pt = svg.createSVGPoint()
  pt.x = e.clientX
  pt.y = e.clientY
  const m = svg.getScreenCTM()
  if (!m) return { x: 0, y: 0 }
  const local = pt.matrixTransform(m.inverse())
  return { x: local.x, y: local.y }
}

// arc 위 좌표로 가장 가까운 인덱스 선택 (좌/우 분리)
function pickIndexByPointer(localX: number, localY: number, total: number, side: 'left' | 'right') {
  if (total <= 1) return 0

  const ang = Math.atan2(localY - CY, localX - CX) // -PI..PI

  let t = 0
  if (side === 'right') {
    const start = -Math.PI / 4
    const end = Math.PI / 4
    t = (clamp(ang, start, end) - start) / (end - start)
  } else {
    const norm = ang < 0 ? ang + Math.PI * 2 : ang
    const start = (3 * Math.PI) / 4
    const end = (5 * Math.PI) / 4
    t = (clamp(norm, start, end) - start) / (end - start)
  }

  return clamp(Math.round(t * (total - 1)), 0, total - 1)
}

// useHandle 브릿지 맵
const inputHandleDownMap = ref(new Map<string, (e: MouseEvent) => void>())
const outputHandleDownMap = ref(new Map<string, (e: MouseEvent) => void>())

watchEffect(() => {
  const map = new Map<string, (e: MouseEvent) => void>()
  for (const h of inputHandlesToRender.value) {
    const { handlePointerDown } = useHandle({
      nodeId: props.id,
      handleId: h.id,
      type: 'target',
    })
    map.set(h.id, handlePointerDown as unknown as (e: MouseEvent) => void)
  }
  inputHandleDownMap.value = map
})

watchEffect(() => {
  const map = new Map<string, (e: MouseEvent) => void>()
  for (const h of outputHandlesToRender.value) {
    const { handlePointerDown } = useHandle({
      nodeId: props.id,
      handleId: h.id,
      type: 'source',
    })
    map.set(h.id, handlePointerDown as unknown as (e: MouseEvent) => void)
  }
  outputHandleDownMap.value = map
})

const onInputArcPointerDown = (e: PointerEvent) => {
  // 좌클릭만
  if (e.button !== 0) return
  e.preventDefault()
  e.stopPropagation()

  const list = inputHandlesToRender.value
  if (!list.length) return

  const { x, y } = getLocalFromSvgEvent(e)
  const idx = pickIndexByPointer(x, y, list.length, 'left')
  const handleId = list[idx]?.id
  if (!handleId) return

  inputHandleDownMap.value.get(handleId)?.(toMouseEvent(e))
}

const onOutputArcPointerDown = (e: PointerEvent) => {
  if (e.button !== 0) return
  e.preventDefault()
  e.stopPropagation()

  const list = outputHandlesToRender.value
  if (!list.length) return

  const { x, y } = getLocalFromSvgEvent(e)
  const idx = pickIndexByPointer(x, y, list.length, 'right')
  const handleId = list[idx]?.id
  if (!handleId) return

  if (!(e.currentTarget instanceof Element)) return
  outputHandleDownMap.value.get(handleId)?.(e)
}

const onImageError = (e: Event) => {
  const target = e.target as HTMLImageElement
  if (target) target.style.display = 'none'
}
</script>

<style scoped>
.oj-node-wrapper { position: relative; width: 100px; display: flex; flex-direction: column; align-items: center; }
.oj-visual-container { position: relative; width: 100px; height: 80px; display: flex; justify-content: center; align-items: center; }

/* ✅ hit-area가 이벤트를 받아야 하므로 pointer-events: auto */
.oj-arcs-svg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: auto; z-index: 1; overflow: visible; }

/* 보이는 아크는 이벤트 받지 않음 */
.oj-arc-path {
  fill: none;
  stroke: #78909C;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-opacity: 0.8;
  pointer-events: none;
}

/* 연결이 없으면 점선 */
.oj-arc-path.is-dashed {
  stroke-dasharray: 4 4;
}

/* ✅ 아크 전체 hit-area (투명) */
.oj-arc-hit {
  fill: none;
  stroke: transparent;
  stroke-width: 18px;
  pointer-events: stroke;
  cursor: crosshair;
}

.handles-layer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 10; }

.oj-handle {
  position: absolute;
  width: 9px;
  height: 9px;
  background: #546e7a;
  border: 1.5px solid white;
  border-radius: 50%;
  pointer-events: auto;
  z-index: 20;
  transition: transform 0.1s;
}

/* ✅ ghost handle: 안 보이지만 존재해야 드롭/연결 가능 */
.oj-handle.is-ghost {
  opacity: 0;
  background: transparent;
  border-color: transparent;
}

.oj-handle:hover { transform: translate(-50%, -50%) scale(1.4); }

.handle-tooltip { display: none; position: absolute; top: -20px; background: rgba(0,0,0,0.8); color: white; font-size: 10px; padding: 2px 4px; border-radius: 3px; white-space: nowrap; pointer-events: none; }
.oj-handle:hover .handle-tooltip { display: block; }
.handle-tooltip.left { right: 10px; }
.handle-tooltip.right { left: 10px; }

.oj-icon-circle { width: 48px; height: 48px; border-radius: 50%; border-width: 2.5px; border-style: solid; background: white; position: relative; display: flex; align-items: center; justify-content: center; z-index: 5; box-shadow: 0 3px 6px rgba(0,0,0,0.1); overflow: hidden; }
.circle-bg { position: absolute; inset: 0; opacity: 0.15; }
.node-icon { width: 28px; height: 28px; object-fit: contain; z-index: 2; }
.fallback-text { font-weight: bold; font-size: 20px; z-index: 2; }
.oj-node-label { margin-top: 2px; font-size: 11px; color: #333; text-align: center; font-weight: 600; white-space: nowrap; max-width: 120px; overflow: hidden; text-overflow: ellipsis; text-shadow: 0 1px 2px white; }
.selected .oj-icon-circle { box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.5); }
</style>
