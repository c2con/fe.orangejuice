<template>
  <div class="workspace-tree" @click="closeContextMenu">
    <ul>
      <li
          v-for="folder in folders"
          :key="folder.id"
          class="folder-item"
          @contextmenu.prevent="openContextMenu($event, folder)"
      >
        📁 {{ folder.name }}
      </li>
    </ul>

    <!-- 컨텍스트 메뉴 -->
    <div
        v-if="contextMenu.visible"
        class="context-menu"
        :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }"
    >
      <button type="button" @click.stop="onImportOwsClick">
        OWS 임포트
      </button>
      <!-- 나중에 이름변경, 삭제 등도 여기 추가 -->
    </div>

    <!-- 숨겨진 파일 선택 인풋 -->
    <input
        ref="owsFileInput"
        type="file"
        accept=".ows"
        class="hidden-input"
        @change="onOwsFileSelected"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from '#imports'
import { useWorkflowStore } from '~/stores/workflow'

interface Folder {
  id: string
  name: string
  // ... 필요하면 추가 필드
}

const props = defineProps<{
  folders: Folder[]
}>()

const router = useRouter()
const workflowStore = useWorkflowStore()

const contextMenu = ref<{
  visible: boolean
  x: number
  y: number
  folder: Folder | null
}>({
  visible: false,
  x: 0,
  y: 0,
  folder: null
})

const owsFileInput = ref<HTMLInputElement | null>(null)

function openContextMenu(e: MouseEvent, folder: Folder) {
  contextMenu.value = {
    visible: true,
    x: e.clientX,
    y: e.clientY,
    folder
  }
}

function closeContextMenu() {
  contextMenu.value.visible = false
}

function onImportOwsClick() {
  // 파일 선택창 열기
  if (owsFileInput.value) {
    owsFileInput.value.value = '' // 이전 선택 초기화
    owsFileInput.value.click()
  }
  // 메뉴 닫기
  contextMenu.value.visible = false
}

async function onOwsFileSelected(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files || input.files.length === 0) return

  const file = input.files[0]
  if (!file.name.toLowerCase().endsWith('.ows')) {
    alert('OWS 파일만 선택할 수 있습니다.')
    return
  }

  const folder = contextMenu.value.folder
  if (!folder) {
    alert('폴더 정보가 사라졌습니다. 다시 시도해주세요.')
    return
  }

  try {
    const formData = new FormData()
    formData.append('file', file)

    // TODO: 여기서 folder.id를 함께 보내서
    // 백엔드가 워크스페이스에 OWS 파일 저장하도록 확장할 수 있음.
    // formData.append('folderId', folder.id)

    const workflow = await $fetch('/api/workflow/import-ows', {
      method: 'POST',
      body: formData
      // Content-Type 은 FormData 쓰면 자동 설정됨
    })

    // 1) 스토어에 현재 워크플로우 저장
    workflowStore.setCurrent(workflow as any)

    // 2) 캔버스 페이지로 이동
    //   - /workspace/canvas 같은 경로로 정해두고, 거기서 store값을 읽어 그림
    await router.push('/workspace/canvas')
  } catch (err) {
    console.error(err)
    alert('OWS 임포트 중 오류가 발생했습니다.')
  } finally {
    // 선택 상태 초기화
    input.value = ''
  }
}
</script>

<style scoped>
.workspace-tree {
  position: relative;
}

/* 아주 단순한 우클릭 메뉴 스타일 */
.context-menu {
  position: fixed;
  z-index: 2000;
  padding: 4px 0;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.context-menu button {
  display: block;
  width: 160px;
  padding: 6px 12px;
  text-align: left;
  font-size: 13px;
  border: none;
  background: transparent;
  cursor: pointer;
}

.context-menu button:hover {
  background: #f5f5f5;
}

.hidden-input {
  display: none;
}
</style>
