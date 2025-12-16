<script setup lang="ts">
import { computed } from 'vue'
import { BaseEdge, getBezierPath, type EdgeProps } from '@vue-flow/core'

type EdgeData = {
  label?: string
  enabled?: boolean
}

const props = defineProps<EdgeProps<EdgeData>>()

const enabled = computed<boolean>(() => props.data?.enabled !== false)

const label = computed<string>(() => {
  const direct = (props as any).label as string | undefined
  if (typeof direct === 'string' && direct.trim()) return direct.trim()
  const d = props.data?.label
  return typeof d === 'string' ? d : ''
})

const hasValidPoints = computed<boolean>(() => {
  return (
      Number.isFinite(props.sourceX) &&
      Number.isFinite(props.sourceY) &&
      Number.isFinite(props.targetX) &&
      Number.isFinite(props.targetY)
  )
})

/**
 * getBezierPath returns: [path, labelX, labelY]
 */
const bezier = computed<readonly [string, number, number] | null>(() => {
  if (!hasValidPoints.value) return null

  const [path, x, y] = getBezierPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    targetX: props.targetX,
    targetY: props.targetY,
    sourcePosition: props.sourcePosition,
    targetPosition: props.targetPosition,
  })

  return [path, x, y] as const
})

const edgePath = computed<string>(() => bezier.value?.[0] ?? '')
const labelX = computed<number>(() => (bezier.value ? bezier.value[1] : 0))
const labelY = computed<number>(() => (bezier.value ? bezier.value[2] : 0))
const pathId = computed<string>(() => `oj-edge-path-${props.id}`)

/** ====== Cubic Bezier tangent angle for selected label rotation ====== */
type Cubic = {
  p0: { x: number; y: number }
  p1: { x: number; y: number }
  p2: { x: number; y: number }
  p3: { x: number; y: number }
}

function parseCubicFromPath(d: string): Cubic | null {
  // Expected: "M x y C x1 y1 x2 y2 x y"
  const nums = d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? []
  if (nums.length < 8) return null

  const x0 = nums[0]!
  const y0 = nums[1]!
  const x1 = nums[2]!
  const y1 = nums[3]!
  const x2 = nums[4]!
  const y2 = nums[5]!
  const x3 = nums[6]!
  const y3 = nums[7]!

  return {
    p0: { x: x0, y: y0 },
    p1: { x: x1, y: y1 },
    p2: { x: x2, y: y2 },
    p3: { x: x3, y: y3 },
  }
}

function cubicDerivative(c: Cubic, t: number): { x: number; y: number } {
  const mt = 1 - t
  const a = 3 * mt * mt
  const b = 6 * mt * t
  const c3 = 3 * t * t

  return {
    x:
        a * (c.p1.x - c.p0.x) +
        b * (c.p2.x - c.p1.x) +
        c3 * (c.p3.x - c.p2.x),
    y:
        a * (c.p1.y - c.p0.y) +
        b * (c.p2.y - c.p1.y) +
        c3 * (c.p3.y - c.p2.y),
  }
}

const selectedAngleDeg = computed<number>(() => {
  const d = edgePath.value
  if (!d) return 0

  const cubic = parseCubicFromPath(d)
  if (!cubic) return 0

  const der = cubicDerivative(cubic, 0.5)
  let ang = (Math.atan2(der.y, der.x) * 180) / Math.PI

  // Prevent upside-down text
  if (ang > 90) ang -= 180
  if (ang < -90) ang += 180

  return ang
})

/** ====== label box geometry ====== */
const fontSize = 11
const padX = 8
const padY = 5

const approxTextWidth = computed<number>(() => {
  const s = label.value
  if (!s) return 24
  return Math.max(24, s.length * 6.2)
})

const boxW = computed<number>(() => approxTextWidth.value + padX * 2)
const boxH = computed<number>(() => fontSize + padY * 2)

const selectedLift = 10
</script>

<template>
  <!-- Edge line -->
  <BaseEdge
      :id="id"
      :path="edgePath"
      :interaction-width="14"
      :style="{
      stroke: '#8EA0B2',
      strokeWidth: selected ? 3 : 2,
      strokeDasharray: enabled ? undefined : '4 4',
    }"
  />

  <!-- defs for textPath (non-selected label) -->
  <defs v-if="hasValidPoints && label">
    <path
        :id="pathId"
        :d="edgePath"
        fill="none"
        stroke="none"
    />
  </defs>

  <!-- ✅ Selected: rotated pill label (keeps edge direction) -->
  <g
      v-if="hasValidPoints && label && selected"
      :transform="`translate(${labelX}, ${labelY}) rotate(${selectedAngleDeg}) translate(0, ${-selectedLift})`"
      style="pointer-events: none;"
  >
    <rect
        class="oj-edge-pill"
        :x="-(boxW / 2)"
        :y="-(boxH / 2)"
        :width="boxW"
        :height="boxH"
        rx="6"
        ry="6"
    />
    <text
        class="oj-edge-pill-text"
        x="0"
        y="0"
        text-anchor="middle"
        dominant-baseline="middle"
    >
      {{ label }}
    </text>
  </g>

  <!-- ✅ Non-selected: follow edge path (no background) -->
  <text
      v-else-if="hasValidPoints && label"
      class="oj-edge-label"
      text-anchor="middle"
      dominant-baseline="middle"
      dy="-6"
      style="pointer-events: none;"
  >
    <textPath
        :href="`#${pathId}`"
        startOffset="50%"
        text-anchor="middle"
    >
      {{ label }}
    </textPath>
  </text>
</template>

<style scoped>
.oj-edge-label {
  fill: #4b5563;
  font-size: 11px;
  font-weight: 500;
}

/* selected pill */
.oj-edge-pill {
  fill: #2f6fed;
  stroke: #2f6fed;
  stroke-width: 1;
  shape-rendering: geometricPrecision;
}

.oj-edge-pill-text {
  fill: #ffffff;
  font-size: 11px;
  font-weight: 600;
}
</style>
