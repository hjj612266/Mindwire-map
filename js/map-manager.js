const MapManager = {
  init() {
    this.renderList();
    this.bindEvents();
  },

  bindEvents() {
    document.getElementById('mapManagerBtn').addEventListener('click', () => this.openDrawer());
    document.getElementById('closeMapDrawer').addEventListener('click', () => this.closeDrawer());
    document.getElementById('mapDrawerBackdrop').addEventListener('click', () => this.closeDrawer());
    document.getElementById('createMapBtn').addEventListener('click', () => this.createMap());
  },

  renderList() {
    const list = document.getElementById('mapList');
    if (!list) return;
    const maps = Store.getMaps();
    const currentId = Store._currentMapId;

    list.innerHTML = maps.map(m => `
      <div class="map-item ${m.id === currentId ? 'active' : ''}" data-id="${m.id}">
        <div class="map-item-info">
          <span class="map-item-name">${this.escHtml(m.name)}</span>
          <span class="map-item-meta">${(m.cards || []).length} 卡片</span>
        </div>
        <div class="map-item-actions">
          <button class="map-item-btn" data-action="rename" title="重命名"><i class="fa-solid fa-pencil"></i></button>
          <button class="map-item-btn danger" data-action="delete" title="删除"><i class="fa-solid fa-trash-can"></i></button>
        </div>
      </div>
    `).join('');

    list.querySelectorAll('.map-item').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('.map-item-actions')) return;
        const id = parseInt(el.dataset.id);
        if (id !== Store._currentMapId) this.switchMap(id);
      });
    });

    list.querySelectorAll('[data-action="rename"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = parseInt(btn.closest('.map-item').dataset.id);
        this.renameMap(id);
      });
    });

    list.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = parseInt(btn.closest('.map-item').dataset.id);
        this.deleteMap(id);
      });
    });
  },

  openDrawer() {
    document.getElementById('mapDrawer').classList.add('open');
    document.getElementById('mapDrawerBackdrop').classList.add('visible');
    this.renderList();
  },

  closeDrawer() {
    document.getElementById('mapDrawer').classList.remove('open');
    document.getElementById('mapDrawerBackdrop').classList.remove('visible');
  },

  switchMap(id) {
    Store.saveImmediate();
    CardSystem.clearAll();
    ConnectionSystem.renderAll();
    Store.setCurrentMap(id);
    CardSystem.resetState();
    CardSystem.renderAll();
    ConnectionSystem.renderAll();
    App.currentMap = Store.getCurrentMap();
    App.updateMapName();
    App.updateDataInfo();
    this.renderList();
    this.closeDrawer();
  },

  createMap() {
    const name = prompt('画布名称:', '新画布 ' + (Store.getMaps().length + 1));
    if (!name || !name.trim()) return;
    const map = Store.createMap(name.trim());
    this.switchMap(map.id);
  },

  renameMap(id) {
    const map = Store.getMap(id);
    if (!map) return;
    const name = prompt('重命名画布:', map.name);
    if (!name || !name.trim() || name.trim() === map.name) return;
    Store.renameMap(id, name.trim());
    if (id === Store._currentMapId) App.updateMapName();
    this.renderList();
  },

  deleteMap(id) {
    const maps = Store.getMaps();
    if (maps.length <= 1) {
      Store.setStatus('至少保留一个画布', 'error');
      return;
    }
    if (!confirm(`确定删除画布「${Store.getMap(id)?.name}」？\n画布中的卡片和连线将永久删除。`)) return;
    const wasCurrent = id === Store._currentMapId;
    Store.deleteMap(id);
    if (wasCurrent) {
      CardSystem.clearAll();
      ConnectionSystem.renderAll();
      CardSystem.resetState();
      CardSystem.renderAll();
      ConnectionSystem.renderAll();
      App.currentMap = Store.getCurrentMap();
      App.updateMapName();
      App.updateDataInfo();
    }
    this.renderList();
  },

  escHtml(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }
};
