<template>
  <div class="oj-history">
    <div class="oj-history-header">
      <div class="oj-history-title">History</div>

      <div class="oj-history-actions">
        <button type="button" class="btn" :disabled="!canUndo" @click="undo">Undo</button>
        <button type="button" class="btn" :disabled="!canRedo" @click="redo">Redo</button>
        <button type="button" class="btn ghost" @click="$emit('close')">Close</button>
      </div>
    </div>

    <div class="oj-history-sub">
      <div class="left">
        <button type="button" class="btn sm" @click="jumpTo(0)">⟲ Start</button>
        <button type="button" class="btn sm" @click="jumpTo(timeline.length)">⟲ End</button>
      </div>

      <div class="right">
        <button type="button" class="btn sm" @click="exportBundle">Export</button>

        <label class="btn sm file">
          Import
          <input type="file" accept=".json,application/json" @change="onImportFile" />
        </label>
      </div>
    </div>

    <div class="oj-history-body">
      <div class="oj-history-hint">
        Cursor: <b>{{ cursor }}</b> / {{ timeline.length }}
      </div>

      <ul class="oj-history-list">
        <li
            v-for="(c, idx) in timeline"
            :key="c.id"
            class="oj-history-item"
            :class="{
            applied: idx < cursor,
            current: idx === cursor - 1,
          }"
            @click="jumpTo(idx + 1)"
        >
          <div class="row1">
            <span class="idx">#{{ idx + 1 }}</span>
            <span class="type">{{ titleOfCommand(c) }}</span>
          </div>
          <div class="row2">
            <span class="time">{{ formatTime(c.timestamp) }}</span>
          </div>
        </li>

        <li v-if="timeline.length === 0" class="oj-history-empty">
          아직 기록이 없습니다.
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useHistoryStore } from '@/stores/historyStore'

defineEmits<{ (e: 'close'): void }>()

const history = useHistoryStore()

const canUndo = computed(() => history.undoStack.length > 0)
const canRedo = computed(() => history.redoStack.length > 0)

const timeline = computed(() => history.timeline)
const cursor = computed(() => history.cursor)

const undo = () => history.undo()
const redo = () => history.redo()

const jumpTo = (appliedCount: number) => history.jumpTo(appliedCount)

const exportBundle = () => {
  const json = history.exportBundle()
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `oj-workflow-bundle_${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

const onImportFile = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const f = input.files?.[0]
  if (!f) return
  const text = await f.text()
  history.importBundle(text)
  input.value = ''
}

const formatTime = (ts: number) => {
  try {
    return new Date(ts).toLocaleString()
  } catch {
    return String(ts)
  }
}

const labelOfCommand = (c: SerializedCommand) => {
  if (c.type === 'node/add') {
    const l = c.payload?.node?.label
    return (typeof l === 'string' && l.trim() !== '') ? l : null
  }

  if (c.type === 'edge/add') {
    const l = c.payload?.edge?.label
    if (typeof l === 'string' && l.trim() !== '') return l

    const sc = c.payload?.edge?.sourceChannel
    const tc = c.payload?.edge?.targetChannel

    return (
        (typeof sc === 'string' && sc) || (typeof tc === 'string' && tc)
            ? `${sc ?? ''}${sc && tc ? '→' : ''}${tc ?? ''}`.trim()
            : null
    )
  }

  // ✅ node/move: payload.nodeId 기반으로 표시(최소 구현)
  if (c?.type === 'node/move') {
    const l = c?.payload?.label
    return typeof l === 'string' && l.trim() ? l.trim() : null
  }

  return null
}

const titleOfCommand = (c: SerializedCommand) => {
  const type = String(c?.type ?? '')
  const [kind, action] = type.split('/')
  const lbl = labelOfCommand(c)

  if (kind && action && lbl) return `${kind}(${lbl})/${action}`
  return type || '(unknown)'
}

</script>

<style scoped>
.oj-history {
  height: 100%;
  display: flex;
  flex-direction: column;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 12px;
  color: #222;
}

.oj-history-header {
  padding: 10px 10px 8px;
  border-bottom: 1px solid #d7d7d7;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.oj-history-title {
  font-weight: 700;
  font-size: 13px;
}

.oj-history-actions {
  display: flex;
  gap: 6px;
}

.oj-history-sub {
  padding: 8px 10px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.oj-history-sub .left,
.oj-history-sub .right {
  display: flex;
  gap: 6px;
  align-items: center;
}

.oj-history-body {
  flex: 1 1 auto;
  overflow: auto;
  padding: 10px;
}

.oj-history-hint {
  color: #555;
  margin-bottom: 8px;
}

.oj-history-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.oj-history-item {
  padding: 8px 8px;
  border-radius: 10px;
  border: 1px solid #d7d7d7;
  background: #fff;
  cursor: pointer;
}

.oj-history-item.applied {
  background: #fffdf8;
  border-color: #e7d3b4;
}

.oj-history-item.current {
  outline: 2px solid #ff8a00;
  outline-offset: 0;
}

.row1 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.idx {
  color: #666;
  font-weight: 600;
}

.type {
  font-weight: 700;
}

.row2 {
  margin-top: 4px;
  color: #666;
  font-size: 11px;
}

.oj-history-empty {
  padding: 10px;
  color: #777;
}

.btn {
  height: 28px;
  padding: 0 10px;
  border-radius: 10px;
  border: 1px solid #d0d0d0;
  background: #fff;
  cursor: pointer;
  font-size: 12px;
}

.btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.btn.ghost {
  background: transparent;
}

.btn.sm {
  height: 26px;
  padding: 0 9px;
  border-radius: 10px;
  font-size: 12px;
}

.btn.file {
  position: relative;
  overflow: hidden;
}

.btn.file input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}
</style>
