<template>
  <div class="main-panel">
    <WorkflowCanvas />
  </div>
</template>

<script setup lang="ts">
import WorkflowCanvas from "~/components/workflow/WorkflowCanvas.vue";
</script>

<style scoped>
.main-panel {
  width: 100%;
  height: 100vh;
  display: flex;
}
</style>
