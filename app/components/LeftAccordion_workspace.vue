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
        @keydown.stop.prevent="onKeyDown"
        @click="onBackgroundClick"
        @contextmenu.prevent
    >
      <ul class="oj-ws-tree-root">
        <!-- 폴더 루프 -->
        <li
            v-for="folder in workspaceFolders"
            :key="folder.id"
            class="oj-ws-folder"
        >
          <!-- 폴더 행 -->
          <div
              class="oj-ws-folder-row"
              :class="{
                'is-selected': folder.id === selectedFolderId,
                'has-selected-file': folder.id === selectedFolderId && !!selectedFileId
              }"
              @click.stop="onFolderClick(folder)"
              @dblclick.stop="onFolderDblClick(folder)"
              @contextmenu.prevent.stop="onFolderContextMenu($event, folder)"
          >
            <button
                type="button"
                class="oj-ws-fold-toggle"
                @click.stop="toggleFolderOpen(folder)"
            >
              <span v-if="folder.isOpen">▾</span>
              <span v-else>▸</span>
            </button>
            <span class="oj-ws-folder-icon">📁</span>
            <span class="oj-ws-folder-name">
              {{ folder.name }}
            </span>

            <!-- 폴더 우측 + 버튼: 파일 추가 -->
            <button
                type="button"
                class="oj-ws-mini-btn"
                title="새 파일"
                @click.stop="addFile(folder)"
            >
              +
            </button>
          </div>

          <!-- 파일 리스트 -->
          <ul
              v-if="folder.isOpen && folder.files.length > 0"
              class="oj-ws-file-list"
          >
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
          <li
              v-if="contextMenuType === 'folder'"
              @click="onContextNewFile"
          >
            새 파일
          </li>
          <li @click="onContextRename">
            이름 변경
          </li>
          <li @click="onContextDelete">
            삭제
          </li>
        </ul>
      </div>

      <!-- 숨겨진 OWS 파일 선택 인풋 -->
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
          <p v-if="deleteTargetType === 'folder'">
            선택한 폴더를 삭제하시겠습니까?<br/>
            (폴더는 비어있을 때만 삭제할 수 있습니다.)
          </p>
          <p v-else-if="deleteTargetType === 'file'">
            선택한 파일을 삭제하시겠습니까?
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
import { ref, toRef, type Ref } from "vue"
import { useWorkflowStore } from "~/stores/workflow"
import type { WorkspaceFolder, WorkspaceFile } from "~/stores/workflow"

const workflowStore = useWorkflowStore()

type ContextType = "folder" | "file" | null

// 숨겨진 <input type="file" /> 에 붙일 ref (템플릿에서 ref="owsFileInput" 이어야 함)
const owsFileInput = ref<HTMLInputElement | null>(null)

// Pinia 상태와 연결된 워크스페이스 트리/선택 상태
const workspaceFolders = toRef(workflowStore, "workspaceFolders") as Ref<WorkspaceFolder[]>
const selectedFolderId = toRef(workflowStore, "selectedWorkspaceFolderId") as Ref<string | null>
const selectedFileId = toRef(workflowStore, "selectedWorkspaceFileId") as Ref<string | null>

/* ===== 컨텍스트 메뉴 상태 ===== */
const isContextMenuVisible = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const contextMenuType = ref<ContextType>(null)
const contextFolderId = ref<string | null>(null)
const contextFileId = ref<string | null>(null)

/* ===== 이름 변경 다이얼로그 상태 ===== */
const isRenameDialogVisible = ref(false)
const renameTargetType = ref<ContextType>(null)
const renameFolderId = ref<string | null>(null)
const renameFileId = ref<string | null>(null)
const renameName = ref("")

/* ===== 삭제 다이얼로그 상태 ===== */
const isDeleteDialogVisible = ref(false)
const deleteTargetType = ref<ContextType>(null)
const deleteFolderId = ref<string | null>(null)
const deleteFileId = ref<string | null>(null)

/* ===== 드래그 상태 ===== */
const dragFolderId = ref<string | null>(null)
const dragFileId = ref<string | null>(null)

/* =========================
 *  공통 유틸
 * =========================*/
const hideContextMenu = () => {
  isContextMenuVisible.value = false
}

/* =========================
 *  폴더 / 파일 생성
 * =========================*/
const addFolder = () => {
  const id = `folder-${Date.now()}`
  workspaceFolders.value.push({
    id,
    name: "새 폴더",
    isOpen: true,
    files: [],
  })

  selectedFolderId.value = id
  selectedFileId.value = null
}

const addFile = (folder: WorkspaceFolder) => {
  const id = `file-${Date.now()}`
  folder.files.push({
    id,
    name: "새 파일.ows",
  })

  selectedFolderId.value = folder.id
  selectedFileId.value = id
}

const addFileForFolder = (folder: WorkspaceFolder) => {
  addFile(folder)
}

/* =========================
 *  선택 / 클릭
 * =========================*/
const onFolderClick = (folder: WorkspaceFolder) => {
  hideContextMenu()
  selectedFolderId.value = folder.id
  selectedFileId.value = null
}

const onFolderDblClick = (folder: WorkspaceFolder) => {
  folder.isOpen = !folder.isOpen
}

const onFileClick = (folder: WorkspaceFolder, file: WorkspaceFile) => {
  hideContextMenu()
  selectedFolderId.value = folder.id
  selectedFileId.value = file.id
}

const onFileDblClick = (folder: WorkspaceFolder, file: WorkspaceFile) => {
  onFileClick(folder, file)
}

/* =========================
 *  폴더 열기/닫기
 * =========================*/
const toggleFolderOpen = (folder: WorkspaceFolder) => {
  folder.isOpen = !folder.isOpen
}

/* =========================
 *  드래그 & 드롭
 * =========================*/
const onFileDragStart = (folderId: string, fileId: string) => {
  dragFolderId.value = folderId
  dragFileId.value = fileId
}

const onFolderDrop = (targetFolderId: string) => {
  if (!dragFolderId.value || !dragFileId.value) return
  if (dragFolderId.value === targetFolderId) return

  const srcFolder = workspaceFolders.value.find((f: WorkspaceFolder) => f.id === dragFolderId.value)
  const dstFolder = workspaceFolders.value.find((f: WorkspaceFolder) => f.id === targetFolderId)
  if (!srcFolder || !dstFolder) return

  const fileIndex = srcFolder.files.findIndex((f: WorkspaceFile) => f.id === dragFileId.value)
  if (fileIndex === -1) return

  const [movedFile] = srcFolder.files.splice(fileIndex, 1)
  if (!movedFile) return

  dstFolder.files.push(movedFile)

  selectedFolderId.value = dstFolder.id
  selectedFileId.value = movedFile.id

  dragFolderId.value = null
  dragFileId.value = null
}

/* =========================
 *  컨텍스트 메뉴
 * =========================*/
const showContextMenu = (evt: MouseEvent, type: ContextType, folderId: string, fileId: string | null = null) => {
  evt.preventDefault()

  contextMenuX.value = evt.clientX
  contextMenuY.value = evt.clientY
  contextMenuType.value = type
  contextFolderId.value = folderId
  contextFileId.value = fileId

  isContextMenuVisible.value = true
}

const onFolderContextMenu = (evt: MouseEvent, folder: WorkspaceFolder) => {
  showContextMenu(evt, "folder", folder.id, null)
}

const onFileContextMenu = (evt: MouseEvent, folder: WorkspaceFolder, file: WorkspaceFile) => {
  showContextMenu(evt, "file", folder.id, file.id)
}

/* ===== 컨텍스트 메뉴 항목 동작 ===== */
const onContextNewFile = () => {
  if (!contextFolderId.value) return

  const folder = workspaceFolders.value.find((f: WorkspaceFolder) => f.id === contextFolderId.value)
  if (!folder) return

  addFile(folder)
  hideContextMenu()
}

const openRenameDialogFromContext = () => {
  if (!contextFolderId.value) return

  const folder = workspaceFolders.value.find((f: WorkspaceFolder) => f.id === contextFolderId.value)
  if (!folder) return

  renameFolderId.value = folder.id
  renameFileId.value = null
  renameTargetType.value = "folder"
  renameName.value = folder.name

  if (contextMenuType.value === "file" && contextFileId.value) {
    const file = folder.files.find((f: WorkspaceFile) => f.id === contextFileId.value)
    if (!file) return

    renameTargetType.value = "file"
    renameFolderId.value = folder.id
    renameFileId.value = file.id
    renameName.value = file.name
  }

  isRenameDialogVisible.value = true
  hideContextMenu()
}

const onContextRename = () => {
  openRenameDialogFromContext()
}

const openDeleteDialogFromContext = () => {
  if (!contextFolderId.value) return

  const folder = workspaceFolders.value.find((f: WorkspaceFolder) => f.id === contextFolderId.value)
  if (!folder) return

  deleteFolderId.value = folder.id
  deleteFileId.value = null
  deleteTargetType.value = "folder"

  if (contextMenuType.value === "file" && contextFileId.value) {
    deleteTargetType.value = "file"
    deleteFileId.value = contextFileId.value
  }

  isDeleteDialogVisible.value = true
  hideContextMenu()
}

const onContextDelete = () => {
  openDeleteDialogFromContext()
}

/* =========================
 *  이름 변경 다이얼로그
 * =========================*/
const closeRenameDialog = () => {
  isRenameDialogVisible.value = false
  renameTargetType.value = null
  renameFolderId.value = null
  renameFileId.value = null
  renameName.value = ""
}

const confirmRename = () => {
  if (!renameFolderId.value) {
    closeRenameDialog()
    return
  }

  const folder = workspaceFolders.value.find((f: WorkspaceFolder) => f.id === renameFolderId.value)
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
    const file = folder.files.find((f: WorkspaceFile) => f.id === renameFileId.value)
    if (file) {
      file.name = renameName.value.trim()
    }
  }

  closeRenameDialog()
}

/* =========================
 *  삭제 다이얼로그
 * =========================*/
const closeDeleteDialog = () => {
  isDeleteDialogVisible.value = false
  deleteTargetType.value = null
  deleteFolderId.value = null
  deleteFileId.value = null
}

const confirmDelete = () => {
  if (!deleteFolderId.value) {
    closeDeleteDialog()
    return
  }

  const folderIndex = workspaceFolders.value.findIndex((f: WorkspaceFolder) => f.id === deleteFolderId.value)
  if (folderIndex === -1) {
    closeDeleteDialog()
    return
  }

  const folder = workspaceFolders.value[folderIndex]!

  if (deleteTargetType.value === "folder") {
    if (folder.files.length > 0) {
      alert("폴더가 비어있지 않으면 삭제할 수 없습니다.")
      closeDeleteDialog()
      return
    }

    workspaceFolders.value.splice(folderIndex, 1)

    if (selectedFolderId.value === folder.id) {
      selectedFolderId.value = null
      selectedFileId.value = null
    }
  } else if (deleteTargetType.value === "file" && deleteFileId.value) {
    const fidx = folder.files.findIndex((f: WorkspaceFile) => f.id === deleteFileId.value)
    if (fidx !== -1) {
      folder.files.splice(fidx, 1)

      if (selectedFolderId.value === folder.id && selectedFileId.value === deleteFileId.value) {
        selectedFileId.value = null
      }
    }
  }

  closeDeleteDialog()
}

/* =========================
 *  키보드 처리
 * =========================*/
const onKeyDown = (evt: KeyboardEvent) => {
  if (evt.key === "Escape") {
    hideContextMenu()
    return
  }

  if (evt.key === "Delete") {
    if (selectedFileId.value || selectedFolderId.value) {
      contextFolderId.value = selectedFolderId.value
      contextFileId.value = selectedFileId.value
      contextMenuType.value = selectedFileId.value ? "file" : "folder"
      openDeleteDialogFromContext()
    }
    return
  }

  if (evt.key === "F2") {
    if (selectedFolderId.value || selectedFileId.value) {
      contextFolderId.value = selectedFolderId.value
      contextFileId.value = selectedFileId.value
      contextMenuType.value = selectedFileId.value ? "file" : "folder"
      openRenameDialogFromContext()
    }
    return
  }

  // Up / Down 이동 (아주 간단한 버전: 같은 폴더 내에서만 이동)
  if (evt.key === "ArrowUp" || evt.key === "ArrowDown") {
    const direction = evt.key === "ArrowUp" ? -1 : 1

    // 선택된 폴더 / 파일 기준으로 리스트에서 이동
    const flat: { folderId: string; fileId: string | null }[] = []

    workspaceFolders.value.forEach((f: WorkspaceFolder) => {
      flat.push({ folderId: f.id, fileId: null })
      if (f.isOpen) {
        f.files.forEach((file: WorkspaceFile) => {
          flat.push({ folderId: f.id, fileId: file.id })
        })
      }
    })

    if (flat.length === 0) return

    const currentIndex = flat.findIndex(
        (item) =>
            item.folderId === selectedFolderId.value &&
            item.fileId === (selectedFileId.value ?? null),
    )

    const nextIndex =
        currentIndex === -1
            ? 0
            : Math.min(flat.length - 1, Math.max(0, currentIndex + direction))

    const next = flat[nextIndex]
    if (!next) return           // ★ 이 줄 추가
    selectedFolderId.value = next.folderId
    selectedFileId.value = next.fileId
  }
}

/* =========================
 *  배경 클릭
 * =========================*/
const onBackgroundClick = () => {
  hideContextMenu()
}

/* =========================
 *  OWS 파일 임포트
 * =========================*/
/**
 * 상단 "OWS 파일 추가" 버튼 핸들러
 * - 클릭 시 숨겨진 <input type="file" /> 를 눌러준다.
 */
const onImportOwsClick = (event?: MouseEvent) => {
  if (!owsFileInput.value) return

  // 항상 새 파일을 선택할 수 있도록 value 초기화
  owsFileInput.value.value = ""

  // 파일 선택 다이얼로그 열기
  owsFileInput.value.click()
}

/**
 * 실제로 OWS 파일이 선택되었을 때
 */
const onOwsFileSelected = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  try {
    // 백엔드에 업로드 + WorkflowStore.nodes/edges 갱신
    await workflowStore.importFromOws(file)
  } catch (err) {
    console.error("OWS 임포트 실패:", err)
    alert("OWS 파일을 불러오는 중 오류가 발생했습니다.")
    input.value = ""
    return
  }

  // 임포트 성공 시: 폴더/파일 트리에도 파일 항목 추가
  // 1) 현재 선택된 폴더가 있으면 그 폴더에 추가
  // 2) 없으면 첫 번째 폴더에 추가
  // 3) 폴더가 하나도 없으면 새 폴더 생성 후 추가
  let folderId: string | null = selectedFolderId.value

  if (!folderId) {
    const firstFolder = workspaceFolders.value[0]
    if (firstFolder) {
      folderId = firstFolder.id
    }
  }

  if (!folderId) {
    // 폴더가 하나도 없으면 새로 만든다
    const id = `folder-${Date.now()}`
    workspaceFolders.value.push({
      id,
      name: "Imported",
      isOpen: true,
      files: [],
    })
    folderId = id
  }

  const folder = workspaceFolders.value.find((f: WorkspaceFolder) => f.id === folderId)
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
