<template>
  <div class="oj-node-wrapper" :class="{ selected: selected }">
    <div class="oj-visual-container">

      <svg class="oj-arcs-svg" viewBox="0 0 100 80">
        <!-- 입력 원호 -->
        <path
            v-if="inputs.length > 0"
            :d="inputArcPath"
            class="oj-arc-path"
        />

        <!-- 출력 원호 -->
        <path
            v-if="outputs.length > 0"
            :d="outputArcPath"
            class="oj-arc-path"
        />
      </svg>

      <div v-if="inputs.length > 0" class="handles-layer">
        <Handle
            v-for="(input, idx) in inputs"
            :key="`${id}-in-${idx}`"
            type="target"
            :position="Position.Left"
            :id="input.name || 'Data'"
            class="oj-handle"
            :style="getInputHandleStyle(idx, inputs.length)"
        >
          <span class="handle-tooltip left">{{ input.name }}</span>
        </Handle>
      </div>

      <div class="oj-icon-circle" :style="{ borderColor: nodeColor }">
        <div class="circle-bg" :style="{ backgroundColor: nodeColor }"></div>
        <img v-if="data?.icon" :src="data.icon" class="node-icon" alt="" @error="onImageError" />
        <span v-else class="fallback-text" :style="{ color: nodeColor }">{{ label[0] }}</span>
      </div>

      <div v-if="outputs.length > 0" class="handles-layer">
        <Handle
            v-for="(output, idx) in outputs"
            :key="`${id}-out-${idx}`"
            type="source"
            :position="Position.Right"
            :id="output.name || 'Data'"
            class="oj-handle"
            :style="getOutputHandleStyle(idx, outputs.length)"
        >
          <span class="handle-tooltip right">{{ output.name }}</span>
        </Handle>
      </div>
    </div>
    <div class="oj-node-label">{{ label }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import { getWidgetDef, getWidgetColor } from '@/utils/widgetDefinitions'

const props = defineProps({
  id: { type: String, required: true },
  data: { type: Object, required: false, default: () => ({}) },
  selected: { type: Boolean, default: false },
})

const widgetDef = computed(() => getWidgetDef(props.data?.widgetId || props.data?.label));

// 데이터가 없으면 빈 배열 []
const inputs = computed(() => props.data?.inputs || []);
const outputs = computed(() => props.data?.outputs || []);

const label = computed(() => props.data?.label || widgetDef.value?.label || 'Node');
const nodeColor = computed(() => getWidgetColor(props.data?.widgetId || props.data?.label));

// === Geometry ===
const VIEW_W = 100;
const VIEW_H = 80;
const CX = VIEW_W / 2;
const CY = VIEW_H / 2;
const RADIUS = 36; // 원호 반지름
const ARC_ANGLE = 90;

const toRad = (deg: number) => deg * (Math.PI / 180);

/**
 * SVG 아크와 동일 좌표계(0도=위, 시계방향 증가)를 쓰도록
 * polarToCartesian를 그대로 활용
 */
const polarToCartesian = (
    centerX: number,
    centerY: number,
    radius: number,
    angleInDegrees: number,
) => {
  const angleInRadians = toRad(angleInDegrees - 90)
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  }
}

/**
 * 입력 핸들: 왼쪽 아크(중심각 270도) 기준
 * - (개수+1) 등분의 내부 포인트에 배치
 */
const getInputHandleStyle = (index: number, total: number) => {
  if (total <= 0) return {}

  const span = ARC_ANGLE // 왼쪽 아크가 커버하는 각도 (예: 60도)

  // 하나일 때는 정 중앙(왼쪽)으로
  if (total === 1) {
    const angleDeg = 180 // 정확히 왼쪽
    const x = CX + RADIUS * Math.cos(toRad(angleDeg))
    const y = CY + RADIUS * Math.sin(toRad(angleDeg))
    return {
      left: `${x}px`,
      top: `${y}px`,
      transform: 'translate(-50%, -50%)',
    }
  }

  // ▶ (점 개수 + 1) 분할
  // 왼쪽 아크: 위쪽 끝(210°) ~ 아래쪽 끝(150°)
  const topAngle = 180 + span / 2  // 210° (왼쪽 위)
  const step = span / (total + 1)  // (N+1) 등분
  // index=0 이 제일 위쪽 내부 포인트가 되도록 위→아래 방향으로 배치
  const angleDeg = topAngle - step * (index + 1)

  const x = CX + RADIUS * Math.cos(toRad(angleDeg))
  const y = CY + RADIUS * Math.sin(toRad(angleDeg))
  return {
    left: `${x}px`,
    top: `${y}px`,
    transform: 'translate(-50%, -50%)',
  }
}


/**
 * 출력 핸들: 오른쪽 아크(중심각 90도) 기준
 * - (개수+1) 등분의 내부 포인트에 배치
 */
const getOutputHandleStyle = (index: number, total: number) => {
  if (total <= 0) return {}

  const span = ARC_ANGLE

  if (total === 1) {
    const angleDeg = 0 // 오른쪽 중앙
    const x = CX + RADIUS * Math.cos(toRad(angleDeg))
    const y = CY + RADIUS * Math.sin(toRad(angleDeg))
    return {
      left: `${x}px`,
      top: `${y}px`,
      transform: 'translate(-50%, -50%)',
    }
  }

  // 오른쪽 아크: 위쪽 끝(-span/2) ~ 아래쪽 끝(+span/2)
  const topAngle = -span / 2       // 예: -30° (오른쪽 위)
  const step = span / (total + 1)
  const angleDeg = topAngle + step * (index + 1) // 위→아래

  const x = CX + RADIUS * Math.cos(toRad(angleDeg))
  const y = CY + RADIUS * Math.sin(toRad(angleDeg))
  return {
    left: `${x}px`,
    top: `${y}px`,
    transform: 'translate(-50%, -50%)',
  }
}


const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return ["M", start.x, start.y, "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y].join(" ");
};
const inputArcPath = computed(() => {
  const start = 270 - (ARC_ANGLE / 2) - 5;
  const end = 270 + (ARC_ANGLE / 2) + 5;
  return describeArc(CX, CY, RADIUS, start, end);
});
const outputArcPath = computed(() => {
  const start = 90 - (ARC_ANGLE / 2) - 5;
  const end = 90 + (ARC_ANGLE / 2) + 5;
  return describeArc(CX, CY, RADIUS, start, end);
});

const onImageError = (e: Event) => {
  const target = e.target as HTMLImageElement;
  if(target) target.style.display = 'none';
}
</script>

<style scoped>
.oj-node-wrapper { position: relative; width: 100px; display: flex; flex-direction: column; align-items: center; }
.oj-visual-container { position: relative; width: 100px; height: 80px; display: flex; justify-content: center; align-items: center; }
.oj-arcs-svg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1; overflow: visible; }
/* 입력/출력 원호는 모두 같은 색상 사용 */
.oj-arc-path {
  fill: none;
  stroke: #78909C;      /* 목표 시스템에 가까운 오렌지 계열 한 색 */
  stroke-width: 3;
  stroke-linecap: round;
  stroke-opacity: 0.8;
}
.handles-layer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 10; }
.oj-handle { position: absolute; width: 9px; height: 9px; background: #546e7a; border: 1.5px solid white; border-radius: 50%; pointer-events: auto; z-index: 20; transition: transform 0.1s; }
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