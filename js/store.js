const Store = {
  _data: null,
  _currentMapId: null,
  _saveTimer: null,
  _dirty: false,
  onSave: null,

  KEY: 'mindwire_data',

  init() {
    this._data = this._load();
    if (!this._data) {
      this._data = { maps: [], nextMapId: 1 };
    }
    this._data.maps.forEach(m => {
      if (!m.icons) m.icons = [];
      if (!m.checklistTools) m.checklistTools = [];
      if (!m.textTools) m.textTools = [];
    });
    if (this._data.maps.length === 0) {
      this.createMap('默认画布');
    }
    this._currentMapId = this._data.maps[0].id;
    return this.getCurrentMap();
  },

  _load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  _save() {
    try {
      localStorage.setItem(this.KEY, JSON.stringify(this._data));
      if (this.onSave) this.onSave();
    } catch (e) {
      this.setStatus('保存失败: ' + e.message, 'error');
    }
  },

  save() {
    this._dirty = true;
    if (this._saveTimer) clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => {
      if (this._dirty) {
        this._save();
        this._dirty = false;
        this.setStatus('已保存', 'success');
      }
    }, 500);
  },

  saveImmediate() {
    if (this._saveTimer) clearTimeout(this._saveTimer);
    this._save();
    this._dirty = false;
  },

  setStatus(message, type) {
    const el = document.getElementById('statusText');
    if (!el) return;
    const iconMap = { saving: 'fa-solid fa-spinner fa-spin', success: 'fa-regular fa-circle-check', error: 'fa-regular fa-circle-xmark' };
    const icon = iconMap[type] || 'fa-regular fa-circle-info';
    el.innerHTML = `<i class="${icon}"></i> ${message}`;
    el.className = type || '';
    if (type !== 'saving') {
      clearTimeout(el._statusTimer);
      el._statusTimer = setTimeout(() => {
        el.innerHTML = '<i class="fa-regular fa-circle-check"></i> 就绪';
        el.className = '';
      }, 3000);
    }
  },

  updateDataInfo(text) {
    const el = document.getElementById('statusDataInfo');
    if (el) el.textContent = text;
  },

  getMaps() {
    return this._data.maps;
  },

  getMap(id) {
    return this._data.maps.find(m => m.id === id);
  },

  createMap(name) {
    const now = new Date().toISOString();
    const map = {
      id: this._data.nextMapId++,
      name: name || '新画布',
      createdAt: now,
      updatedAt: now,
      cards: [],
      connections: [],
      icons: [],
      checklistTools: [],
      textTools: [],
      settings: {}
    };
    this._data.maps.push(map);
    this.saveImmediate();
    return map;
  },

  deleteMap(id) {
    const idx = this._data.maps.findIndex(m => m.id === id);
    if (idx === -1) return false;
    this._data.maps.splice(idx, 1);
    if (this._currentMapId === id) {
      this._currentMapId = this._data.maps.length > 0 ? this._data.maps[0].id : null;
    }
    this.saveImmediate();
    return true;
  },

  renameMap(id, name) {
    const map = this.getMap(id);
    if (map) {
      map.name = name;
      map.updatedAt = new Date().toISOString();
      this.save();
    }
  },

  getCurrentMap() {
    return this._data.maps.find(m => m.id === this._currentMapId);
  },

  setCurrentMap(id) {
    if (this.getMap(id)) {
      this._currentMapId = id;
      return this.getCurrentMap();
    }
    return null;
  },

  getCards() {
    const map = this.getCurrentMap();
    return map ? map.cards : [];
  },

  getCard(id) {
    const map = this.getCurrentMap();
    return map ? map.cards.find(c => c.id === id) : null;
  },

  addCard(card) {
    const map = this.getCurrentMap();
    if (map) {
      map.cards.push(card);
      map.updatedAt = new Date().toISOString();
      this.save();
    }
  },

  updateCard(id, updates) {
    const card = this.getCard(id);
    if (card) {
      Object.assign(card, updates);
      const map = this.getCurrentMap();
      if (map) map.updatedAt = new Date().toISOString();
      this.save();
    }
  },

  deleteCard(id) {
    const map = this.getCurrentMap();
    if (map) {
      map.cards = map.cards.filter(c => c.id !== id);
      map.connections = map.connections.filter(c => c.fromCardId !== id && c.toCardId !== id);
      map.updatedAt = new Date().toISOString();
      this.save();
    }
  },

  getConnections() {
    const map = this.getCurrentMap();
    return map ? map.connections : [];
  },

  addConnection(conn) {
    const map = this.getCurrentMap();
    if (map) {
      map.connections.push(conn);
      map.updatedAt = new Date().toISOString();
      this.save();
    }
  },

  deleteConnection(id) {
    const map = this.getCurrentMap();
    if (map) {
      map.connections = map.connections.filter(c => c.id !== id);
      map.updatedAt = new Date().toISOString();
      this.save();
    }
  },

  updateConnection(id, updates) {
    const map = this.getCurrentMap();
    if (map) {
      const conn = map.connections.find(c => c.id === id);
      if (conn) {
        Object.assign(conn, updates);
        map.updatedAt = new Date().toISOString();
        this.save();
      }
    }
  },

  getIcons() {
    const map = this.getCurrentMap();
    return map ? (map.icons || []) : [];
  },

  addIcon(icon) {
    const map = this.getCurrentMap();
    if (map) {
      map.icons.push(icon);
      map.updatedAt = new Date().toISOString();
      this.save();
    }
  },

  deleteIcon(id) {
    const map = this.getCurrentMap();
    if (map) {
      map.icons = map.icons.filter(i => i.id !== id);
      map.updatedAt = new Date().toISOString();
      this.save();
    }
  },

  updateIcon(id, updates) {
    const map = this.getCurrentMap();
    if (map) {
      const icon = map.icons.find(i => i.id === id);
      if (icon) {
        Object.assign(icon, updates);
        map.updatedAt = new Date().toISOString();
        this.save();
      }
    }
  },

  getChecklistTools() {
    const map = this.getCurrentMap();
    return map ? (map.checklistTools || []) : [];
  },

  addChecklistTool(tool) {
    const map = this.getCurrentMap();
    if (map) {
      map.checklistTools.push(tool);
      map.updatedAt = new Date().toISOString();
      this.save();
    }
  },

  deleteChecklistTool(id) {
    const map = this.getCurrentMap();
    if (map) {
      map.checklistTools = map.checklistTools.filter(t => t.id !== id);
      map.updatedAt = new Date().toISOString();
      this.save();
    }
  },

  updateChecklistTool(id, updates) {
    const map = this.getCurrentMap();
    if (map) {
      const tool = map.checklistTools.find(t => t.id === id);
      if (tool) {
        Object.assign(tool, updates);
        map.updatedAt = new Date().toISOString();
        this.save();
      }
    }
  },

  getTextTools() {
    const map = this.getCurrentMap();
    return map ? (map.textTools || []) : [];
  },

  addTextTool(tool) {
    const map = this.getCurrentMap();
    if (map) {
      map.textTools.push(tool);
      map.updatedAt = new Date().toISOString();
      this.save();
    }
  },

  deleteTextTool(id) {
    const map = this.getCurrentMap();
    if (map) {
      map.textTools = map.textTools.filter(t => t.id !== id);
      map.updatedAt = new Date().toISOString();
      this.save();
    }
  },

  updateTextTool(id, updates) {
    const map = this.getCurrentMap();
    if (map) {
      const tool = map.textTools.find(t => t.id === id);
      if (tool) {
        Object.assign(tool, updates);
        map.updatedAt = new Date().toISOString();
        this.save();
      }
    }
  }
};
