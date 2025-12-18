<!-- TopMenuBar.vue -->
<template>
  <header class="oj-menubar">
    <nav class="oj-menubar-inner">
      <ul class="oj-menubar-root">
        <li
            v-for="menu in menus"
            :key="menu.id"
            class="oj-menubar-menu"
            :class="{ 'is-open': openMenuId === menu.id }"
        >
          <button
              type="button"
              class="oj-menubar-button"
              @click="toggleMenu(menu.id)"
          >
            {{ menu.label }}
          </button>

          <!-- 드롭다운 -->
          <div
              v-if="openMenuId === menu.id"
              class="oj-menubar-dropdown"
          >
            <template v-for="(item, idx) in menu.items" :key="idx">
              <div
                  v-if="item.type === 'separator'"
                  class="oj-menubar-separator"
              />
              <button
                  v-else
                  type="button"
                  class="oj-menubar-item"
                  @click="onMenuItemClick(menu, item)"
              >
                <span class="oj-item-label">{{ item.label }}</span>
                <span v-if="item.shortcut" class="oj-item-shortcut">
                  {{ item.shortcut }}
                </span>
              </button>
            </template>
          </div>
        </li>
      </ul>
    </nav>

    <!-- 바깥 클릭 시 닫기용 -->
    <div
        v-if="openMenuId"
        class="oj-menubar-backdrop"
        @click="closeMenus"
    />
  </header>
</template>

<script>
import { useWorkflowStore } from '@/stores/workflow';
import { useHistoryStore } from '@/stores/historyStore';

export default {
  name: 'TopMenuBar',
  setup() {
    // Pinia 스토어 주입
    const workflowStore = useWorkflowStore();
    const historyStore = useHistoryStore();
    return { workflowStore, historyStore };
  },
  data() {
    return {
      openMenuId: null,
      // Orange3 상단 메뉴 구조를 최대한 맞춘 버전
      menus: [
        {
          id: 'file',
          label: 'File',
          items: [
            { label: 'New', action: 'file:new' },
            { label: 'Open...', action: 'file:open' },
            { label: 'Open Recent', action: 'file:open-recent' },
            { type: 'separator' },
            { label: 'Save', action: 'file:save', shortcut: 'Ctrl+S' },
            { label: 'Save As...', action: 'file:save-as' },
            { type: 'separator' },
            { label: 'Close', action: 'file:close' },
            { label: 'Quit', action: 'file:quit', shortcut: 'Ctrl+Q' }
          ]
        },
        {
          id: 'edit',
          label: 'Edit',
          items: [
            { label: 'Undo', action: 'edit:undo', shortcut: 'Ctrl+Z' },
            { label: 'Redo', action: 'edit:redo', shortcut: 'Ctrl+Y' },
            { type: 'separator' },
            { label: 'Cut', action: 'edit:cut', shortcut: 'Ctrl+X' },
            { label: 'Copy', action: 'edit:copy', shortcut: 'Ctrl+C' },
            { label: 'Paste', action: 'edit:paste', shortcut: 'Ctrl+V' },
            { type: 'separator' },
            { label: 'Delete', action: 'edit:delete' }
          ]
        },
        {
          id: 'view',
          label: 'View',
          items: [
            { label: 'Zoom In', action: 'view:zoom-in', shortcut: 'Ctrl++' },
            { label: 'Zoom Out', action: 'view:zoom-out', shortcut: 'Ctrl+-' },
            { label: 'Reset Zoom', action: 'view:zoom-reset' },
            { type: 'separator' },
            { label: 'Show/Hide Widget Box', action: 'view:toggle-widget-box' },
            { label: 'Show/Hide Status Bar', action: 'view:toggle-status-bar' }
          ]
        },
        {
          id: 'widget',
          label: 'Widget',
          items: [
            { label: 'Rename', action: 'widget:rename' },
            { label: 'Duplicate', action: 'widget:duplicate' },
            { label: 'Save as Template', action: 'widget:save-template' },
            { type: 'separator' },
            { label: 'Help', action: 'widget:help', shortcut: 'F1' }
          ]
        },
        {
          id: 'options',
          label: 'Options',
          items: [
            { label: 'Settings...', action: 'options:settings' },
            { type: 'separator' },
            { label: 'Add-ons...', action: 'options:addons' },
            { label: 'Reset Widget Settings', action: 'options:reset-widgets' }
          ]
        },
        {
          id: 'help',
          label: 'Help',
          items: [
            { label: 'Welcome Screen', action: 'help:welcome' },
            { label: 'Tutorials', action: 'help:tutorials' },
            { label: 'Documentation', action: 'help:docs' },
            { type: 'separator' },
            { label: 'About Orange Web', action: 'help:about' }
          ]
        }
      ]
    };
  },
  methods: {
    toggleMenu(id) {
      this.openMenuId = this.openMenuId === id ? null : id;
    },
    closeMenus() {
      this.openMenuId = null;
    },
    onMenuItemClick(menu, item) {
      if (item.action === 'file:new' || item.action === 'file:close') {
        this.handleFileClose();
      }
      // 나중에 실제 동작 붙일 자리
      console.log('[MENU]', menu.id, '→', item.action);
      this.closeMenus();
    },
    handleFileClose() {
      if (confirm('현재 작업 중인 워크플로우를 닫으시겠습니까? 저장하지 않은 변경 사항은 삭제됩니다.')) {
        // 1. 워크플로우 데이터 초기화
        this.workflowStore.clearWorkflow();
        // 2. 히스토리(Undo/Redo) 초기화
        this.historyStore.resetHistory();
        // 3. 로컬 스토리지 동기화 (useWorkflowCanvas의 watch가 처리하지만 명시적으로 삭제 가능)
        localStorage.removeItem('oj-workflow-state');
      }
    }
  }
};
</script>

<style scoped>
.oj-menubar {
  position: relative;
  z-index: 20;
  background: #f6f6f6;
  border-bottom: 1px solid #c4c4c4;
  font-size: 13px;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  /* 높이를 고정해서 위/아래 덜 출렁이게 */
  height: 28px;
  display: flex;
  align-items: stretch;
}

.oj-menubar-inner {
  width: 100%;
}

.oj-menubar-root {
  display: flex;
  align-items: stretch;
  gap: 2px;
  list-style: none;
  padding: 0 8px;
  margin: 0;
}

.oj-menubar-menu {
  position: relative;
}

.oj-menubar-button {
  /* 항상 테두리를 가지고 있게 해서 open 시에도 높이 안 변함 */
  border: 1px solid transparent;
  background: transparent;
  padding: 3px 10px;
  margin: 3px 0 0; /* 위에서 살짝 떨어지게 */
  border-radius: 3px 3px 0 0;
  cursor: default;
  color: #333;
  line-height: 18px;
  box-sizing: border-box;
}

.oj-menubar-button:hover {
  background: #e5e5e5;
}

/* 열렸을 때는 색깔만 바꿔주고, border 두께는 그대로 */
.oj-menubar-menu.is-open > .oj-menubar-button {
  background: #ffffff;
  border-color: #c4c4c4;
  border-bottom-color: #ffffff;
  position: relative;
  z-index: 21;
}

/* 드롭다운은 절대 위치라서 아래 레이아웃을 밀지 않음 */
.oj-menubar-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  min-width: 180px;
  background: #ffffff;
  border: 1px solid #c4c4c4;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12);
  padding: 4px 0;
  z-index: 20;
}

.oj-menubar-item {
  width: 100%;
  padding: 3px 16px;
  border: none;
  background: transparent;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: #222;
  cursor: default;
}

.oj-menubar-item:hover {
  background: #0078d7;
  color: #ffffff;
}

.oj-item-label {
  flex: 1 1 auto;
  text-align: left;
}

.oj-item-shortcut {
  flex: 0 0 auto;
  margin-left: 16px;
  font-size: 11px;
  opacity: 0.7;
}

.oj-menubar-separator {
  height: 1px;
  margin: 4px 6px;
  background: #e0e0e0;
}

.oj-menubar-backdrop {
  position: fixed;
  inset: 0;
  z-index: 10;
}
</style>
