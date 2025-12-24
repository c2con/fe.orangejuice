<template>
  <div class="oj-workspace-root">
    <!-- 상단 버튼: 폴더 추가 / 새 문서 -->
    <div class="oj-workspace-toolbar">
      <button type="button" class="oj-ws-btn" @click="addFolder">
        폴더 추가
      </button>
      <button type="button" class="oj-ws-btn" @click="addNewDocument">
        새 문서
      </button>
      <div class="oj-ws-toolbar-spacer"></div>
    </div>

    <!-- 트리(스크롤/키보드 포커스) -->
    <div
        class="oj-workspace-scroll"
        tabindex="0"
        @keydown.stop.prevent="onKeyDown"
        @click="onBackgroundClick"
        @contextmenu.prevent
        @scroll="hideContextMenu"
    >
      <ul class="oj-ws-tree-root">
        <li
            v-for="folder in workspaceFolders"
            :key="folder.id"
            class="oj-ws-folder"
        >
          <!-- 폴더 행 -->
          <div
              class="oj-ws-folder-row"
              :class="{ 'is-selected': folder.id === selectedFolderId && !selectedFileId }"
              @click.stop="onFolderClick(folder)"
              @dblclick.stop="onFolderDblClick(folder)"
              @contextmenu.prevent.stop="onFolderContextMenu($event, folder)"
          >
            <button
                type="button"
                class="oj-ws-fold-toggle"
                @click.stop="toggleFolderOpen(folder)"
                aria-label="toggle folder"
            >
              <span v-if="folder.isOpen">▾</span>
              <span v-else>▸</span>
            </button>
            <span class="oj-ws-folder-icon">📁</span>
            <span class="oj-ws-folder-name">{{ folder.name }}</span>
          </div>

          <!-- 파일 리스트 -->
          <ul v-if="folder.isOpen && folder.files.length" class="oj-ws-file-list">
            <li
                v-for="file in folder.files"
                :key="file.id"
                class="oj-ws-file-row"
                :class="{ 'is-selected': file.id === selectedFileId }"
                draggable="true"
                @dragstart="onFileDragStart(folder.id, file.id)"
                @dragover.prevent
                @drop.prevent="onFolderDrop(folder.id)"
                @click.stop="onFileClick(folder, file)"
                @dblclick.stop="onFileDblClick(folder, file)"
                @contextmenu.prevent.stop="onFileContextMenu($event, folder, file)"
            >
              <span class="oj-ws-file-icon">📄</span>
              <span class="oj-ws-file-name">{{ file.name }}</span>
            </li>
          </ul>
        </li>
      </ul>

      <!-- 컨텍스트 메뉴 -->
      <div
          v-if="isContextMenuVisible"
          class="oj-ws-context-menu"
          :style="{ top: contextMenuY + 'px', left: contextMenuX + 'px' }"
          @click.stop
      >
        <ul>
          <!-- 폴더 메뉴 -->
          <template v-if="contextMenuType === 'folder'">
            <li @click="onContextNewDocument">새 문서</li>
            <li @click="onContextRename">이름 변경</li>
            <li @click="onContextDelete">삭제</li>
          </template>

          <!-- 문서 메뉴 -->
          <template v-else-if="contextMenuType === 'file'">
            <li @click="onContextImportOws">OWS 임포트</li>
            <li @click="onContextRename">이름 변경</li>
            <li @click="onContextDelete">삭제</li>
          </template>
        </ul>
      </div>
    </div>

    <!-- 이름 변경 팝업 -->
    <div
        v-if="isRenameDialogVisible"
        class="oj-dialog-backdrop"
        @click.self="closeRenameDialog"
    >
      <div class="oj-dialog">
        <div class="oj-dialog-title">이름 변경</div>
        <div class="oj-dialog-body">
          <input
              v-model="renameName"
              type="text"
              class="oj-dialog-input"
              @keyup.enter="confirmRename"
          />
        </div>
        <div class="oj-dialog-actions">
          <button type="button" class="oj-dialog-btn" @click="closeRenameDialog">
            취소
          </button>
          <button type="button" class="oj-dialog-btn primary" @click="confirmRename">
            확인
          </button>
        </div>
      </div>
    </div>

    <!-- 삭제 확인 팝업 -->
    <div
        v-if="isDeleteDialogVisible"
        class="oj-dialog-backdrop"
        @click.self="closeDeleteDialog"
    >
      <div class="oj-dialog">
        <div class="oj-dialog-title">삭제 확인</div>
        <div class="oj-dialog-body">
          <p v-if="deleteTargetType === 'folder'">
            선택한 폴더를 삭제하시겠습니까?<br />
            (폴더는 비어있을 때만 삭제할 수 있습니다.)
          </p>
          <p v-else>
            선택한 문서를 삭제하시겠습니까?
          </p>
        </div>
        <div class="oj-dialog-actions">
          <button type="button" class="oj-dialog-btn" @click="closeDeleteDialog">
            취소
          </button>
          <button type="button" class="oj-dialog-btn danger" @click="confirmDelete">
            삭제
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, toRef, type Ref } from 'vue'
import { useWorkflowStore } from '~/stores/workflow'
import type { WorkspaceFolder, WorkspaceFile } from '~/stores/workflow'

const workflowStore = useWorkflowStore()

type ContextType = 'folder' | 'file' | null

const workspaceFolders = toRef(workflowStore, 'workspaceFolders') as Ref<WorkspaceFolder[]>
const selectedFolderId = toRef(workflowStore, 'selectedWorkspaceFolderId') as Ref<string | null>
const selectedFileId = toRef(workflowStore, 'selectedWorkspaceFileId') as Ref<string | null>

onMounted(() => {
  workflowStore.ensureDefaultWorkspace()
})

/* ===== 컨텍스트 메뉴 상태 ===== */
const isContextMenuVisible = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const contextMenuType = ref<ContextType>(null)
const contextFolderId = ref<string | null>(null)
const contextFileId = ref<string | null>(null)

const hideContextMenu = () => {
  isContextMenuVisible.value = false
}

/* ===== 이름 변경 ===== */
const isRenameDialogVisible = ref(false)
const renameTargetType = ref<ContextType>(null)
const renameFolderId = ref<string | null>(null)
const renameFileId = ref<string | null>(null)
const renameName = ref('')

/* ===== 삭제 ===== */
const isDeleteDialogVisible = ref(false)
const deleteTargetType = ref<ContextType>(null)
const deleteFolderId = ref<string | null>(null)
const deleteFileId = ref<string | null>(null)

/* ===== 드래그 ===== */
const dragFolderId = ref<string | null>(null)
const dragFileId = ref<string | null>(null)

/* =========================
 * 상단 버튼
 * ========================= */
const addFolder = () => {
  workflowStore.addWorkspaceFolder('새 폴더')
}

const addNewDocument = () => {
  workflowStore.ensureDefaultWorkspace()

  const folderId =
      selectedFolderId.value ??
      workspaceFolders.value?.[0]?.id ??
      null

  if (!folderId) return
  workflowStore.addWorkspaceFile(folderId, '새 문서')
}

/* =========================
 * 선택 / 클릭
 * ========================= */
const onFolderClick = (folder: WorkspaceFolder) => {
  hideContextMenu()
  workflowStore.selectWorkspaceFolder(folder.id)
}

const onFolderDblClick = (folder: WorkspaceFolder) => {
  folder.isOpen = !folder.isOpen
}

const onFileClick = (folder: WorkspaceFolder, file: WorkspaceFile) => {
  hideContextMenu()
  workflowStore.selectWorkspaceFile(folder.id, file.id)
}

const onFileDblClick = (folder: WorkspaceFolder, file: WorkspaceFile) => {
  onFileClick(folder, file)
}

const toggleFolderOpen = (folder: WorkspaceFolder) => {
  folder.isOpen = !folder.isOpen
}

/* =========================
 * 드래그 & 드롭
 * (폴더 간 이동)
 * ========================= */
const onFileDragStart = (folderId: string, fileId: string) => {
  dragFolderId.value = folderId
  dragFileId.value = fileId
}

const onFolderDrop = (targetFolderId: string) => {
  if (!dragFolderId.value || !dragFileId.value) return
  if (dragFolderId.value === targetFolderId) return

  const srcFolder = workspaceFolders.value.find((f) => f.id === dragFolderId.value)
  const dstFolder = workspaceFolders.value.find((f) => f.id === targetFolderId)
  if (!srcFolder || !dstFolder) return

  const idx = srcFolder.files.findIndex((f) => f.id === dragFileId.value)
  if (idx === -1) return

  const [moved] = srcFolder.files.splice(idx, 1)
  if (!moved) return

  dstFolder.files.push(moved)
  workflowStore.selectWorkspaceFile(dstFolder.id, moved.id)

  dragFolderId.value = null
  dragFileId.value = null
}

/* =========================
 * 컨텍스트 메뉴
 * ========================= */
const showContextMenu = (
    evt: MouseEvent,
    type: ContextType,
    folderId: string,
    fileId: string | null = null,
) => {
  evt.preventDefault()

  // position: fixed 기준 → clientX/Y 사용
  contextMenuX.value = evt.clientX
  contextMenuY.value = evt.clientY
  contextMenuType.value = type
  contextFolderId.value = folderId
  contextFileId.value = fileId

  isContextMenuVisible.value = true
}

const onFolderContextMenu = (evt: MouseEvent, folder: WorkspaceFolder) => {
  // 우클릭 시 폴더 선택도 같이
  workflowStore.selectWorkspaceFolder(folder.id)
  showContextMenu(evt, 'folder', folder.id, null)
}

const onFileContextMenu = (evt: MouseEvent, folder: WorkspaceFolder, file: WorkspaceFile) => {
  // ✅ 우클릭 대상 문서를 먼저 선택 (임포트 대상 확정)
  workflowStore.selectWorkspaceFile(folder.id, file.id)
  showContextMenu(evt, 'file', folder.id, file.id)
}

const onContextNewDocument = () => {
  hideContextMenu()
  const folderId =
      contextFolderId.value ??
      selectedFolderId.value ??
      workspaceFolders.value?.[0]?.id ??
      null
  if (!folderId) return
  workflowStore.addWorkspaceFile(folderId, '새 문서')
}

const openRenameDialogFromContext = () => {
  const folderId = contextFolderId.value
  if (!folderId) return

  const folder = workspaceFolders.value.find((f) => f.id === folderId)
  if (!folder) return

  renameFolderId.value = folder.id
  renameFileId.value = null
  renameTargetType.value = 'folder'
  renameName.value = folder.name

  if (contextMenuType.value === 'file' && contextFileId.value) {
    const file = folder.files.find((f) => f.id === contextFileId.value)
    if (!file) return
    renameTargetType.value = 'file'
    renameFileId.value = file.id
    renameName.value = file.name
  }

  isRenameDialogVisible.value = true
  hideContextMenu()
}

const onContextRename = () => openRenameDialogFromContext()

const openDeleteDialogFromContext = () => {
  const folderId = contextFolderId.value
  if (!folderId) return

  deleteFolderId.value = folderId
  deleteFileId.value = contextMenuType.value === 'file' ? (contextFileId.value ?? null) : null
  deleteTargetType.value = contextMenuType.value

  isDeleteDialogVisible.value = true
  hideContextMenu()
}

const onContextDelete = () => openDeleteDialogFromContext()

/* =========================
 * OWS 임포트 (문서 컨텍스트)
 * - owsFileInput 제거: 동적 file picker 사용
 * ========================= */
const pickOwsFile = (): Promise<File | null> =>
    new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.ows'
      input.style.position = 'fixed'
      input.style.left = '-9999px'
      input.style.top = '-9999px'

      input.addEventListener('change', () => {
        const file = input.files?.[0] ?? null
        input.remove()
        resolve(file)
      })

      document.body.appendChild(input)
      input.click()
    })

const onContextImportOws = async () => {
  hideContextMenu()

  // 현재 선택 문서가 있어야 함
  if (!selectedFileId.value) return

  const file = await pickOwsFile()
  if (!file) return

  try {
    // ✅ 임포트 결과는 “현재 선택 문서”에만 반영 (스토어가 그렇게 구현되어 있어야 함)
    await workflowStore.importFromOws(file)
  } catch (err) {
    console.error(err)
    alert('OWS 임포트 실패')
  }
}

/* =========================
 * 다이얼로그: 이름 변경
 * ========================= */
const closeRenameDialog = () => {
  isRenameDialogVisible.value = false
  renameTargetType.value = null
  renameFolderId.value = null
  renameFileId.value = null
  renameName.value = ''
}

const confirmRename = () => {
  const folderId = renameFolderId.value
  if (!folderId) return closeRenameDialog()

  const name = renameName.value.trim()
  if (!name) return

  if (renameTargetType.value === 'folder') {
    workflowStore.renameWorkspaceFolder(folderId, name)
  } else if (renameTargetType.value === 'file' && renameFileId.value) {
    workflowStore.renameWorkspaceFile(folderId, renameFileId.value, name)
  }

  closeRenameDialog()
}

/* =========================
 * 다이얼로그: 삭제
 * ========================= */
const closeDeleteDialog = () => {
  isDeleteDialogVisible.value = false
  deleteTargetType.value = null
  deleteFolderId.value = null
  deleteFileId.value = null
}

const confirmDelete = () => {
  const folderId = deleteFolderId.value
  if (!folderId) return closeDeleteDialog()

  if (deleteTargetType.value === 'folder') {
    // 폴더는 비어있을 때만 삭제 (스토어 로직 기준)
    workflowStore.deleteWorkspaceFolder(folderId)
  } else if (deleteTargetType.value === 'file' && deleteFileId.value) {
    workflowStore.deleteWorkspaceFile(folderId, deleteFileId.value)
  }

  closeDeleteDialog()
}

/* =========================
 * 키보드
 * ========================= */
const onKeyDown = (evt: KeyboardEvent) => {
  if (evt.key === 'Escape') {
    hideContextMenu()
    return
  }

  // Delete → 삭제 다이얼로그
  if (evt.key === 'Delete') {
    if (!selectedFolderId.value && !selectedFileId.value) return
    contextFolderId.value = selectedFolderId.value
    contextFileId.value = selectedFileId.value
    contextMenuType.value = selectedFileId.value ? 'file' : 'folder'
    openDeleteDialogFromContext()
    return
  }

  // F2 → 이름 변경 다이얼로그
  if (evt.key === 'F2') {
    if (!selectedFolderId.value && !selectedFileId.value) return
    contextFolderId.value = selectedFolderId.value
    contextFileId.value = selectedFileId.value
    contextMenuType.value = selectedFileId.value ? 'file' : 'folder'
    openRenameDialogFromContext()
    return
  }
}

const onBackgroundClick = () => {
  hideContextMenu()
}
</script>
