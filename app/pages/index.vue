<template>
  <div class="main-panel">
    <ClientOnly>
      <WorkflowCanvas />

      <template #fallback>
        <div class="loading">Loading Workflow...</div>
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
// 경로가 맞는지 확인 (app/components/workflow/WorkflowCanvas.vue)
import WorkflowCanvas from "~/components/workflow/WorkflowCanvas.vue";
</script>

<style scoped>
.main-panel {
  width: 100%;
  height: 100vh;
  display: flex;
  background-color: #f8fafc; /* 배경색 추가 (선택) */
}

.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  font-size: 1.2rem;
  color: #666;
}
</style>