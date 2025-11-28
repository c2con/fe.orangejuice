<template>
  <div class="app-root">

    <!-- ✅ 새로 추가된 최상단 서비스 메뉴바 -->
    <ServiceMenuBar
        :is-authenticated="false"
        :pending-jobs="0"
        @click-market="() => console.log('마켓')"
        @click-settings="() => console.log('설정')"
        @click-jobs="() => console.log('작업')"
        @click-account="() => console.log('계정')"
    />

    <!-- 기존 상단 메뉴바 -->
    <TopMenuBar />

    <div class="app-body">
      <!-- 왼쪽 아코디언 패널 -->
      <LeftAccordion class="left-panel" />

      <!-- 메인 영역 -->
      <UContainer class="main-panel">
        <slot />
      </UContainer>
    </div>
  </div>
</template>

<script setup lang="ts">
import ServiceMenuBar from '~/components/ServiceMenuBar.vue'
import TopMenuBar from '~/components/TopMenuBar.vue'
import LeftAccordion from '~/components/LeftAccordion.vue'
</script>

<style scoped>
.app-root {
  display: flex;
  flex-direction: column;
  height: 100vh;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.app-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* 왼쪽 패널 */
.left-panel {
  width: 260px;
  border-right: 1px solid #ddd;
  background: #fafafa;
  overflow-y: auto;
}

/* 메인 콘텐츠 */
.main-panel {
  flex: 1;
  padding-top: 12px;
  padding-bottom: 12px;
  overflow: auto;
}
</style>
