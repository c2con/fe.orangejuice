<!-- ServiceMenuBar.vue -->
<template>
  <header class="oj-service-bar">
    <!-- 왼쪽: 로고 / 서비스 이름 -->
    <div class="oj-service-left">
      <!-- 🔸 텍스트 기반 OJ 로고 -->
      <span class="oj-logo-text">OJ</span>

      <!-- 서비스명 -->
      <slot name="logo">
        <span class="oj-service-title">Orange Juice</span>
      </slot>
    </div>

    <!-- 오른쪽: 마켓 / 설정 / 작업 / 로그인 -->
    <nav class="oj-service-right">
      <!-- 마켓 -->
      <button
          type="button"
          class="oj-service-btn"
          @click="emitMarket"
      >
        <span class="oj-service-icon-wrap">
          <svg
              class="oj-service-icon"
              viewBox="0 0 24 24"
              aria-hidden="true"
          >
            <path
                d="M7 7V6a5 5 0 0 1 10 0v1h2a1 1 0 0 1 .99 1.14l-1.6 10A2 2 0 0 1 15.42 20H8.58a2 2 0 0 1-1.97-1.86l-1.6-10A1 1 0 0 1 6 7h1zm2 0h6V6a3 3 0 0 0-6 0v1z"
            />
          </svg>
        </span>
        <span class="oj-service-label">마켓</span>
      </button>

      <!-- 설정 -->
      <button
          type="button"
          class="oj-service-btn"
          @click="emitSettings"
      >
        <span class="oj-service-icon-wrap">
          <svg
              class="oj-service-icon"
              viewBox="0 0 24 24"
              aria-hidden="true"
          >
            <path
                d="M19.14 12.94a7.97 7.97 0 0 0 .06-.94 7.97 7.97 0 0 0-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.61-.22l-2.39.96a7.98 7.98 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 13.9 2h-3.8a.5.5 0 0 0-.5.43l-.36 2.54a7.98 7.98 0 0 0-1.63.94l-2.39-.96a.5.5 0 0 0-.61.22L2.59 8.99a.5.5 0 0 0 .12.64L4.74 11.2a7.97 7.97 0 0 0-.06.94c0 .32.02.63.06.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .61.22l2.39-.96c.5.39 1.04.72 1.63.94l.36 2.54a.5.5 0 0 0 .5.43h3.8a.5.5 0 0 0 .5-.43l.36-2.54c.59-.22 1.13-.55 1.63-.94l2.39.96a.5.5 0 0 0 .61-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58zM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7z"
            />
          </svg>
        </span>
        <span class="oj-service-label">설정</span>
      </button>

      <!-- 작업 (Job / Task) -->
      <button
          type="button"
          class="oj-service-btn"
          @click="emitJobs"
      >
        <span class="oj-service-icon-wrap oj-service-icon-badge-wrap">
          <svg
              class="oj-service-icon"
              viewBox="0 0 24 24"
              aria-hidden="true"
          >
            <path
                d="M5 6h14v2H5V6zm0 5h14v2H5v-2zm0 5h14v2H5v-2zM3 6h1v2H3V6zm0 5h1v2H3v-2zm0 5h1v2H3v-2z"
            />
          </svg>
          <span
              v-if="jobBadge"
              class="oj-service-badge"
          >
            {{ jobBadge }}
          </span>
        </span>
        <span class="oj-service-label">작업</span>
      </button>

      <!-- 로그인 / 프로필 -->
      <button
          type="button"
          class="oj-service-btn oj-service-account"
          @click="emitAccount"
      >
        <span class="oj-service-icon-wrap">
          <svg
              class="oj-service-icon"
              viewBox="0 0 24 24"
              aria-hidden="true"
          >
            <path
                d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-4.41 0-8 2.01-8 4.5V20a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1.5C20 16.01 16.41 14 12 14z"
            />
          </svg>
        </span>
        <span class="oj-service-label">
          <template v-if="isAuthenticated">
            {{ userName || '내 계정' }}
          </template>
          <template v-else>
            로그인
          </template>
        </span>
      </button>
    </nav>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  /** 로그인 여부 */
  isAuthenticated?: boolean
  /** 로그인 상태일 때 표시할 이름 */
  userName?: string
  /** 대기/진행 중 작업 수 (뱃지용) */
  pendingJobs?: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'click-market'): void
  (e: 'click-settings'): void
  (e: 'click-jobs'): void
  (e: 'click-account'): void
}>()

const jobBadge = computed(() => {
  const n = props.pendingJobs ?? 0
  if (n <= 0) return ''
  if (n > 99) return '99+'
  return String(n)
})

const emitMarket = () => emit('click-market')
const emitSettings = () => emit('click-settings')
const emitJobs = () => emit('click-jobs')
const emitAccount = () => emit('click-account')
</script>

<style scoped>
.oj-service-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  height: 40px;
  background: #22252c; /* 단색 다크 톤 */
  color: #f5f5f5;
  border-bottom: 1px solid #17191f;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 13px;
  box-sizing: border-box;
}

.oj-service-left {
  display: flex;
  align-items: center;
  min-width: 0;
}

/* 🔸 텍스트 로고 OJ */
.oj-logo-text {
  margin-right: 6px;
  font-weight: 800;
  font-size: 13px; /* 서비스 타이틀과 비슷한 높이 */
  letter-spacing: 0.05em;
  color: #ff8a00;
}

.oj-service-title {
  font-weight: 600;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.oj-service-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

.oj-service-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  line-height: 1;
  white-space: nowrap;
  transition: background 0.15s ease, color 0.15s ease;
}

.oj-service-btn:hover {
  background: rgba(255, 255, 255, 0.06);
}

.oj-service-btn:active {
  background: rgba(255, 255, 255, 0.12);
}

.oj-service-account {
  margin-left: 4px;
  padding-inline: 10px;
  background: rgba(255, 255, 255, 0.04);
}

.oj-service-account:hover {
  background: rgba(255, 255, 255, 0.12);
}

.oj-service-icon-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.oj-service-icon {
  width: 15px;
  height: 15px;
  fill: currentColor; /* 단색 아이콘 */
}

.oj-service-label {
  font-size: 12px;
}

/* 작업 뱃지 */
.oj-service-icon-badge-wrap {
  position: relative;
}

.oj-service-badge {
  position: absolute;
  top: -4px;
  right: -6px;
  min-width: 14px;
  height: 14px;
  padding: 0 3px;
  border-radius: 999px;
  background: #f44d4d;
  color: #ffffff;
  font-size: 9px;
  line-height: 14px;
  text-align: center;
  box-shadow: 0 0 0 1px #22252c;
}

/* 좁은 폭 대응 */
@media (max-width: 960px) {
  .oj-service-label {
    display: none;
  }

  .oj-service-btn {
    padding-inline: 6px;
  }

  .oj-service-title {
    font-size: 12px;
  }
}
</style>
