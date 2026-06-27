const ICON_SIZE = 44;

const ICON_TYPES = [
  { id: 'emergency',   label: '紧急标识',    icon: 'fa-triangle-exclamation', anim: 'breathing' },
  { id: 'important',   label: '重要标识',    icon: 'fa-star',                 anim: 'pulse' },
  { id: 'ai-robot',    label: 'AI机器人',    icon: 'fa-robot',                anim: 'glitch' },
  { id: 'question',    label: '疑问标识',    icon: 'fa-circle-question',     anim: 'float' },
  { id: 'database',    label: '数据库标识',  icon: 'fa-database',            anim: 'sparkle' },
  { id: 'energy',      label: '能源标识',    icon: 'fa-battery-full',        anim: 'tremble' },
  { id: 'recycle',     label: '回收标识',    icon: 'fa-recycle',             anim: 'rotate' },
  { id: 'lightning',   label: '闪电标识',    icon: 'fa-bolt',                anim: 'tremble' },
  { id: 'danger',      label: '危险标识',    icon: 'fa-skull',               anim: 'breathing' },
  { id: 'radiation',   label: '放射性标识',  icon: 'fa-radiation',           anim: 'glitch' },
  { id: 'transport',   label: '运输标识',    icon: 'fa-truck',               anim: 'float' },
  { id: 'contact',     label: '联系人标识',  icon: 'fa-user',                anim: 'pulse' },
  { id: 'email',       label: '邮件标识',    icon: 'fa-envelope',            anim: 'rotate' }
];

const TOOL_WIDTH = 270;

const ToolSystem = {
  TOOL_ID_OFFSET: 1000000,
  dragState: null,
  _dirtyTools: new Set(),

  getCardId(toolId) { return this.TOOL_ID_OFFSET + toolId; },

  isToolCardId(id) { return id >= this.TOOL_ID_OFFSET; },

  getToolId(cardId) { return cardId - this.TOOL_ID_OFFSET; },

  markToolDirty(id) {
    this._dirtyTools.add(id);
    const el = document.querySelector(`.checklist-tool[data-id="${id}"]`);
    if (el) el.classList.add('dirty');
  },

  markToolClean(id) {
    this._dirtyTools.delete(id);
    const el = document.querySelector(`.checklist-tool[data-id="${id}"]`);
    if (el) el.classList.remove('dirty');
  },

  handleToolSave(id) {
    Store.saveImmediate();
    this.markToolClean(id);
  },

  init() {
    this.createFloatingBtn();
    this.createDrawer();
    this.renderPalette();
    this.renderAll();
    this.wrapMapSwitch();
  },

  createFloatingBtn() {
    const btn = document.createElement('button');
    btn.className = 'tool-floating-btn';
    btn.id = 'toolFloatingBtn';
    btn.title = '工具箱';
    btn.innerHTML = '<i class="fa-solid fa-cube"></i>';
    document.body.appendChild(btn);
    btn.addEventListener('click', () => this.toggleDrawer());
  },

  toggleDrawer() {
    const drawer = document.getElementById('toolDrawer');
    const backdrop = document.getElementById('toolDrawerBackdrop');
    const isOpen = drawer.classList.contains('open');
    drawer.classList.toggle('open', !isOpen);
    backdrop.classList.toggle('visible', !isOpen);
  },

  createDrawer() {
    const backdrop = document.createElement('div');
    backdrop.className = 'drawer-backdrop';
    backdrop.id = 'toolDrawerBackdrop';
    document.body.appendChild(backdrop);

    const drawer = document.createElement('div');
    drawer.className = 'tool-drawer';
    drawer.id = 'toolDrawer';
    drawer.innerHTML = `
      <div class="tool-drawer-header">
        <span class="tool-drawer-title"><i class="fa-solid fa-cube"></i> 工具箱</span>
        <button class="btn btn-ghost btn-icon" id="closeToolDrawer"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="tool-drawer-body">
        <div class="tool-section">
          <div class="tool-section-title">图标库</div>
          <div class="icon-palette" id="iconPalette"></div>
        </div>
        <div class="tool-section">
          <div class="tool-section-title">工具</div>
          <div class="icon-palette">
            <div class="palette-icon-item" id="addChecklistBtn">
              <i class="fa-solid fa-list-check"></i>
              <span class="palette-icon-label">子任务列表</span>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(drawer);

    document.getElementById('closeToolDrawer').addEventListener('click', () => this.toggleDrawer());
    backdrop.addEventListener('click', () => this.toggleDrawer());
    document.getElementById('addChecklistBtn').addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.startDrawerDrag(e, 'tool');
    });
  },

  renderPalette() {
    const container = document.getElementById('iconPalette');
    if (!container) return;
    container.innerHTML = ICON_TYPES.map(t => `
      <div class="palette-icon-item" data-type="${t.id}">
        <i class="fa-solid ${t.icon}"></i>
        <span class="palette-icon-label">${t.label}</span>
      </div>
    `).join('');

    container.querySelectorAll('.palette-icon-item').forEach(el => {
      el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this.startDrawerDrag(e, 'icon', el.dataset.type);
      });
    });
  },

  placeIcon(type, worldX, worldY) {
    const icons = Store.getIcons();
    const maxId = icons.length > 0 ? Math.max(...icons.map(i => i.id)) : 0;
    const icon = {
      id: maxId + 1,
      type,
      x: worldX,
      y: worldY,
      zIndex: 100000
    };
    Store.addIcon(icon);
    this.renderCanvasIcon(icon);
    App.updateDataInfo();
  },

  removeIcon(id) {
    const el = document.querySelector(`.canvas-icon[data-id="${id}"]`);
    if (el) el.remove();
    Store.deleteIcon(id);
    App.updateDataInfo();
  },

  startIconDrag(e, iconId) {
    const icon = Store.getIcons().find(i => i.id === iconId);
    if (!icon) return;

    const rect = CanvasSystem.container.getBoundingClientRect();
    const world = CanvasSystem.screenToWorld(e.clientX - rect.left, e.clientY - rect.top);

    const newZ = Date.now() + 100000;
    Store.updateIcon(iconId, { zIndex: newZ });

    const el = document.querySelector(`.canvas-icon[data-id="${iconId}"]`);
    if (el) el.style.zIndex = newZ;

    this.dragState = { type: 'icon', id: iconId, offsetX: world.x - icon.x, offsetY: world.y - icon.y };

    const onMove = (me) => {
      if (!this.dragState || this.dragState.type !== 'icon') return;
      const rect = CanvasSystem.container.getBoundingClientRect();
      const world = CanvasSystem.screenToWorld(me.clientX - rect.left, me.clientY - rect.top);
      const newX = world.x - this.dragState.offsetX;
      const newY = world.y - this.dragState.offsetY;
      Store.updateIcon(this.dragState.id, { x: newX, y: newY });
      const el = document.querySelector(`.canvas-icon[data-id="${this.dragState.id}"]`);
      if (el) { el.style.left = newX + 'px'; el.style.top = newY + 'px'; }
    };

    const onUp = () => {
      if (this.dragState && this.dragState.type === 'icon') Store.saveImmediate();
      this.dragState = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  },

  renderAll() {
    this.renderCanvasIcons();
    this.renderCanvasTools();
  },

  clearAll() {
    document.querySelectorAll('.canvas-icon, .checklist-tool').forEach(el => el.remove());
  },

  renderCanvasIcons() {
    const icons = Store.getIcons();
    icons.forEach(i => this.renderCanvasIcon(i));
  },

  renderCanvasIcon(icon) {
    let el = document.querySelector(`.canvas-icon[data-id="${icon.id}"]`);
    const typeDef = ICON_TYPES.find(t => t.id === icon.type) || ICON_TYPES[0];
    if (!typeDef) return;

    if (el) {
      el.style.left = icon.x + 'px';
      el.style.top = icon.y + 'px';
      el.style.zIndex = icon.zIndex || 100000;
      return;
    }

    el = document.createElement('div');
    el.className = 'canvas-icon anim-' + (typeDef.anim || 'breathing');
    el.dataset.id = icon.id;
    el.style.left = icon.x + 'px';
    el.style.top = icon.y + 'px';
    el.style.zIndex = icon.zIndex || 100000;
    el.innerHTML = `
      <i class="fa-solid ${typeDef.icon}"></i>
      <button class="icon-delete-btn" title="删除图标"><i class="fa-solid fa-trash-can"></i></button>
    `;

    el.querySelector('.icon-delete-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.removeIcon(icon.id);
    });

    el.addEventListener('mousedown', (e) => {
      if (e.target.closest('.icon-delete-btn')) return;
      e.stopPropagation();
      this.startIconDrag(e, icon.id);
    });

    CanvasSystem.inner.appendChild(el);
  },

  createChecklistToolAt(worldX, worldY) {
    const tools = Store.getChecklistTools();
    const maxId = tools.length > 0 ? Math.max(...tools.map(t => t.id)) : 0;

    const tool = {
      id: maxId + 1,
      title: '子任务列表',
      x: worldX - 135,
      y: worldY - 30,
      width: TOOL_WIDTH,
      zIndex: 500,
      items: []
    };
    Store.addChecklistTool(tool);
    this.renderCanvasTool(tool);
    App.updateDataInfo();
  },

  startDrawerDrag(e, itemType, iconType) {
    const ghost = document.createElement('div');
    ghost.className = 'palette-drag-ghost';

    if (itemType === 'icon') {
      ghost.classList.add('icon-ghost');
      const typeDef = ICON_TYPES.find(t => t.id === iconType) || ICON_TYPES[0];
      ghost.innerHTML = `<i class="fa-solid ${typeDef.icon}"></i>`;
    } else {
      ghost.classList.add('tool-ghost');
      ghost.innerHTML = '<i class="fa-solid fa-list-check"></i> 子任务列表';
    }

    ghost.style.left = (e.clientX - 22) + 'px';
    ghost.style.top = (e.clientY - 22) + 'px';
    document.body.appendChild(ghost);

    this.toggleDrawer();

    const onMove = (me) => {
      ghost.style.left = (me.clientX - 22) + 'px';
      ghost.style.top = (me.clientY - 22) + 'px';
    };

    const onUp = (me) => {
      ghost.remove();
      const canvasRect = CanvasSystem.container.getBoundingClientRect();
      if (me.clientX >= canvasRect.left && me.clientX <= canvasRect.right &&
          me.clientY >= canvasRect.top && me.clientY <= canvasRect.bottom) {
        const world = CanvasSystem.screenToWorld(me.clientX - canvasRect.left, me.clientY - canvasRect.top);
        if (itemType === 'icon') {
          this.placeIcon(iconType, world.x - ICON_SIZE / 2, world.y - ICON_SIZE / 2);
        } else {
          this.createChecklistToolAt(world.x, world.y);
        }
      }
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  },

  removeChecklistTool(id) {
    const el = document.querySelector(`.checklist-tool[data-id="${id}"]`);
    if (el) el.remove();
    Store.deleteChecklistTool(id);
    App.updateDataInfo();
  },

  renderCanvasTools() {
    const tools = Store.getChecklistTools();
    tools.forEach(t => this.renderCanvasTool(t));
  },

  renderCanvasTool(tool) {
    let el = document.querySelector(`.checklist-tool[data-id="${tool.id}"]`);

    if (el) {
      el.style.left = tool.x + 'px';
      el.style.top = tool.y + 'px';
      el.style.zIndex = tool.zIndex || 500;
      this.renderToolItems(el, tool);
      return;
    }

    el = document.createElement('div');
    el.className = 'checklist-tool';
    el.dataset.id = tool.id;
    el.style.left = tool.x + 'px';
    el.style.top = tool.y + 'px';
    el.style.zIndex = tool.zIndex || 500;

    const isDirty = this._dirtyTools.has(tool.id);
    el.innerHTML = `
      <div class="checklist-header">
        <div class="checklist-drag-handle"><i class="fa-solid fa-grip-vertical"></i></div>
        <div class="checklist-title" contenteditable="true">${this.escHtml(tool.title)}</div>
        <button class="checklist-save-btn" title="保存"><i class="fa-solid fa-check"></i></button>
        <button class="checklist-delete-btn" title="删除列表"><i class="fa-solid fa-trash-can"></i></button>
      </div>
      <div class="checklist-items"></div>
      <div class="checklist-footer">
        <input type="text" class="checklist-input" placeholder="添加任务...">
        <button class="checklist-add-btn" title="添加任务">添加</button>
      </div>
      <div class="anchor anchor-top" data-anchor="top"></div>
      <div class="anchor anchor-bottom" data-anchor="bottom"></div>
      <div class="anchor anchor-left" data-anchor="left"></div>
      <div class="anchor anchor-right" data-anchor="right"></div>
    `;
    if (isDirty) el.classList.add('dirty');

    this.bindToolEvents(el, tool);
    this.bindToolAnchorEvents(el, tool);
    this.renderToolItems(el, tool);

    CanvasSystem.inner.appendChild(el);
  },

  renderToolItems(el, tool) {
    const container = el.querySelector('.checklist-items');
    if (!container) return;

    container.innerHTML = (tool.items || []).map(item => `
      <div class="checklist-item${item.done ? ' done' : ''}" data-item-id="${item.id}">
        <input type="checkbox" class="checklist-cb" ${item.done ? 'checked' : ''}>
        <span class="checklist-item-text" contenteditable="true">${this.escHtml(item.text)}</span>
        <button class="checklist-item-del" title="删除任务"><i class="fa-solid fa-xmark"></i></button>
      </div>
    `).join('');

    this.bindItemEvents(container, tool);
  },

  bindToolEvents(el, tool) {
    el.querySelector('.checklist-drag-handle').addEventListener('mousedown', (e) => {
      e.stopPropagation();
      this.startToolDrag(e, tool.id);
    });

    el.querySelector('.checklist-save-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleToolSave(tool.id);
    });

    el.querySelector('.checklist-delete-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.removeChecklistTool(tool.id);
    });

    const titleEl = el.querySelector('.checklist-title');
    titleEl.addEventListener('blur', () => {
      Store.updateChecklistTool(tool.id, { title: titleEl.textContent.trim() || '子任务列表' });
      this.markToolDirty(tool.id);
    });

    const input = el.querySelector('.checklist-input');
    const addBtn = el.querySelector('.checklist-add-btn');

    const doAdd = () => {
      const text = input.value.trim();
      if (!text) return;
      const items = tool.items || [];
      const maxId = items.length > 0 ? Math.max(...items.map(i => i.id)) : 0;
      items.push({ id: maxId + 1, text, done: false });
      tool.items = items;
      Store.updateChecklistTool(tool.id, { items });
      this.renderToolItems(el, tool);
      input.value = '';
      this.markToolDirty(tool.id);
      App.updateDataInfo();
    };

    addBtn.addEventListener('click', doAdd);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); doAdd(); }
    });
  },

  bindItemEvents(container, tool) {
    container.querySelectorAll('.checklist-item').forEach(itemEl => {
      const itemId = parseInt(itemEl.dataset.itemId);
      if (isNaN(itemId)) return;

      const cb = itemEl.querySelector('.checklist-cb');
      cb.addEventListener('change', () => {
        const item = tool.items.find(i => i.id === itemId);
        if (!item) return;
        item.done = cb.checked;
        Store.updateChecklistTool(tool.id, { items: tool.items });
        itemEl.classList.toggle('done', cb.checked);
        this.markToolDirty(tool.id);
      });

      const textEl = itemEl.querySelector('.checklist-item-text');
      textEl.addEventListener('blur', () => {
        const item = tool.items.find(i => i.id === itemId);
        if (!item) return;
        item.text = textEl.textContent.trim() || '任务';
        Store.updateChecklistTool(tool.id, { items: tool.items });
        this.markToolDirty(tool.id);
      });

      itemEl.querySelector('.checklist-item-del').addEventListener('click', (e) => {
        e.stopPropagation();
        tool.items = tool.items.filter(i => i.id !== itemId);
        Store.updateChecklistTool(tool.id, { items: tool.items });
        this.renderToolItems(container, tool);
        this.markToolDirty(tool.id);
        App.updateDataInfo();
      });
    });
  },

  bindToolAnchorEvents(el, tool) {
    el.querySelectorAll('.anchor').forEach(anchorEl => {
      anchorEl.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        this.onToolAnchorDragStart(e, tool.id, anchorEl.dataset.anchor);
      });
    });
  },

  onToolAnchorDragStart(e, toolId, dir) {
    const anchorEl = e.currentTarget;
    anchorEl.classList.add('active-drag');

    const rect = CanvasSystem.container.getBoundingClientRect();

    const dragLine = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    dragLine.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:5;overflow:visible';
    dragLine.id = 'dragPreviewLine';
    CanvasSystem.container.appendChild(dragLine);

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.style.cssText = 'stroke:var(--primary);stroke-width:2;fill:none;stroke-dasharray:6 4;opacity:0.6';
    dragLine.appendChild(path);

    const fromCardId = this.getCardId(toolId);

    const updateLine = (me) => {
      const fromPos = this.getToolAnchorScreenPos(toolId, dir);
      if (!fromPos) return;
      const mx = me.clientX - rect.left;
      const my = me.clientY - rect.top;
      path.setAttribute('d', `M${fromPos.x},${fromPos.y} L${mx},${my}`);

      const targetAnchor = document.elementFromPoint(me.clientX, me.clientY);
      document.querySelectorAll('.anchor.highlight-drop').forEach(el => el.classList.remove('highlight-drop'));
      if (targetAnchor && targetAnchor.classList.contains('anchor')) {
        const sameTool = targetAnchor.closest(`.checklist-tool[data-id="${toolId}"]`);
        const sameCard = targetAnchor.closest(`.card[data-id="${toolId}"]`);
        if (!sameTool && !sameCard) {
          targetAnchor.classList.add('highlight-drop');
        }
      }
    };

    const endDrag = (me) => {
      anchorEl.classList.remove('active-drag');
      document.querySelectorAll('.anchor.highlight-drop').forEach(el => el.classList.remove('highlight-drop'));
      const preview = document.getElementById('dragPreviewLine');
      if (preview) preview.remove();

      const targetAnchor = document.elementFromPoint(me.clientX, me.clientY);
      if (targetAnchor && targetAnchor.classList.contains('anchor')) {
        const targetCard = targetAnchor.closest('.card');
        const targetTool = targetAnchor.closest('.checklist-tool');
        const targetDir = targetAnchor.dataset.anchor;

        if (targetCard) {
          const targetId = parseInt(targetCard.dataset.id);
          CardSystem.createConnection(fromCardId, dir, targetId, targetDir);
        } else if (targetTool) {
          const targetToolId = parseInt(targetTool.dataset.id);
          const targetId = this.getCardId(targetToolId);
          CardSystem.createConnection(fromCardId, dir, targetId, targetDir);
        }
      }

      window.removeEventListener('mousemove', updateLine);
      window.removeEventListener('mouseup', endDrag);
    };

    window.addEventListener('mousemove', updateLine);
    window.addEventListener('mouseup', endDrag);
  },

  getToolAnchorScreenPos(toolId, dir) {
    const tool = Store.getChecklistTools().find(t => t.id === toolId);
    if (!tool) return null;
    const el = document.querySelector(`.checklist-tool[data-id="${toolId}"]`);
    const h = el ? el.offsetHeight : 120;
    const cx = tool.x + TOOL_WIDTH / 2;
    const cy = tool.y + h / 2;
    let wx, wy;
    switch (dir) {
      case 'top': wx = cx; wy = tool.y; break;
      case 'bottom': wx = cx; wy = tool.y + h; break;
      case 'left': wx = tool.x; wy = cy; break;
      case 'right': wx = tool.x + TOOL_WIDTH; wy = cy; break;
      default: wx = cx; wy = cy;
    }
    return CanvasSystem.worldToScreen(wx, wy);
  },

  startToolDrag(e, toolId) {
    const tool = Store.getChecklistTools().find(t => t.id === toolId);
    if (!tool) return;

    const rect = CanvasSystem.container.getBoundingClientRect();
    const world = CanvasSystem.screenToWorld(e.clientX - rect.left, e.clientY - rect.top);

    const newZ = Date.now() + 500;
    Store.updateChecklistTool(toolId, { zIndex: newZ });

    const el = document.querySelector(`.checklist-tool[data-id="${toolId}"]`);
    if (el) el.style.zIndex = newZ;

    this.dragState = { type: 'tool', id: toolId, offsetX: world.x - tool.x, offsetY: world.y - tool.y };

    const onMove = (me) => {
      if (!this.dragState || this.dragState.type !== 'tool') return;
      const rect = CanvasSystem.container.getBoundingClientRect();
      const world = CanvasSystem.screenToWorld(me.clientX - rect.left, me.clientY - rect.top);
      const newX = world.x - this.dragState.offsetX;
      const newY = world.y - this.dragState.offsetY;
      Store.updateChecklistTool(this.dragState.id, { x: newX, y: newY });
      const el = document.querySelector(`.checklist-tool[data-id="${this.dragState.id}"]`);
      if (el) { el.style.left = newX + 'px'; el.style.top = newY + 'px'; }
      ConnectionSystem.updateConnectionsForCard(this.getCardId(this.dragState.id));
    };

    const onUp = () => {
      if (this.dragState && this.dragState.type === 'tool') Store.saveImmediate();
      this.dragState = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  },

  wrapMapSwitch() {
    const origSwitch = MapManager.switchMap.bind(MapManager);
    MapManager.switchMap = (id) => {
      this.clearAll();
      origSwitch(id);
      this.renderAll();
    };

    const origDelete = MapManager.deleteMap.bind(MapManager);
    MapManager.deleteMap = (id) => {
      const wasCurrent = id === Store._currentMapId;
      if (wasCurrent) this.clearAll();
      origDelete(id);
      if (wasCurrent) this.renderAll();
    };
  },

  escHtml(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }
};
