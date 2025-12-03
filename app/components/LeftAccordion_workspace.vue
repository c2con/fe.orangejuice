<template>
  <!-- 워크스페이스 모드 -->
  <div class="oj-workspace-root">
    <!-- 상단: 폴더 추가만 -->
    <div class="oj-workspace-toolbar">
      <div class="oj-ws-toolbar-spacer"></div>
      <button type="button" class="oj-ws-btn" @click="addFolder">
        폴더 추가
      </button>
      <!-- OWS 파일 추가 버튼 (여기에 추가하면 됨) -->
      <button type="button" class="oj-ws-btn" @click="onImportOwsClick">
        OWS 파일 추가
      </button>
    </div>

    <!-- 트리 + 키 입력 포커스 영역 -->
    <div
        class="oj-workspace-scroll"
        tabindex="0"
        @keydown.delete.prevent="onDeleteKey"
        @click="hideContextMenu"
    >
      <!-- 폴더/파일 트리 -->
      <ul class="oj-ws-folder-list">
        <li
            v-for="folder in workspaceFolders"
            :key="folder.id"
            class="oj-ws-folder-item"
        >
          <!-- 폴더 행 -->
          <div
              class="oj-ws-folder-row"
              :class="{
              'is-selected': folder.id === selectedFolderId,
              'is-open': folder.isOpen
            }"
              @click.stop="selectFolder(folder.id)"
              @dblclick.stop="toggleFolderOpen(folder)"
              @contextmenu.prevent.stop="onFolderContextMenu($event, folder)"
              @dragover.prevent
              @drop.prevent="onFolderDrop(folder.id)"
          >
            <button
                type="button"
                class="oj-ws-folder-toggle"
                @click.stop="toggleFolderOpen(folder)"
            >
              {{ folder.isOpen ? "▾" : "▸" }}
            </button>
            <span class="oj-ws-folder-icon">📁</span>
            <span class="oj-ws-folder-name">
              {{ folder.name }}
            </span>
            <!-- 폴더 우측 파일 추가 버튼 -->
            <button
                type="button"
                class="oj-ws-file-add-btn"
                @click.stop="addFileForFolder(folder)"
            >
              +
            </button>
          </div>

          <!-- 파일 리스트 -->
          <ul v-if="folder.isOpen" class="oj-ws-file-list">
            <li
                v-for="file in folder.files"
                :key="file.id"
                class="oj-ws-file-item"
                :class="{ 'is-selected': file.id === selectedFileId }"
                draggable="true"
                @dragstart="onFileDragStart(folder.id, file.id)"
                @click.stop="selectFile(folder.id, file.id)"
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
          class="oj-ws-context"
          :style="{ top: contextMenuY + 'px', left: contextMenuX + 'px' }"
      >
        <!-- 폴더에서만 OWS 임포트 노출 -->
        <button
            v-if="contextMenuType === 'folder'"
            type="button"
            class="oj-ws-context-item"
            @click.stop="onImportOwsClick"
        >
          OWS 임포트…
        </button>
        <button
            type="button"
            class="oj-ws-context-item"
            @click.stop="openRenameDialogFromContext"
        >
          이름 변경
        </button>
        <button
            type="button"
            class="oj-ws-context-item"
            @click.stop="openDeleteDialogFromContext"
        >
          삭제
        </button>
      </div>

      <!-- 숨겨진 OWS 파일 입력 -->
      <input
          ref="owsFileInput"
          type="file"
          accept=".ows"
          class="oj-hidden-file"
          @change="onOwsFileSelected"
      />
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
          <p v-if="renameTargetType === 'folder'">폴더 이름을 입력하세요.</p>
          <p v-else-if="renameTargetType === 'file'">파일 이름을 입력하세요.</p>
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
          <p>
            {{
              deleteTargetType === "folder"
                  ? "비어있는 폴더만 삭제할 수 있습니다."
                  : "선택한 파일을 삭제하시겠습니까?"
            }}
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
import { ref, toRef } from "vue"
import { useWorkflowStore } from "~/stores/workflow"
import type { WorkspaceFolder, WorkspaceFile } from "~/stores/workflow"

const workflowStore = useWorkflowStore()

type ContextType = "folder" | "file" | null

// 숨겨진 <input type="file" /> 에 붙일 ref (템플릿에서 ref="owsFileInput" 이어야 함)
const owsFileInput = ref<HTMLInputElement | null>(null)

// Pinia 상태와 연결된 워크스페이스 트리/선택 상태
const workspaceFolders = toRef(workflowStore, "workspaceFolders")
const selectedFolderId = toRef(workflowStore, "selectedWorkspaceFolderId")
const selectedFileId = toRef(workflowStore, "selectedWorkspaceFileId")

// 최초 마운트 시 기본 폴더가 없다면 하나 생성
if (!workspaceFolders.value.length) {
  const defaultId = "folder-1"
  workspaceFolders.value.push({
    id: defaultId,
    name: "기본 워크스페이스",
    isOpen: true,
    files: [] as WorkspaceFile[],
  })
  selectedFolderId.value = defaultId
  selectedFileId.value = null
}

/* 드래그 상태 */
const dragFolderId = ref<string | null>(null)
const dragFileId = ref<string | null>(null)

/* 우클릭 컨텍스트 메뉴 상태 */
const isContextMenuVisible = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const contextMenuType = ref<ContextType>(null)
const contextFolderId = ref<string | null>(null)
const contextFileId = ref<string | null>(null)

/* 이름 변경 다이얼로그 상태 */
const isRenameDialogVisible = ref(false)
const renameTargetType = ref<ContextType>(null)
const renameFolderId = ref<string | null>(null)
const renameFileId = ref<string | null>(null)
const renameName = ref("")

/* 삭제 다이얼로그 상태 */
const isDeleteDialogVisible = ref(false)
const deleteTargetType = ref<ContextType>(null)
const deleteFolderId = ref<string | null>(null)
const deleteFileId = ref<string | null>(null)

/* ===== 유틸 ===== */
const hideContextMenu = () => {
  isContextMenuVisible.value = false
}

/* ===== 폴더 관련 ===== */
const addFolder = () => {
  const id = `folder-${Date.now()}`
  workspaceFolders.value.push({
    id,
    name: "새 폴더",
    isOpen: true,
    files: [] as WorkspaceFile[],
  })

  selectedFolderId.value = id
  selectedFileId.value = null
}

const selectFolder = (folderId: string) => {
  selectedFolderId.value = folderId
  selectedFileId.value = null
}

const toggleFolderOpen = (folder: WorkspaceFolder) => {
  folder.isOpen = !folder.isOpen
}

/* ===== 드래그 & 드롭 ===== */
const onFileDragStart = (folderId: string, fileId: string) => {
  dragFolderId.value = folderId
  dragFileId.value = fileId
}

const onFolderDrop = (targetFolderId: string) => {
  if (!dragFolderId.value || !dragFileId.value) return
  if (dragFolderId.value === targetFolderId) return

  const srcFolder = workspaceFolders.value.find(
      (f) => f.id === dragFolderId.value,
  )
  const dstFolder = workspaceFolders.value.find(
      (f) => f.id === targetFolderId,
  )
  if (!srcFolder || !dstFolder) return

  const fileIndex = srcFolder.files.findIndex((f) => f.id === dragFileId.value)
  if (fileIndex === -1) return

  const [movedFile] = srcFolder.files.splice(fileIndex, 1)
  if (!movedFile) return

  dstFolder.files.push(movedFile)

  selectedFolderId.value = dstFolder.id
  selectedFileId.value = movedFile.id

  dragFolderId.value = null
  dragFileId.value = null
}

/* ===== 파일 관련 ===== */
// 폴더 하나에 대해 파일 선택 다이얼로그 띄우는 함수
const addFileForFolder = (folder: WorkspaceFolder) => {
  // 숨겨진 <input type="file"> 클릭
  contextFolderId.value = folder.id
  if (owsFileInput.value) {
    // 같은 파일 다시 선택 가능하도록 초기화
    owsFileInput.value.value = ""
    owsFileInput.value.click()
  }
}

const selectFile = (folderId: string, fileId: string) => {
  selectedFolderId.value = folderId
  selectedFileId.value = fileId
}

/* ===== OWS 파일 선택 버튼 (템플릿에서 @click="onImportOwsClick(folder)" 등으로 사용) ===== */
/**
 * 상단 "파일 추가" / 공용 버튼에서 사용하는 핸들러
 * - 시그니처를 (event?: MouseEvent) 로 바꿔서
 *   @click="onImportOwsClick" 와 타입을 맞춘다.
 */
const onImportOwsClick = (event?: MouseEvent) => {
  // 1) 먼저 선택된 폴더 기준으로 찾음
  let folder: WorkspaceFolder | null =
      workspaceFolders.value.find(
          (f) => f.id === selectedFolderId.value,
      ) ?? null

  // 2) 선택된 폴더가 없으면 첫 번째 폴더 사용
  if (!folder) {
    const firstFolder = workspaceFolders.value[0]
    if (!firstFolder) {
      // 폴더가 하나도 없으면 아무것도 안 함
      return
    }
    folder = firstFolder
  }

  // 여기까지 오면 folder 는 WorkspaceFolder 확정
  addFileForFolder(folder)
}


/* ===== 우클릭 컨텍스트 메뉴 ===== */
const onFolderContextMenu = (e: MouseEvent, folder: WorkspaceFolder) => {
  isContextMenuVisible.value = true
  contextMenuX.value = e.clientX
  contextMenuY.value = e.clientY
  contextMenuType.value = "folder"
  contextFolderId.value = folder.id
  contextFileId.value = null

  selectedFolderId.value = folder.id
  selectedFileId.value = null
}

const onFileContextMenu = (
    e: MouseEvent,
    folder: WorkspaceFolder,
    file: WorkspaceFile,
) => {
  isContextMenuVisible.value = true
  contextMenuX.value = e.clientX
  contextMenuY.value = e.clientY
  contextMenuType.value = "file"
  contextFolderId.value = folder.id
  contextFileId.value = file.id

  selectedFolderId.value = folder.id
  selectedFileId.value = file.id
}

/* ===== 이름 변경 다이얼로그 ===== */
const openRenameDialogFromContext = () => {
  if (!contextMenuType.value || !contextFolderId.value) return

  const folder = workspaceFolders.value.find(
      (f) => f.id === contextFolderId.value,
  )
  if (!folder) return

  if (contextMenuType.value === "folder") {
    renameTargetType.value = "folder"
    renameFolderId.value = folder.id
    renameFileId.value = null
    renameName.value = folder.name
  } else if (contextMenuType.value === "file" && contextFileId.value) {
    const file = folder.files.find((f) => f.id === contextFileId.value)
    if (!file) return

    renameTargetType.value = "file"
    renameFolderId.value = folder.id
    renameFileId.value = file.id
    renameName.value = file.name
  }

  isRenameDialogVisible.value = true
  hideContextMenu()
}

const closeRenameDialog = () => {
  isRenameDialogVisible.value = false
  renameTargetType.value = null
  renameFolderId.value = null
  renameFileId.value = null
  renameName.value = ""
}

const confirmRename = () => {
  if (!renameTargetType.value || !renameFolderId.value) {
    closeRenameDialog()
    return
  }

  const folder = workspaceFolders.value.find(
      (f) => f.id === renameFolderId.value,
  )
  if (!folder) {
    closeRenameDialog()
    return
  }

  if (!renameName.value.trim()) {
    alert("이름을 입력하세요.")
    return
  }

  if (renameTargetType.value === "folder") {
    folder.name = renameName.value.trim()
  } else if (renameTargetType.value === "file" && renameFileId.value) {
    const file = folder.files.find((f) => f.id === renameFileId.value)
    if (file) {
      file.name = renameName.value.trim()
    }
  }

  closeRenameDialog()
}

const onContextRename = () => {
  openRenameDialogFromContext()
}

/* ===== 삭제 다이얼로그 ===== */
const openDeleteDialogFromContext = () => {
  if (!contextMenuType.value || !contextFolderId.value) return

  deleteTargetType.value = contextMenuType.value
  deleteFolderId.value = contextFolderId.value
  deleteFileId.value = contextFileId.value

  isDeleteDialogVisible.value = true
  hideContextMenu()
}

const closeDeleteDialog = () => {
  isDeleteDialogVisible.value = false
  deleteTargetType.value = null
  deleteFolderId.value = null
  deleteFileId.value = null
}

const confirmDelete = () => {
  if (!deleteTargetType.value || !deleteFolderId.value) {
    closeDeleteDialog()
    return
  }

  const idx = workspaceFolders.value.findIndex(
      (f) => f.id === deleteFolderId.value,
  )
  if (idx === -1) {
    closeDeleteDialog()
    return
  }

  const folder = workspaceFolders.value[idx]
  if (!folder) {
    closeDeleteDialog()
    return
  }

  if (deleteTargetType.value === "folder") {
    if (folder.files.length > 0) {
      alert("폴더가 비어있지 않으면 삭제할 수 없습니다.")
      closeDeleteDialog()
      return
    }

    workspaceFolders.value.splice(idx, 1)

    if (selectedFolderId.value === folder.id) {
      selectedFolderId.value = null
      selectedFileId.value = null
    }
  } else if (deleteTargetType.value === "file" && deleteFileId.value) {
    const fidx = folder.files.findIndex((f) => f.id === deleteFileId.value)
    if (fidx !== -1) {
      folder.files.splice(fidx, 1)

      if (selectedFileId.value === deleteFileId.value) {
        selectedFileId.value = null
      }
    }
  }

  closeDeleteDialog()
}

const onContextDelete = () => {
  openDeleteDialogFromContext()
}

/* Delete 키 처리 */
const onDeleteKey = () => {
  if (selectedFileId.value) {
    deleteTargetType.value = "file"
    deleteFolderId.value = selectedFolderId.value
    deleteFileId.value = selectedFileId.value
    openDeleteDialogFromContext()
  } else if (selectedFolderId.value) {
    deleteTargetType.value = "folder"
    deleteFolderId.value = selectedFolderId.value
    deleteFileId.value = null
    openDeleteDialogFromContext()
  }
}

/* 컨텍스트 메뉴에서 파일 추가 */
const onContextAddFile = () => {
  const folder = workspaceFolders.value.find(
      (f) => f.id === contextFolderId.value,
  )
  if (!folder) return

  addFileForFolder(folder)
}

/* OWS 파일 선택 (숨겨진 input[type="file"] 과 연동) */
const onOwsFileSelected = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  try {
    await workflowStore.importFromOws(file)
  } catch (err) {
    console.error("OWS 임포트 실패:", err)
    alert("OWS 파일을 불러오는 중 오류가 발생했습니다.")
    input.value = ""
    return
  }

  const folderId = contextFolderId.value ?? selectedFolderId.value
  if (!folderId) {
    input.value = ""
    return
  }

  const folder = workspaceFolders.value.find((f) => f.id === folderId)
  if (!folder) {
    input.value = ""
    return
  }

  const id = `file-${Date.now()}`
  folder.files.push({
    id,
    name: file.name,
  })

  selectedFolderId.value = folder.id
  selectedFileId.value = id
  input.value = ""
}
</script>
