const CARD_WIDTH = 220;
const CARD_MIN_HEIGHT = 120;
const CARD_MIN_WIDTH = 160;
const CARD_MIN_RESIZE_HEIGHT = 80;
const CARD_COLORS = [
  null,
  '#ff6b6b',
  '#feca57',
  '#54a0ff',
  '#4bcfa0',
  '#6c5ce7',
  '#fd79a8',
  '#00cec9'
];

const COLOR_LABELS = ['默认', '红', '黄', '蓝', '绿', '紫', '粉', '青'];

const CardSystem = {
  nextId: 1,
  dragState: null,
  selectedId: null,
  colorPickerId: null,
  dirtyCards: new Set(),

  init() {
    const cards = Store.getCards();
    this.nextId = cards.length > 0 ? Math.max(...cards.map(c => c.id)) + 1 : 1;
    this._pendingGlow = new Set();
    Store.onSave = () => this._flushGlow();
    this.renderAll();
  },

  clearAll() {
    document.querySelectorAll('.card').forEach(el => el.remove());
  },

  resetState() {
    this.nextId = 1;
    this.dragState = null;
    this.selectedId = null;
    this.colorPickerId = null;
    this.dirtyCards = new Set();
    this._pendingGlow = new Set();
    this.closeColorPicker();
    const cards = Store.getCards();
    this.nextId = cards.length > 0 ? Math.max(...cards.map(c => c.id)) + 1 : 1;
  },

  getNextId() {
    const cards = Store.getCards();
    const maxId = cards.length > 0 ? Math.max(...cards.map(c => c.id)) : 0;
    return Math.max(maxId, this.nextId) + 1;
  },

  createCard(worldX, worldY, title) {
    if (Store.getCards().length >= 100) {
      Store.setStatus('画布卡片已达上限 (100)', 'error');
      return;
    }
    const rect = CanvasSystem.container.getBoundingClientRect();
    const centerWorld = CanvasSystem.screenToWorld(rect.width / 2, rect.height / 2);
    const x = worldX ?? centerWorld.x - CARD_WIDTH / 2;
    const y = worldY ?? centerWorld.y - CARD_MIN_HEIGHT / 2;

    const id = this.getNextId();
    this.nextId = id + 1;

    const card = {
      id,
      title: title || '新节点',
      description: '',
      x,
      y,
      width: CARD_WIDTH,
      height: null,
      color: null,
      zIndex: Date.now(),
      collapsed: false
    };

    Store.addCard(card);
    this.renderCard(card, true);
    Store.updateDataInfo(this.buildDataInfo());
    this.selectCard(id);
    return card;
  },

  renderAll() {
    const cards = Store.getCards();
    cards.forEach(c => this.renderCard(c, false));
    Store.updateDataInfo(this.buildDataInfo());
    this.updateEmptyState();
  },

  renderCard(card, animate) {
    let el = document.querySelector(`.card[data-id="${card.id}"]`);
    if (el) {
      el.style.left = card.x + 'px';
      el.style.top = card.y + 'px';
      el.style.zIndex = card.zIndex || 10;
      return el;
    }

    el = document.createElement('div');
    el.className = 'card' + (animate ? ' entering' : '') + (card.id === this.selectedId ? ' selected' : '');
    el.dataset.id = card.id;
    el.style.left = card.x + 'px';
    el.style.top = card.y + 'px';
    el.style.width = (card.width || CARD_WIDTH) + 'px';
    if (card.height) {
      el.style.height = Math.max(CARD_MIN_RESIZE_HEIGHT, card.height) + 'px';
    }
    el.style.zIndex = card.zIndex || 10;

    if (card.color) {
      el.style.background = `linear-gradient(135deg, var(--bg-card), ${card.color}33)`;
    }

    el.innerHTML = `
      <div class="card-header">
        <div class="card-drag-grip" title="拖拽移动"><i class="fa-solid fa-grip-vertical"></i></div>
        <div class="card-title" contenteditable="true" spellcheck="false">${this.escHtml(card.title)}</div>
        <div class="card-actions">
          <button class="card-action-btn card-save-btn" data-action="save" title="保存"><i class="fa-solid fa-check"></i></button>
          <button class="card-action-btn" data-action="color" title="颜色"><i class="fa-solid fa-palette"></i></button>
          <button class="card-action-btn danger" data-action="delete" title="删除"><i class="fa-solid fa-trash-can"></i></button>
        </div>
      </div>
      <div class="card-body" contenteditable="true" spellcheck="false">${this.escHtml(card.description)}</div>
      <div class="card-resize-handle" title="调整大小"></div>
      <div class="anchor anchor-top" data-anchor="top"></div>
      <div class="anchor anchor-bottom" data-anchor="bottom"></div>
      <div class="anchor anchor-left" data-anchor="left"></div>
      <div class="anchor anchor-right" data-anchor="right"></div>
    `;

    this.bindCardEvents(el, card);
    CanvasSystem.inner.appendChild(el);

    if (animate) {
      el.addEventListener('animationend', () => {
        el.classList.remove('entering');
      }, { once: true });
    }

    return el;
  },

  removeCardElement(id) {
    const el = document.querySelector(`.card[data-id="${id}"]`);
    if (el) {
      el.classList.remove('entering');
      el.classList.add('exiting');
      el.addEventListener('animationend', () => el.remove(), { once: true });
    }
  },

  selectCard(id) {
    if (this.selectedId === id) return;
    document.querySelectorAll('.card.selected').forEach(el => el.classList.remove('selected'));
    this.selectedId = id;
    if (id !== null) {
      const el = document.querySelector(`.card[data-id="${id}"]`);
      if (el) el.classList.add('selected');
    }
  },

  escHtml(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  },

  buildDataInfo() {
    const cards = Store.getCards();
    const conns = Store.getConnections();
    return `卡片: ${cards.length} | 连线: ${conns.length}`;
  },

  updateEmptyState() {
    const cards = Store.getCards();
    const hidden = cards.length > 0;
    const empty = document.getElementById('emptyState');
    if (empty) empty.style.display = hidden ? 'none' : '';
    const hint = document.getElementById('floatHint');
    if (hint) hint.style.display = hidden ? 'none' : '';
  },

  syncPositions() {
    const cards = Store.getCards();
    cards.forEach(card => {
      const el = document.querySelector(`.card[data-id="${card.id}"]`);
      if (el) {
        el.style.left = card.x + 'px';
        el.style.top = card.y + 'px';
      }
    });
  },

  bindCardEvents(el, card) {
    const header = el.querySelector('.card-header');
    const titleEl = el.querySelector('.card-title');
    const bodyEl = el.querySelector('.card-body');

    header.addEventListener('mousedown', (e) => {
      if (e.target.closest('.card-actions') || e.target.closest('[contenteditable]')) return;
      e.stopPropagation();
      this.startDrag(e, card);
    });

    el.addEventListener('click', (e) => {
      if (e.target.closest('.card-actions') || e.target.closest('.anchor')) return;
      this.selectCard(card.id);
    });

    el.querySelectorAll('.card-action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        if (action === 'save') this.handleSave(card.id);
        else if (action === 'color') this.toggleColorPicker(card.id, btn);
        else if (action === 'delete') this.deleteCard(card.id);
      });
    });

    titleEl.addEventListener('input', () => {
      card.title = titleEl.textContent.trim() || '新节点';
      this.markDirty(card.id);
    });

    titleEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        titleEl.blur();
      }
    });

    titleEl.addEventListener('blur', () => {
      const map = Store.getCurrentMap();
      if (map) map.updatedAt = new Date().toISOString();
      Store.saveImmediate();
      this.markClean(card.id);
    });

    bodyEl.addEventListener('blur', () => {
      const map = Store.getCurrentMap();
      if (map) map.updatedAt = new Date().toISOString();
      Store.saveImmediate();
      this.markClean(card.id);
    });

    bodyEl.addEventListener('input', () => {
      card.description = bodyEl.textContent.trim();
      this.markDirty(card.id);
    });

    bodyEl.addEventListener('blur', () => {
      Store.saveImmediate();
      this.markClean(card.id);
    });

    el.querySelectorAll('.anchor').forEach(anchorEl => {
      anchorEl.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        const dir = anchorEl.dataset.anchor;
        this.onAnchorDragStart(e, card.id, dir);
      });
    });

    const resizeHandle = el.querySelector('.card-resize-handle');
    if (resizeHandle) {
      resizeHandle.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.startResize(e, card);
      });
    }
  },

  startDrag(e, card) {
    if (document.querySelector('.color-picker-popup')) {
      this.closeColorPicker();
    }

    const rect = CanvasSystem.container.getBoundingClientRect();
    const worldMouse = CanvasSystem.screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
    const cardCenterWorld = { x: card.x + card.width / 2, y: card.y + card.height / 2 };

    this.selectCard(card.id);
    Store.updateCard(card.id, { zIndex: Date.now() });

    const el = document.querySelector(`.card[data-id="${card.id}"]`);
    if (el) {
      el.style.zIndex = Date.now();
      el.classList.add('dragging');
    }

    this.dragState = {
      cardId: card.id,
      offsetX: worldMouse.x - card.x,
      offsetY: worldMouse.y - card.y,
      startX: card.x,
      startY: card.y
    };

    const onMove = (me) => {
      if (!this.dragState) return;
      const rect = CanvasSystem.container.getBoundingClientRect();
      const world = CanvasSystem.screenToWorld(me.clientX - rect.left, me.clientY - rect.top);
      const newX = world.x - this.dragState.offsetX;
      const newY = world.y - this.dragState.offsetY;
      Store.updateCard(this.dragState.cardId, { x: newX, y: newY });
      const cardEl = document.querySelector(`.card[data-id="${this.dragState.cardId}"]`);
      if (cardEl) {
        cardEl.style.left = newX + 'px';
        cardEl.style.top = newY + 'px';
      }
      ConnectionSystem.updateConnectionsForCard(this.dragState.cardId);
    };

    const onUp = () => {
      if (this.dragState) {
        const cardEl = document.querySelector(`.card[data-id="${this.dragState.cardId}"]`);
        if (cardEl) cardEl.classList.remove('dragging');
        this.dragState = null;
        Store.saveImmediate();
      }
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  },

  startResize(e, card) {
    e.preventDefault();
    this.selectCard(card.id);

    const startX = e.clientX;
    const startY = e.clientY;
    const startW = card.width || CARD_WIDTH;

    const el = document.querySelector(`.card[data-id="${card.id}"]`);
    const startH = card.height || Math.max(CARD_MIN_RESIZE_HEIGHT, el?.offsetHeight || CARD_MIN_RESIZE_HEIGHT);

    const onMove = (me) => {
      const dx = (me.clientX - startX) / CanvasSystem.zoom;
      const dy = (me.clientY - startY) / CanvasSystem.zoom;
      const newW = Math.max(CARD_MIN_WIDTH, startW + dx);
      const newH = Math.max(CARD_MIN_RESIZE_HEIGHT, startH + dy);

      Store.updateCard(card.id, { width: newW, height: newH });
      if (el) {
        el.style.width = newW + 'px';
        el.style.height = newH + 'px';
      }
      ConnectionSystem.updateConnectionsForCard(card.id);
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      CardSystem.updateCardHeights();
      Store.saveImmediate();
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  },

  updateCardHeights() {
    document.querySelectorAll('.card').forEach(el => {
      const id = parseInt(el.dataset.id);
      const card = Store.getCard(id);
      if (card) {
        const h = el.offsetHeight;
        if (h !== card.height) {
          card.height = h;
        }
      }
    });
  },

  deleteCard(id) {
    const el = document.querySelector(`.card[data-id="${id}"]`);
    if (el) {
      el.classList.add('exiting');
      ConnectionSystem.removeConnectionsForCard(id);
      el.addEventListener('animationend', () => {
        Store.deleteCard(id);
        el.remove();
        if (this.selectedId === id) this.selectedId = null;
        this.updateEmptyState();
        App.updateDataInfo();
      }, { once: true });
    }
  },

  toggleColorPicker(cardId, btnEl) {
    if (this.colorPickerId === cardId) {
      this.closeColorPicker();
      return;
    }
    this.closeColorPicker();

    const card = Store.getCard(cardId);
    if (!card) return;

    const popup = document.createElement('div');
    popup.className = 'color-picker-popup';
    popup.dataset.cardId = cardId;

    const btnRect = btnEl.getBoundingClientRect();
    popup.style.left = Math.max(8, btnRect.left - 40) + 'px';
    popup.style.top = (btnRect.bottom + 4) + 'px';

    CARD_COLORS.forEach((color, i) => {
      const swatch = document.createElement('div');
      swatch.className = 'color-swatch' + (color === null ? ' color-swatch-none' : '') + (card.color === color ? ' active' : '');
      if (color) {
        swatch.style.background = color;
      }
      swatch.title = COLOR_LABELS[i];
      swatch.addEventListener('click', (e) => {
        e.stopPropagation();
        Store.updateCard(cardId, { color });
        this.closeColorPicker();
        const cardEl = document.querySelector(`.card[data-id="${cardId}"]`);
        if (cardEl) {
          if (color) {
            cardEl.style.background = `linear-gradient(135deg, var(--bg-card), ${color}33)`;
          } else {
            cardEl.style.background = '';
          }
        }
      });
      popup.appendChild(swatch);
    });

    document.body.appendChild(popup);
    this.colorPickerId = cardId;

    const closeOnClick = (e) => {
      if (!popup.contains(e.target) && !e.target.closest('[data-action="color"]')) {
        this.closeColorPicker();
        document.removeEventListener('click', closeOnClick);
      }
    };
    setTimeout(() => document.addEventListener('click', closeOnClick), 0);
  },

  closeColorPicker() {
    const popup = document.querySelector('.color-picker-popup');
    if (popup) popup.remove();
    this.colorPickerId = null;
  },

  markDirty(id) {
    this.dirtyCards.add(id);
    this._pendingGlow.add(id);
    const el = document.querySelector(`.card[data-id="${id}"]`);
    if (el) el.classList.add('dirty');
  },

  markClean(id) {
    this.dirtyCards.delete(id);
    const el = document.querySelector(`.card[data-id="${id}"]`);
    if (el) el.classList.remove('dirty');
  },

  handleSave(id) {
    Store.saveImmediate();
  },

  _flushGlow() {
    this._pendingGlow.forEach(id => {
      const el = document.querySelector(`.card[data-id="${id}"]`);
      if (el) this.triggerGlowRing(el);
      this.markClean(id);
    });
    this._pendingGlow.clear();
  },

  triggerGlowRing(el) {
    el.classList.remove('glow-ring');
    void el.offsetWidth;
    el.classList.add('glow-ring');
    el.addEventListener('animationend', () => {
      el.classList.remove('glow-ring');
    }, { once: true });
  },

  onAnchorDragStart(e, cardId, dir) {
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

    const updateLine = (me) => {
      const fromPos = CardSystem.getAnchorScreenPos(cardId, dir);
      if (!fromPos) return;
      const mx = me.clientX - rect.left;
      const my = me.clientY - rect.top;
      path.setAttribute('d', `M${fromPos.x},${fromPos.y} L${mx},${my}`);

      const targetAnchor = document.elementFromPoint(me.clientX, me.clientY);
      document.querySelectorAll('.anchor.highlight-drop').forEach(el => el.classList.remove('highlight-drop'));
      if (targetAnchor && targetAnchor.classList.contains('anchor')) {
        const sameCard = targetAnchor.closest(`.card[data-id="${cardId}"]`);
        const sameTool = typeof ToolSystem !== 'undefined' && targetAnchor.closest(`.checklist-tool[data-id="${cardId}"]`);
        if (!sameCard && !sameTool) {
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
        const targetTool = typeof ToolSystem !== 'undefined' ? targetAnchor.closest('.checklist-tool') : null;
        const targetDir = targetAnchor.dataset.anchor;

        if (targetCard) {
          const targetId = parseInt(targetCard.dataset.id);
          if (targetId !== cardId) {
            CardSystem.createConnection(cardId, dir, targetId, targetDir);
          }
        } else if (targetTool) {
          const toolId = parseInt(targetTool.dataset.id);
          const targetId = ToolSystem.getCardId(toolId);
          CardSystem.createConnection(cardId, dir, targetId, targetDir);
        }
      }

      window.removeEventListener('mousemove', updateLine);
      window.removeEventListener('mouseup', endDrag);
    };

    window.addEventListener('mousemove', updateLine);
    window.addEventListener('mouseup', endDrag);
  },

  getAnchorWorldPos(cardId, dir) {
    const card = Store.getCard(cardId);
    if (!card) return null;
    const el = document.querySelector(`.card[data-id="${cardId}"]`);
    const h = el ? el.offsetHeight : card.height || CARD_MIN_HEIGHT;
    const cx = card.x + card.width / 2;
    const cy = card.y + h / 2;
    switch (dir) {
      case 'top': return { x: cx, y: card.y };
      case 'bottom': return { x: cx, y: card.y + h };
      case 'left': return { x: card.x, y: cy };
      case 'right': return { x: card.x + card.width, y: cy };
      default: return { x: cx, y: cy };
    }
  },

  getAnchorScreenPos(cardId, dir) {
    const world = this.getAnchorWorldPos(cardId, dir);
    if (!world) return null;
    return CanvasSystem.worldToScreen(world.x, world.y);
  },

  createConnection(fromId, fromAnchor, toId, toAnchor) {
    const existing = Store.getConnections();
    const dup = existing.find(c =>
      (c.fromCardId === fromId && c.toCardId === toId) ||
      (c.fromCardId === toId && c.toCardId === fromId)
    );
    if (dup) return;

    const conns = Store.getConnections();
    const maxId = conns.length > 0 ? Math.max(...conns.map(c => c.id)) : 0;

    const conn = {
      id: maxId + 1,
      fromCardId: fromId,
      fromAnchor,
      toCardId: toId,
      toAnchor,
      style: 'solid',
      label: ''
    };
    Store.addConnection(conn);
    ConnectionSystem.renderConnection(conn, true);
    App.updateDataInfo();
  }
};
