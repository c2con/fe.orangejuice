// app/components/LeftAccordion.ts
import {
    ref,
    reactive,
    computed,
    onBeforeUnmount,
    type Ref,
} from 'vue'

/* ================================
 * 타입 정의
 * ============================== */
export type ViewMode = 'workspace' | 'widgets' | 'data'

export interface WorkspaceFile {
    id: string
    name: string
}

export interface WorkspaceFolder {
    id: string
    name: string
    isOpen: boolean
    files: WorkspaceFile[]
}

export type ContextType = 'folder' | 'file' | null

export interface ContextMenuState {
    visible: boolean
    x: number
    y: number
    type: ContextType
    folderId: string | null
    fileId: string | null
}

export interface RenameDialogState {
    visible: boolean
    type: ContextType
    folderId: string | null
    fileId: string | null
    name: string
}

export interface DeleteDialogState {
    visible: boolean
    type: ContextType
    folderId: string | null
    fileId: string | null
}

export interface WidgetItem {
    id: string
    label: string
    icon?: string
    description?: string
}

export interface WidgetCategory {
    id: string
    label: string
    icon?: string
    widgets: WidgetItem[]
}

export interface HoverWidgetState {
    categoryId: string
    widget: WidgetItem
}

export interface DataFile {
    id: string
    name: string
    format: string
}

export type DbStatus = 'CONNECTED' | 'DISCONNECTED'

export interface DbConnection {
    id: string
    name: string
    engine: string
    status: DbStatus
}

export interface DataFolder {
    id: string
    name: string
    isOpen: boolean
    files: DataFile[]
    connections: DbConnection[]
}

interface DragState {
    folderId: string | null
    fileId: string | null
}

/* ================================
 * 메인 훅
 * ============================== */
export function useLeftAccordion() {
    /* ---------- 공통: 패널 너비 & 리사이저 ---------- */
    const panelWidth = ref(260)
    const minWidth = 200
    const maxWidth = 420

    let resizeStartX = 0
    let resizeStartWidth = 0
    let resizing = false

    const onResizeStart = (e: MouseEvent) => {
        resizing = true
        resizeStartX = e.clientX
        resizeStartWidth = panelWidth.value
        window.addEventListener('mousemove', onMouseMove)
        window.addEventListener('mouseup', onResizeEnd)
    }

    const onMouseMove = (e: MouseEvent) => {
        if (!resizing) return
        const delta = e.clientX - resizeStartX
        let next = resizeStartWidth + delta
        if (next < minWidth) next = minWidth
        if (next > maxWidth) next = maxWidth
        panelWidth.value = next
    }

    const onResizeEnd = () => {
        if (!resizing) return
        resizing = false
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onResizeEnd)
    }

    onBeforeUnmount(onResizeEnd)

    /* ---------- 1) 뷰 모드 ---------- */
    const viewMode = ref<ViewMode>('workspace')

    /* ---------- 2) 워크스페이스 탭 ---------- */
    const workspaceFolders = ref<WorkspaceFolder[]>([
        {
            id: 'folder-1',
            name: '기본 워크스페이스',
            isOpen: true,
            files: [
                { id: 'file-1', name: '분석1.ows' },
                { id: 'file-2', name: '테스트플로우.ows' },
            ],
        },
    ])

    const selectedFolderId = ref<string | null>('folder-1')
    const selectedFileId = ref<string | null>(null)

    const dragState = reactive<DragState>({
        folderId: null,
        fileId: null,
    })

    const addFolder = () => {
        const id = `folder-${Date.now()}`
        workspaceFolders.value.push({
            id,
            name: '새 폴더',
            isOpen: true,
            files: [],
        })
        selectedFolderId.value = id
        selectedFileId.value = null
    }

    const addFileForFolder = (folder: WorkspaceFolder) => {
        const id = `file-${Date.now()}`
        folder.files.push({
            id,
            name: '새 워크플로우.ows',
        })
        selectedFolderId.value = folder.id
        selectedFileId.value = id
    }

    const selectFolder = (folderId: string) => {
        selectedFolderId.value = folderId
        selectedFileId.value = null
    }

    const selectFile = (folderId: string, fileId: string) => {
        selectedFolderId.value = folderId
        selectedFileId.value = fileId
    }

    const toggleFolderOpen = (folder: WorkspaceFolder) => {
        folder.isOpen = !folder.isOpen
    }

    const onFileDragStart = (folderId: string, fileId: string) => {
        dragState.folderId = folderId
        dragState.fileId = fileId
    }

    const onFolderDrop = (targetFolderId: string) => {
        if (!dragState.folderId || !dragState.fileId) return
        if (dragState.folderId === targetFolderId) return

        const srcFolder = workspaceFolders.value.find(
            f => f.id === dragState.folderId,
        )
        const dstFolder = workspaceFolders.value.find(
            f => f.id === targetFolderId,
        )

        if (!srcFolder || !dstFolder) return

        const idx = srcFolder.files.findIndex(f => f.id === dragState.fileId)
        if (idx === -1) return

        const removed = srcFolder.files.splice(idx, 1)
        const file = removed[0]
        if (!file) return   // 여기서 undefined 가드

        dstFolder.files.push(file)


        dragState.folderId = null
        dragState.fileId = null
    }

    /* ----- 컨텍스트 메뉴 ----- */
    const contextMenu = reactive<ContextMenuState>({
        visible: false,
        x: 0,
        y: 0,
        type: null,
        folderId: null,
        fileId: null,
    })

    const hideContextMenu = () => {
        contextMenu.visible = false
        contextMenu.type = null
        contextMenu.folderId = null
        contextMenu.fileId = null
    }

    const onFolderContextMenu = (e: MouseEvent, folder: WorkspaceFolder) => {
        contextMenu.visible = true
        contextMenu.x = e.clientX
        contextMenu.y = e.clientY
        contextMenu.type = 'folder'
        contextMenu.folderId = folder.id
        contextMenu.fileId = null

        selectedFolderId.value = folder.id
        selectedFileId.value = null
    }

    const onFileContextMenu = (
        e: MouseEvent,
        folder: WorkspaceFolder,
        file: WorkspaceFile,
    ) => {
        contextMenu.visible = true
        contextMenu.x = e.clientX
        contextMenu.y = e.clientY
        contextMenu.type = 'file'
        contextMenu.folderId = folder.id
        contextMenu.fileId = file.id

        selectedFolderId.value = folder.id
        selectedFileId.value = file.id
    }

    /* ----- 이름 변경 / 삭제 다이얼로그 ----- */
    const renameDialog = reactive<RenameDialogState>({
        visible: false,
        type: null,
        folderId: null,
        fileId: null,
        name: '',
    })

    const deleteDialog = reactive<DeleteDialogState>({
        visible: false,
        type: null,
        folderId: null,
        fileId: null,
    })

    const openRenameDialogFromContext = () => {
        if (!contextMenu.type || !contextMenu.folderId) return

        const folder = workspaceFolders.value.find(
            f => f.id === contextMenu.folderId,
        )
        if (!folder) return

        if (contextMenu.type === 'folder') {
            renameDialog.type = 'folder'
            renameDialog.folderId = folder.id
            renameDialog.fileId = null
            renameDialog.name = folder.name
        } else {
            if (!contextMenu.fileId) return
            const file = folder.files.find(f => f.id === contextMenu.fileId)
            if (!file) return
            renameDialog.type = 'file'
            renameDialog.folderId = folder.id
            renameDialog.fileId = file.id
            renameDialog.name = file.name
        }

        renameDialog.visible = true
        hideContextMenu()
    }

    const closeRenameDialog = () => {
        renameDialog.visible = false
    }

    const confirmRename = () => {
        if (!renameDialog.type || !renameDialog.folderId) {
            closeRenameDialog()
            return
        }

        const folder = workspaceFolders.value.find(
            f => f.id === renameDialog.folderId,
        )
        if (!folder) {
            closeRenameDialog()
            return
        }

        if (renameDialog.type === 'folder') {
            folder.name = renameDialog.name || folder.name
        } else if (renameDialog.type === 'file' && renameDialog.fileId) {
            const file = folder.files.find(f => f.id === renameDialog.fileId)
            if (file) file.name = renameDialog.name || file.name
        }

        closeRenameDialog()
    }

    const openDeleteDialogFromContext = () => {
        if (!contextMenu.type || !contextMenu.folderId) return
        deleteDialog.type = contextMenu.type
        deleteDialog.folderId = contextMenu.folderId
        deleteDialog.fileId = contextMenu.fileId
        deleteDialog.visible = true
        hideContextMenu()
    }

    const closeDeleteDialog = () => {
        deleteDialog.visible = false
    }

    const confirmDelete = () => {
        if (!deleteDialog.type || !deleteDialog.folderId) {
            closeDeleteDialog()
            return
        }

        const idx = workspaceFolders.value.findIndex(
            f => f.id === deleteDialog.folderId,
        )
        if (idx === -1) {
            closeDeleteDialog()
            return
        }

        const folder: WorkspaceFolder | undefined = workspaceFolders.value[idx]
        if (!folder) {
            closeDeleteDialog()
            return
        }

        if (deleteDialog.type === 'folder') {
            // 비어있지 않으면 삭제 불가
            if (folder.files.length > 0) {
                alert('비어있는 폴더만 삭제할 수 있습니다.')
                closeDeleteDialog()
                return
            }
            workspaceFolders.value.splice(idx, 1)
            if (selectedFolderId.value === folder.id) {
                selectedFolderId.value = null
            }
        } else if (deleteDialog.type === 'file' && deleteDialog.fileId) {
            const fidx = folder.files.findIndex(
                f => f.id === deleteDialog.fileId,
            )
            if (fidx === -1) {
                closeDeleteDialog()
                return
            }
            folder.files.splice(fidx, 1)
            if (selectedFileId.value === deleteDialog.fileId) {
                selectedFileId.value = null
            }
        }

        closeDeleteDialog()
    }

    const onDeleteKey = () => {
        if (selectedFileId.value) {
            deleteDialog.type = 'file'
            deleteDialog.folderId = selectedFolderId.value
            deleteDialog.fileId = selectedFileId.value
            deleteDialog.visible = true
        } else if (selectedFolderId.value) {
            deleteDialog.type = 'folder'
            deleteDialog.folderId = selectedFolderId.value
            deleteDialog.fileId = null
            deleteDialog.visible = true
        }
    }

    /* ----- OWS 임포트 ----- */
    const owsFileInput: Ref<HTMLInputElement | null> = ref(null)

    const onImportOwsClick = () => {
        if (!contextMenu.folderId) return
        owsFileInput.value?.click()
    }

    const onOwsFileSelected = (e: Event) => {
        const input = e.target as HTMLInputElement
        const file = input.files?.[0]
        if (!file || !contextMenu.folderId) return

        const folder = workspaceFolders.value.find(
            f => f.id === contextMenu.folderId,
        )
        if (!folder) return

        const id = `file-${Date.now()}`
        folder.files.push({
            id,
            name: file.name,
        })

        selectedFolderId.value = folder.id
        selectedFileId.value = id
        input.value = ''
    }

    /* ---------- 3) 위젯 탭 ---------- */
    const filter = ref('')


    const categories = ref<WidgetCategory[]>([
        {
            id: 'data',
            label: 'Data',
            icon: '/icons/category-data.svg',
            widgets: [
                {
                    id: 'file',
                    label: 'File',
                    description: 'Load data from files such as CSV, Excel, etc.',
                },
                {
                    id: 'data-table',
                    label: 'Data Table',
                    description: 'Inspect and browse the loaded data.',
                },
                {
                    id: 'sql-table',
                    label: 'SQL Table',
                    description: 'Read data from a database table.',
                },
            ],
        },
        {
            id: 'transform',
            label: 'Transform',
            icon: '/icons/category-transform.svg',
            widgets: [
                { id: 'normalize', label: 'Normalize', description: 'Normalize numeric features.' },
                { id: 'impute', label: 'Impute', description: 'Handle missing values.' },
                { id: 'discretize', label: 'Discretize', description: 'Convert continuous to discrete features.' },
                { id: 'merge-data', label: 'Merge Data', description: 'Merge data from multiple sources.' },
                { id: 'select-columns', label: 'Select Columns', description: 'Select or reorder columns.' },
                { id: 'select-rows', label: 'Select Rows', description: 'Filter instances by conditions.' },
                { id: 'transpose', label: 'Transpose', description: 'Swap rows and columns.' },
            ],
        },
        {
            id: 'visualize',
            label: 'Visualize',
            icon: '/icons/category-visualize.svg',
            widgets: [
                { id: 'scatter-plot', label: 'Scatter Plot', description: '2D/3D scatter visualization.' },
                { id: 'box-plot', label: 'Box Plot', description: 'Distribution of numeric features.' },
                { id: 'tree-viewer', label: 'Tree Viewer', description: 'Visualize tree-based models.' },
            ],
        },
        {
            id: 'model',
            label: 'Model',
            icon: '/icons/category-model.svg',
            widgets: [
                { id: 'tree', label: 'Tree', description: 'Decision tree learner.' },
                { id: 'logreg', label: 'Logistic Regression', description: 'Logistic regression classifier.' },
                { id: 'rf', label: 'Random Forest', description: 'Ensemble of decision trees.' },
            ],
        },
        {
            id: 'evaluate',
            label: 'Evaluate',
            icon: '/icons/category-evaluate.svg',
            widgets: [
                { id: 'test-score', label: 'Test & Score', description: 'Evaluate models with cross-validation.' },
                { id: 'confusion', label: 'Confusion Matrix', description: 'Inspect classification results.' },
            ],
        },
        {
            id: 'unsupervised',
            label: 'Unsupervised',
            icon: '/icons/category-unsupervised.svg',
            widgets: [
                { id: 'pca', label: 'PCA', description: 'Principal component analysis.' },
                { id: 'kmeans', label: 'k-Means', description: 'k-means clustering.' },
            ],
        },
    ])

// 기본으로 다 펼쳐두고 싶으면 이렇게:
    const openCategoryIds = ref<Set<string>>(
        new Set(['data', 'transform', 'visualize', 'model', 'evaluate', 'unsupervised']),
    )

    const isOpen = (catId: string) => openCategoryIds.value.has(catId)

    const toggle = (catId: string) => {
        const set = new Set(openCategoryIds.value)
        if (set.has(catId)) set.delete(catId)
        else set.add(catId)
        openCategoryIds.value = set
    }

    const filteredWidgets = (cat: WidgetCategory) => {
        const q = filter.value.trim().toLowerCase()
        if (!q) return cat.widgets
        return cat.widgets.filter(w => w.label.toLowerCase().includes(q))
    }

    const hoverWidget = ref<HoverWidgetState | null>(null)
    const selectedWidget = ref<HoverWidgetState | null>(null)

    const selectWidget = (categoryId: string, widget: WidgetItem) => {
        selectedWidget.value = { categoryId, widget }
    }

    const isSelected = (w: WidgetItem) => {
        return selectedWidget.value?.widget.id === w.id
    }

    const activeWidgetForDesc = computed<HoverWidgetState | null>(() => {
        return hoverWidget.value || selectedWidget.value
    })

    const getCategoryIconSrc = (cat: WidgetCategory): string => {
        return cat.icon ?? ''
    }

    const getIconSrc = (_catId: string, widget: WidgetItem): string => {
        return widget.icon ?? ''
    }

    /* ---------- 4) 데이터 탭 ---------- */
    const dataFolders = ref<DataFolder[]>([])
    const selectedDataFolderId = ref<string | null>(null)

    const addDataFolder = () => {
        const id = `df-${Date.now()}`
        dataFolders.value.push({
            id,
            name: '새 데이터 폴더',
            isOpen: true,
            files: [],
            connections: [],
        })
        selectedDataFolderId.value = id
    }

    const selectDataFolder = (folderId: string) => {
        selectedDataFolderId.value = folderId
    }

    const addDataFile = () => {
        if (!selectedDataFolderId.value) return
        const folder = dataFolders.value.find(
            f => f.id === selectedDataFolderId.value,
        )
        if (!folder) return
        const id = `df-file-${Date.now()}`
        folder.files.push({
            id,
            name: 'data.csv',
            format: 'csv',
        })
    }

    const renameDataFile = (folder?: DataFolder, file?: DataFile) => {
        if (!folder || !file) return
        const next = window.prompt('파일 이름', file.name)
        if (next && next.trim()) file.name = next.trim()
    }

    const removeDataFile = (folder?: DataFolder, file?: DataFile) => {
        if (!folder || !file) return
        if (!window.confirm('이 파일을 삭제하시겠습니까?')) return
        const idx = folder.files.findIndex(f => f.id === file.id)
        if (idx !== -1) folder.files.splice(idx, 1)
    }

    const addDbConnection = () => {
        if (!selectedDataFolderId.value) return
        const folder = dataFolders.value.find(
            f => f.id === selectedDataFolderId.value,
        )
        if (!folder) return
        const id = `conn-${Date.now()}`
        folder.connections.push({
            id,
            name: '새 연결',
            engine: 'PostgreSQL',
            status: 'DISCONNECTED',
        })
    }

    const toggleDbConnection = (conn: DbConnection) => {
        conn.status = conn.status === 'CONNECTED' ? 'DISCONNECTED' : 'CONNECTED'
    }

    const renameDbConnection = (folder?: DataFolder, conn?: DbConnection) => {
        if (!folder || !conn) return
        const next = window.prompt('연결 이름', conn.name)
        if (next && next.trim()) conn.name = next.trim()
    }

    const removeDbConnection = (folder?: DataFolder, conn?: DbConnection) => {
        if (!folder || !conn) return
        if (!window.confirm('이 연결을 삭제하시겠습니까?')) return
        const idx = folder.connections.findIndex(c => c.id === conn.id)
        if (idx !== -1) folder.connections.splice(idx, 1)
    }

    /* ---------- 반환: 템플릿에서 쓰는 것들 ---------- */
    return {
        // 공통
        viewMode,
        panelWidth,
        onResizeStart,

        // 워크스페이스
        workspaceFolders,
        selectedFolderId,
        selectedFileId,
        addFolder,
        addFileForFolder,
        selectFolder,
        selectFile,
        toggleFolderOpen,
        onFileDragStart,
        onFolderDrop,
        contextMenu,
        hideContextMenu,
        onFolderContextMenu,
        onFileContextMenu,
        renameDialog,
        closeRenameDialog,
        confirmRename,
        deleteDialog,
        closeDeleteDialog,
        confirmDelete,
        openRenameDialogFromContext,
        openDeleteDialogFromContext,
        onDeleteKey,
        owsFileInput,
        onImportOwsClick,
        onOwsFileSelected,

        // 위젯
        filter,
        categories,
        isOpen,
        toggle,
        filteredWidgets,
        hoverWidget,
        activeWidgetForDesc,
        isSelected,
        selectWidget,
        getCategoryIconSrc,
        getIconSrc,

        // 데이터
        dataFolders,
        selectedDataFolderId,
        addDataFolder,
        selectDataFolder,
        addDataFile,
        renameDataFile,
        removeDataFile,
        addDbConnection,
        toggleDbConnection,
        renameDbConnection,
        removeDbConnection,
    }
}
