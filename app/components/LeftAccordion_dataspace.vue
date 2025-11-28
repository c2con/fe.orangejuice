<template>
  <!-- 데이터 탭 모드 -->
  <div class="oj-data-root">
    <div class="oj-workspace-toolbar">
      <div class="oj-ws-toolbar-spacer"></div>

      <!-- 폴더 추가 -->
      <button
          type="button"
          class="oj-ws-icon-btn"
          @click="addDataFolder"
          title="폴더 추가"
      >
        <svg class="oj-ws-icon" viewBox="0 0 24 24" fill="none">
          <path
              d="M3 9a2 2 0 0 1 2-2h3.2c.4 0 .8.16 1.08.44L10.8 9H19a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
          />
          <path
              d="M16 11v4M14 13h4"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
          />
        </svg>
      </button>

      <!-- 파일 추가 -->
      <button
          type="button"
          class="oj-ws-icon-btn"
          :disabled="!selectedDataFolderId"
          @click="addDataFile"
          title="파일 추가"
      >
        <svg class="oj-ws-icon" viewBox="0 0 24 24" fill="none">
          <path
              d="M7 4h6l4 4v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
          />
          <path
              d="M13 4v4h4"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
          />
          <path
              d="M12 11v4M10 13h4"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
          />
        </svg>
      </button>

      <!-- DB 연결 추가 -->
      <button
          type="button"
          class="oj-ws-icon-btn"
          :disabled="!selectedDataFolderId"
          @click="addDbConnection"
          title="DB 연결 추가"
      >
        <svg class="oj-ws-icon" viewBox="0 0 24 24" fill="none">
          <ellipse
              cx="12"
              cy="6"
              rx="6.5"
              ry="3"
              stroke="currentColor"
              stroke-width="1.5"
          />
          <path
              d="M5.5 6v7.5c0 1.5 2.9 2.75 6.5 2.75s6.5-1.25 6.5-2.75V6"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
          />
          <ellipse
              cx="12"
              cy="13.5"
              rx="6.5"
              ry="3"
              stroke="currentColor"
              stroke-width="1.5"
          />
          <path
              d="M12 9.5v3M10.5 11h3"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
          />
        </svg>
      </button>
    </div>

    <div class="oj-workspace-scroll">
      <ul class="oj-workspace-tree">
        <li
            v-for="folder in dataFolders"
            :key="folder.id"
            class="oj-ws-folder"
            :class="{ selected: selectedDataFolderId === folder.id }"
            @click.stop="selectDataFolder(folder.id)"
        >
          <div class="oj-ws-folder-row">
            <button
                type="button"
                class="oj-ws-folder-toggle"
                @click.stop="folder.isOpen = !folder.isOpen"
            >
              {{ folder.isOpen ? '▾' : '▸' }}
            </button>

            <span class="oj-ws-folder-icon">📁</span>
            <span class="oj-ws-folder-name">{{ folder.name }}</span>
          </div>

          <ul v-if="folder.isOpen" class="oj-ws-file-list">
            <!-- 파일 -->
            <li
                v-for="file in folder.files"
                :key="file.id"
                class="oj-ws-file"
            >
              <span class="oj-ws-file-icon">📄</span>
              <span class="oj-ws-file-name">
                {{ file.name }}
                <small>({{ file.format }})</small>
              </span>
              <button
                  type="button"
                  class="oj-ws-add-file-btn"
                  @click.stop="renameDataFile(folder, file)"
              >
                이름
              </button>
              <button
                  type="button"
                  class="oj-ws-add-file-btn"
                  @click.stop="removeDataFile(folder, file)"
              >
                삭제
              </button>
            </li>

            <!-- DB 연결 -->
            <li
                v-for="conn in folder.connections"
                :key="conn.id"
                class="oj-ws-file"
            >
              <span class="oj-ws-file-icon">🗄️</span>
              <span class="oj-ws-file-name">
                {{ conn.name }}
                <small>({{ conn.engine }})</small>
                <small>[{{ conn.status }}]</small>
              </span>
              <button
                  type="button"
                  class="oj-ws-add-file-btn"
                  @click.stop="toggleDbConnection(conn)"
              >
                {{ conn.status === 'CONNECTED' ? '끊기' : '연결' }}
              </button>
              <button
                  type="button"
                  class="oj-ws-add-file-btn"
                  @click.stop="renameDbConnection(folder, conn)"
              >
                이름
              </button>
              <button
                  type="button"
                  class="oj-ws-add-file-btn"
                  @click.stop="removeDbConnection(folder, conn)"
              >
                삭제
              </button>
            </li>
          </ul>
        </li>
      </ul>

      <div v-if="dataFolders.length === 0" class="oj-data-empty">
        폴더를 추가해서 데이터 파일과 DB 연결을 관리하세요.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface DataFile {
  id: string
  name: string
  format: string
}

type DbStatus = 'CONNECTED' | 'DISCONNECTED'

interface DbConnection {
  id: string
  name: string
  engine: string
  status: DbStatus
}

interface DataFolder {
  id: string
  name: string
  isOpen: boolean
  files: DataFile[]
  connections: DbConnection[]
}

const dataFolders = ref<DataFolder[]>([])
const selectedDataFolderId = ref<string | null>(null)

const addDataFolder = () => {
  const id = `df-${Date.now()}`
  dataFolders.value.push({
    id,
    name: '새 데이터 폴더',
    isOpen: true,
    files: [],
    connections: []
  })
  selectedDataFolderId.value = id
}

const selectDataFolder = (folderId: string) => {
  selectedDataFolderId.value = folderId
}

const addDataFile = () => {
  if (!selectedDataFolderId.value) return
  const folder = dataFolders.value.find(f => f.id === selectedDataFolderId.value)
  if (!folder) return
  const id = `df-file-${Date.now()}`
  folder.files.push({
    id,
    name: 'data.csv',
    format: 'csv'
  })
}

const renameDataFile = (folder: DataFolder, file: DataFile) => {
  const next = window.prompt('파일 이름', file.name)
  if (next && next.trim()) file.name = next.trim()
}

const removeDataFile = (folder: DataFolder, file: DataFile) => {
  if (!window.confirm('이 파일을 삭제하시겠습니까?')) return
  const idx = folder.files.findIndex(f => f.id === file.id)
  if (idx !== -1) folder.files.splice(idx, 1)
}

const addDbConnection = () => {
  if (!selectedDataFolderId.value) return
  const folder = dataFolders.value.find(f => f.id === selectedDataFolderId.value)
  if (!folder) return
  const id = `conn-${Date.now()}`
  folder.connections.push({
    id,
    name: '새 연결',
    engine: 'PostgreSQL',
    status: 'DISCONNECTED'
  })
}

const toggleDbConnection = (conn: DbConnection) => {
  conn.status = conn.status === 'CONNECTED' ? 'DISCONNECTED' : 'CONNECTED'
}

const renameDbConnection = (folder: DataFolder, conn: DbConnection) => {
  const next = window.prompt('연결 이름', conn.name)
  if (next && next.trim()) conn.name = next.trim()
}

const removeDbConnection = (folder: DataFolder, conn: DbConnection) => {
  if (!window.confirm('이 연결을 삭제하시겠습니까?')) return
  const idx = folder.connections.findIndex(c => c.id === conn.id)
  if (idx !== -1) folder.connections.splice(idx, 1)
}
</script>
