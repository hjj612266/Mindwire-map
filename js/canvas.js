const DOT_SPACING = 28;
const DOT_RADIUS = 0.9;
const MIN_ZOOM = 0.15;
const MAX_ZOOM = 4;

const CanvasSystem = {
  offsetX: 0,
  offsetY: 0,
  zoom: 1,
  isPanning: false,
  panStartX: 0,
  panStartY: 0,
  panOffsetStartX: 0,
  panOffsetStartY: 0,

  container: null,
  canvas: null,
  ctx: null,
  inner: null,

  init() {
    this.container = document.getElementById('canvasContainer');
    this.canvas = document.getElementById('bgCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.inner = document.getElementById('canvasInner');
    this.resize();
    this.render();
    this.bindEvents();
    this.canvas.classList.add('ready');
  },

  resize() {
    const rect = this.container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.render();
  },

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);

    ctx.clearRect(0, 0, w, h);

    const spacing = DOT_SPACING * this.zoom;
    if (spacing < 4) return;

    const radius = DOT_RADIUS * Math.min(1, this.zoom / 0.3);
    const startX = this.offsetX % spacing;
    const startY = this.offsetY % spacing;

    ctx.fillStyle = window.getComputedStyle(document.documentElement)
      .getPropertyValue('--dot-color').trim() || 'rgba(74,106,122,0.2)';

    const maxDots = 5000;
    let count = 0;

    for (let x = startX; x < w; x += spacing) {
      for (let y = startY; y < h; y += spacing) {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        count++;
        if (count > maxDots) break;
      }
      if (count > maxDots) break;
    }
  },

  updateTransform() {
    this.inner.style.transform = `translate(${this.offsetX}px, ${this.offsetY}px) scale(${this.zoom})`;
    this.render();
    if (typeof ConnectionSystem !== 'undefined' && ConnectionSystem.updateSvgTransform) {
      ConnectionSystem.updateSvgTransform();
    }
  },

  screenToWorld(sx, sy) {
    return {
      x: (sx - this.offsetX) / this.zoom,
      y: (sy - this.offsetY) / this.zoom
    };
  },

  worldToScreen(wx, wy) {
    return {
      x: wx * this.zoom + this.offsetX,
      y: wy * this.zoom + this.offsetY
    };
  },

  focusOnPoint(worldX, worldY) {
    const rect = this.container.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    this.offsetX = cx - worldX * this.zoom;
    this.offsetY = cy - worldY * this.zoom;
    this.updateTransform();
  },

  bindEvents() {
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => this.resize(), 100);
    });

    this.container.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.offsetY -= e.deltaY * 0.8;
      this.updateTransform();
      CardSystem.syncPositions();
    }, { passive: false });

    this.container.addEventListener('mousedown', (e) => {
      if (e.button !== 0 && e.button !== 1) return;
      if (e.target.closest('.card') || e.target.closest('.anchor') || e.target.closest('.color-picker-popup') || e.target.closest('.checklist-tool')) return;
      e.preventDefault();
      this.isPanning = true;
      this.panStartX = e.clientX;
      this.panStartY = e.clientY;
      this.panOffsetStartX = this.offsetX;
      this.panOffsetStartY = this.offsetY;
      this.container.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isPanning) return;
      const dx = e.clientX - this.panStartX;
      const dy = e.clientY - this.panStartY;
      this.offsetX = this.panOffsetStartX + dx;
      this.offsetY = this.panOffsetStartY + dy;
      this.updateTransform();
      CardSystem.syncPositions();
    });

    window.addEventListener('mouseup', () => {
      if (this.isPanning) {
        this.isPanning = false;
        this.container.style.cursor = 'grab';
      }
    });

    this.container.addEventListener('dblclick', (e) => {
      if (e.target.closest('.card') || e.target.closest('.anchor') || e.target.closest('.checklist-tool')) return;
      const rect = this.container.getBoundingClientRect();
      const world = this.screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
      CardSystem.createCard(world.x, world.y);
    });
  }
};
