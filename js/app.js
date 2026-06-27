const App = {
  currentMap: null,
  theme: 'dark',
  accent: 'green',

  init() {
    this.currentMap = Store.init();
    this.theme = localStorage.getItem('mindwire_theme') || 'dark';
    this.accent = localStorage.getItem('mindwire_accent') || 'green';
    document.documentElement.setAttribute('data-theme', this.theme);
    document.documentElement.setAttribute('data-accent', this.accent === 'green' ? '' : this.accent);
    this.updateThemeIcon();
    this.updateMapName();
    this.bindEvents();
    this.updateDataInfo();
    CanvasSystem.init();
    CardSystem.init();
    ConnectionSystem.init();
    ParticleSystem.init();
    MapManager.init();
    ToolSystem.init();
    this.initSettings();
  },

  bindEvents() {
    document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());
    document.getElementById('addCardBtn').addEventListener('click', () => this.addCard());
  },

  initSettings() {
    const btn = document.getElementById('settingsBtn');
    const popup = document.getElementById('settingsPopup');
    const backdrop = document.getElementById('settingsBackdrop');
    const close = document.getElementById('closeSettings');
    const swatches = document.querySelectorAll('.color-swatch');

    const open = () => {
      popup.classList.add('open');
      backdrop.classList.add('visible');
      this.updateSwatches();
    };
    const closePopup = () => {
      popup.classList.remove('open');
      backdrop.classList.remove('visible');
    };

    btn.addEventListener('click', open);
    close.addEventListener('click', closePopup);
    backdrop.addEventListener('click', closePopup);

    swatches.forEach(el => {
      el.addEventListener('click', () => {
        const accent = el.dataset.accent;
        if (accent === this.accent) return;
        this.accent = accent;
        localStorage.setItem('mindwire_accent', accent);
        document.documentElement.setAttribute('data-accent', accent === 'green' ? '' : accent);
        this.updateSwatches();
      });
    });
  },

  updateSwatches() {
    document.querySelectorAll('.color-swatch').forEach(el => {
      el.classList.toggle('active', el.dataset.accent === this.accent);
    });
  },

  addCard() {
    const rect = CanvasSystem.container.getBoundingClientRect();
    const center = CanvasSystem.screenToWorld(rect.width / 2, rect.height / 2);
    CardSystem.createCard(center.x - 110, center.y - 60);
  },

  toggleTheme() {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', this.theme);
    localStorage.setItem('mindwire_theme', this.theme);
    this.updateThemeIcon();
  },

  updateThemeIcon() {
    const icon = document.querySelector('#themeToggle i');
    if (icon) {
      icon.className = this.theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    }
  },

  updateMapName() {
    const el = document.getElementById('currentMapName');
    if (el && this.currentMap) {
      el.textContent = this.currentMap.name;
    }
  },

  getStorageSize() {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const val = localStorage.getItem(key);
      total += key.length + val.length;
    }
    return (total / 1024).toFixed(1);
  },

  updateDataInfo() {
    const cards = Store.getCards();
    const conns = Store.getConnections();
    const icons = Store.getIcons();
    const tools = Store.getChecklistTools();
    const size = this.getStorageSize();
    Store.updateDataInfo(`卡片: ${cards.length} | 连线: ${conns.length} | 图标: ${icons.length} | 列表: ${tools.length} | 存储: ${size} KB`);
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
