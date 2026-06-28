const LINE_STYLES = {
  solid: { strokeDasharray: '', markerStart: '', markerEnd: '' },
  dashed: { strokeDasharray: '8 6', markerStart: '', markerEnd: '' },
  dotted: { strokeDasharray: '3 4', markerStart: '', markerEnd: '' },
  'A->B': { strokeDasharray: '', markerStart: '', markerEnd: 'url(#arrowhead)' },
  'B->A': { strokeDasharray: '', markerStart: 'url(#arrowhead-rev)', markerEnd: '' },
  none: { strokeDasharray: '', markerStart: '', markerEnd: '' },
  breathing: { strokeDasharray: '', markerStart: '', markerEnd: '' }
};

const STYLE_LABELS = {
  solid: '实线',
  dashed: '虚线',
  dotted: '点线',
  'A->B': 'A -> B',
  'B->A': 'B -> A',
  none: '无箭头',
  breathing: '呼吸光效'
};

const STYLE_ORDER = ['solid', 'dashed', 'dotted', 'A->B', 'B->A', 'none', 'breathing'];
const FLOW_STYLES = ['A->B', 'B->A'];

const ConnectionSystem = {
  svg: null,
  defs: null,
  activeConnId: null,
  popupVisible: false,

  init() {
    this._pathEval = null;
    this.createSVG();
    this.renderAll();
  },

  createSVG() {
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('class', 'connections-svg');
    this.svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible;z-index:3';
    CanvasSystem.container.appendChild(this.svg);

    this.defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    this.svg.appendChild(this.defs);
    this.createMarkers();
    this.updateSvgTransform();
  },

  createMarkers() {
    this.defs.innerHTML = `
      <marker id="arrowhead" markerWidth="10" markerHeight="7"
              refX="9" refY="3.5" orient="auto" markerUnits="strokeWidth">
        <polygon points="0 0, 10 3.5, 0 7" fill="var(--line-color)"/>
      </marker>
      <marker id="arrowhead-rev" markerWidth="10" markerHeight="7"
              refX="1" refY="3.5" orient="auto" markerUnits="strokeWidth">
        <polygon points="10 0, 0 3.5, 10 7" fill="var(--line-color)"/>
      </marker>
      <filter id="glow">
        <feGaussianBlur stdDeviation="2" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    `;
  },

  updateSvgTransform() {
    if (!this.svg) return;
    this.svg.setAttribute('transform', `translate(${CanvasSystem.offsetX}, ${CanvasSystem.offsetY}) scale(${CanvasSystem.zoom})`);
  },

  renderAll() {
    this.updateSvgTransform();
    this.svg.querySelectorAll('.conn-group').forEach(g => g.remove());
    const conns = Store.getConnections();
    conns.forEach(c => this.renderConnection(c));
  },

  renderConnection(conn, animate) {
    const d = this.computePath(conn);
    if (!d) return;

    const isFlow = FLOW_STYLES.includes(conn.style);
    const style = LINE_STYLES[conn.style] || LINE_STYLES.solid;

    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', 'conn-group');
    group.dataset.connId = conn.id;

    const hit = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    hit.setAttribute('class', 'conn-hit');
    hit.setAttribute('d', d);
    hit.setAttribute('stroke', 'transparent');
    hit.setAttribute('stroke-width', '14');
    hit.setAttribute('fill', 'none');
    hit.setAttribute('pointer-events', 'stroke');
    hit.style.cursor = 'pointer';

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    line.setAttribute('class', 'conn-line');
    line.setAttribute('d', d);
    line.setAttribute('stroke', 'var(--line-color)');
    line.setAttribute('stroke-width', '1.8');
    line.setAttribute('fill', 'none');
    line.setAttribute('stroke-linecap', 'round');
    line.setAttribute('stroke-linejoin', 'round');
    line.setAttribute('pointer-events', 'none');
    if (style.strokeDasharray) line.setAttribute('stroke-dasharray', style.strokeDasharray);

    if (style.markerStart) line.setAttribute('marker-start', style.markerStart);
    if (style.markerEnd) line.setAttribute('marker-end', style.markerEnd);

    group.appendChild(hit);
    group.appendChild(line);

    if (isFlow) {
      const flow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      flow.setAttribute('class', 'conn-flow');
      flow.setAttribute('d', d);
      flow.setAttribute('stroke', 'var(--primary)');
      flow.setAttribute('stroke-width', '2');
      flow.setAttribute('fill', 'none');
      flow.setAttribute('stroke-linecap', 'round');
      flow.setAttribute('stroke-dasharray', '4 20');
      flow.setAttribute('pointer-events', 'none');
      flow.setAttribute('opacity', '0.7');
      if (conn.style === 'B->A') {
        flow.style.animationDirection = 'reverse';
      }
      group.appendChild(flow);
    }

    if (conn.style === 'breathing') {
      const glow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      glow.setAttribute('class', 'conn-breath-glow');
      glow.setAttribute('d', d);
      glow.setAttribute('stroke', 'var(--primary-light)');
      glow.setAttribute('stroke-width', '5');
      glow.setAttribute('fill', 'none');
      glow.setAttribute('stroke-linecap', 'round');
      glow.setAttribute('pointer-events', 'none');
      glow.setAttribute('opacity', '0.2');
      group.insertBefore(glow, line);
      line.setAttribute('stroke', 'var(--primary)');
    }

    if (animate) {
      const grow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      grow.setAttribute('class', 'conn-grow');
      grow.setAttribute('d', d);
      grow.setAttribute('stroke', 'var(--primary)');
      grow.setAttribute('stroke-width', '1.8');
      grow.setAttribute('fill', 'none');
      grow.setAttribute('stroke-linecap', 'round');
      grow.setAttribute('stroke-dasharray', d.length + ' ' + d.length);
      grow.setAttribute('stroke-dashoffset', d.length);
      grow.setAttribute('pointer-events', 'none');
      grow.setAttribute('opacity', '0.5');
      group.appendChild(grow);

      requestAnimationFrame(() => {
        grow.style.transition = 'stroke-dashoffset 0.4s ease';
        grow.setAttribute('stroke-dashoffset', '0');
        grow.addEventListener('transitionend', () => {
          grow.remove();
        }, { once: true });
      });

      group.querySelector('.conn-line').setAttribute('opacity', '0');
      group.querySelector('.conn-hit').setAttribute('opacity', '0');
      if (isFlow) group.querySelector('.conn-flow').setAttribute('opacity', '0');

      setTimeout(() => {
        group.querySelector('.conn-line').setAttribute('opacity', '1');
        group.querySelector('.conn-hit').setAttribute('opacity', '1');
        if (isFlow) group.querySelector('.conn-flow').setAttribute('opacity', '0.7');
        group.style.transition = 'opacity 0.3s ease';
      }, 100);
    }

    this.svg.appendChild(group);
    this.bindConnectionEvents(group, conn);
  },

  bindConnectionEvents(group, conn) {
    const hit = group.querySelector('.conn-hit');
    hit.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showStylePopup(conn.id, e);
    });
    hit.addEventListener('mouseenter', () => {
      group.querySelector('.conn-line').setAttribute('stroke', 'var(--line-hover)');
      group.querySelector('.conn-line').setAttribute('stroke-width', '3');
    });
    hit.addEventListener('mouseleave', () => {
      if (this.activeConnId !== conn.id) {
        group.querySelector('.conn-line').setAttribute('stroke', 'var(--line-color)');
        group.querySelector('.conn-line').setAttribute('stroke-width', '1.8');
      }
    });
  },

  computePath(conn) {
    const fromPos = this.getAnchorWorldPos(conn.fromCardId, conn.fromAnchor);
    const toPos = this.getAnchorWorldPos(conn.toCardId, conn.toAnchor);
    if (!fromPos || !toPos) return null;

    const fromDir = this.anchorDirection(conn.fromAnchor);
    const toDir = this.anchorDirection(conn.toAnchor);

    const dx = toPos.x - fromPos.x;
    const dy = toPos.y - fromPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) return null;

    const obstacles = this.getObstacleCards([conn.fromCardId, conn.toCardId]);

    const directD = this.buildDirectBezier(fromPos, fromDir, toPos, toDir, dist);
    if (!obstacles || obstacles.length === 0 || !this.pathHitsObstacles(directD, obstacles)) {
      return directD;
    }

    return this.buildAvoidancePath(fromPos, fromDir, toPos, toDir, dist, obstacles);
  },

  anchorDirection(dir) {
    switch (dir) {
      case 'top': return { x: 0, y: -1 };
      case 'bottom': return { x: 0, y: 1 };
      case 'left': return { x: -1, y: 0 };
      case 'right': return { x: 1, y: 0 };
      default: return { x: 0, y: -1 };
    }
  },

  getAnchorWorldPos(cardId, dir) {
    const card = Store.getCard(cardId);
    if (card) {
      const el = document.querySelector(`.card[data-id="${cardId}"]`);
      const h = el ? el.offsetHeight : CARD_MIN_HEIGHT;
      const cx = card.x + card.width / 2;
      const cy = card.y + h / 2;
      switch (dir) {
        case 'top': return { x: cx, y: card.y };
        case 'bottom': return { x: cx, y: card.y + h };
        case 'left': return { x: card.x, y: cy };
        case 'right': return { x: card.x + card.width, y: cy };
        default: return { x: cx, y: cy };
      }
    }
    if (typeof ToolSystem !== 'undefined' && ToolSystem.isToolCardId(cardId)) {
      const toolId = ToolSystem.getToolId(cardId);
      const tool = Store.getChecklistTools().find(t => t.id === toolId);
      if (!tool) return null;
      const el = document.querySelector(`.checklist-tool[data-id="${toolId}"]`);
      const w = tool.width || 270;
      const h = el ? el.offsetHeight : 120;
      const cx = tool.x + w / 2;
      const cy = tool.y + h / 2;
      switch (dir) {
        case 'top': return { x: cx, y: tool.y };
        case 'bottom': return { x: cx, y: tool.y + h };
        case 'left': return { x: tool.x, y: cy };
        case 'right': return { x: tool.x + w, y: cy };
        default: return { x: cx, y: cy };
      }
    }
    return null;
  },

  buildDirectBezier(fromPos, fromDir, toPos, toDir, dist) {
    const ext = Math.max(80, dist * 0.4);
    const c1x = fromPos.x + fromDir.x * ext;
    const c1y = fromPos.y + fromDir.y * ext;
    const c2x = toPos.x + toDir.x * ext;
    const c2y = toPos.y + toDir.y * ext;
    return `M ${fromPos.x} ${fromPos.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${toPos.x} ${toPos.y}`;
  },

  pathHitsObstacles(pathD, obstacles) {
    if (!this._pathEval) {
      this._pathEval = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    }
    this._pathEval.setAttribute('d', pathD);
    const len = this._pathEval.getTotalLength();
    if (!len || len < 1) return false;
    const samplePoints = Math.min(40, Math.ceil(len / 20));
    for (let i = 0; i <= samplePoints; i++) {
      const pt = this._pathEval.getPointAtLength(i / samplePoints * len);
      for (const obs of obstacles) {
        const margin = 15;
        if (pt.x >= obs.x - margin && pt.x <= obs.x + obs.w + margin &&
            pt.y >= obs.y - margin && pt.y <= obs.y + obs.h + margin) {
          return true;
        }
      }
    }
    return false;
  },

  buildAvoidancePath(fromPos, fromDir, toPos, toDir, dist, obstacles) {
    const nx = -(toPos.y - fromPos.y) / dist;
    const ny = (toPos.x - fromPos.x) / dist;

    const mid1 = { x: fromPos.x + (toPos.x - fromPos.x) * 0.3, y: fromPos.y + (toPos.y - fromPos.y) * 0.3 };
    const mid2 = { x: fromPos.x + (toPos.x - fromPos.x) * 0.7, y: fromPos.y + (toPos.y - fromPos.y) * 0.7 };

    const offsets = [80, 130, 180, 250, 350];
    const signs = [1, -1];

    for (const offset of offsets) {
      for (const sign of signs) {
        const wp1 = { x: mid1.x + nx * offset * sign, y: mid1.y + ny * offset * sign };
        const wp2 = { x: mid2.x + nx * offset * sign, y: mid2.y + ny * offset * sign };
        const d = this.buildMultiBezier(fromPos, fromDir, wp1, wp2, toPos, toDir);
        if (!this.pathHitsObstacles(d, obstacles)) {
          return d;
        }
      }
    }
    return this.buildMultiBezier(fromPos, fromDir, { x: mid1.x + nx * 350, y: mid1.y + ny * 350 }, { x: mid2.x + nx * 350, y: mid2.y + ny * 350 }, toPos, toDir);
  },

  buildMultiBezier(fromPos, fromDir, wp1, wp2, toPos, toDir) {
    const ext1 = Math.max(60, this.dist(fromPos, wp1) * 0.35);
    const ext2 = Math.max(40, this.dist(wp1, wp2) * 0.25);
    const ext3 = Math.max(60, this.dist(wp2, toPos) * 0.35);

    const d1 = this.normalize(wp1.x - fromPos.x, wp1.y - fromPos.y);
    const d2 = this.normalize(wp2.x - wp1.x, wp2.y - wp1.y);
    const d3 = this.normalize(toPos.x - wp2.x, toPos.y - wp2.y);

    const c1x = fromPos.x + fromDir.x * ext1;
    const c1y = fromPos.y + fromDir.y * ext1;
    const c2x = wp1.x - d1.x * ext1;
    const c2y = wp1.y - d1.y * ext1;

    const c3x = wp1.x + d2.x * ext2;
    const c3y = wp1.y + d2.y * ext2;
    const c4x = wp2.x - d2.x * ext2;
    const c4y = wp2.y - d2.y * ext2;

    const c5x = wp2.x + d3.x * ext3;
    const c5y = wp2.y + d3.y * ext3;
    const c6x = toPos.x + toDir.x * ext3;
    const c6y = toPos.y + toDir.y * ext3;

    return `M ${fromPos.x} ${fromPos.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${wp1.x} ${wp1.y} C ${c3x} ${c3y}, ${c4x} ${c4y}, ${wp2.x} ${wp2.y} C ${c5x} ${c5y}, ${c6x} ${c6y}, ${toPos.x} ${toPos.y}`;
  },

  getObstacleCards(excludeIds) {
    const cards = Store.getCards();
    const obstacles = cards
      .filter(c => !excludeIds.includes(c.id))
      .map(c => {
        const el = document.querySelector(`.card[data-id="${c.id}"]`);
        const h = el ? el.offsetHeight : CARD_MIN_HEIGHT;
        return { x: c.x, y: c.y, w: c.width, h: h };
      });
    if (typeof ToolSystem !== 'undefined') {
      const tools = Store.getChecklistTools();
      tools.forEach(t => {
        const offsetId = ToolSystem.getCardId(t.id);
        if (!excludeIds.includes(offsetId)) {
          const el = document.querySelector(`.checklist-tool[data-id="${t.id}"]`);
          const h = el ? el.offsetHeight : 120;
          obstacles.push({ x: t.x, y: t.y, w: t.width || 270, h });
        }
      });
    }
    return obstacles;
  },

  updateConnectionsForCard(cardId) {
    const conns = Store.getConnections();
    conns.forEach(conn => {
      if (conn.fromCardId === cardId || conn.toCardId === cardId) {
        this.updateConnectionElement(conn);
      }
    });
  },

  updateConnectionElement(conn) {
    const group = this.svg.querySelector(`.conn-group[data-conn-id="${conn.id}"]`);
    if (!group) return;

    const d = this.computePath(conn);
    if (!d) return;

    const line = group.querySelector('.conn-line');
    const hit = group.querySelector('.conn-hit');
    const flow = group.querySelector('.conn-flow');
    const glow = group.querySelector('.conn-breath-glow');

    if (line) line.setAttribute('d', d);
    if (hit) hit.setAttribute('d', d);
    if (flow) flow.setAttribute('d', d);
    if (glow) glow.setAttribute('d', d);
  },

  showStylePopup(connId, event) {
    this.hideStylePopup();
    this.activeConnId = connId;
    const conn = Store.getConnections().find(c => c.id === connId);
    if (!conn) return;

    const group = this.svg.querySelector(`.conn-group[data-conn-id="${connId}"]`);
    if (group) {
      group.querySelector('.conn-line').setAttribute('stroke', 'var(--line-hover)');
      group.querySelector('.conn-line').setAttribute('stroke-width', '3');
    }

    const popup = document.createElement('div');
    popup.className = 'conn-style-popup';
    popup.dataset.connId = connId;

    const title = document.createElement('div');
    title.className = 'conn-popup-title';
    title.textContent = '线段样式';
    popup.appendChild(title);

    STYLE_ORDER.forEach(style => {
      const btn = document.createElement('button');
      btn.className = 'conn-style-btn' + (conn.style === style ? ' active' : '');
      btn.dataset.style = style;

      const indicator = document.createElement('span');
      indicator.className = 'conn-style-indicator conn-style-' + style.replace(/->/g, '-to-');
      btn.appendChild(indicator);

      const label = document.createElement('span');
      label.textContent = STYLE_LABELS[style];
      btn.appendChild(label);

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.setLineStyle(connId, style);
      });
      popup.appendChild(btn);
    });

    const divider = document.createElement('div');
    divider.className = 'conn-popup-divider';
    popup.appendChild(divider);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'conn-style-btn conn-delete-btn';
    deleteBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i> 删除连线';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      Store.deleteConnection(connId);
      this.removeConnectionElement(connId);
      this.hideStylePopup();
      CardSystem.updateDataInfo();
      App.updateDataInfo();
    });
    popup.appendChild(deleteBtn);

    const x = Math.min(event.clientX, window.innerWidth - 180);
    const y = Math.min(event.clientY, window.innerHeight - 320);
    popup.style.left = Math.max(8, x) + 'px';
    popup.style.top = Math.max(8, y) + 'px';

    document.body.appendChild(popup);
    this.popupVisible = true;

    const closeHandler = (e) => {
      if (!popup.contains(e.target)) {
        this.hideStylePopup();
        document.removeEventListener('mousedown', closeHandler);
      }
    };
    setTimeout(() => document.addEventListener('mousedown', closeHandler), 0);
  },

  hideStylePopup() {
    const popup = document.querySelector('.conn-style-popup');
    if (popup) popup.remove();
    this.popupVisible = false;

    if (this.activeConnId) {
      const group = this.svg.querySelector(`.conn-group[data-conn-id="${this.activeConnId}"]`);
      if (group) {
        group.querySelector('.conn-line').setAttribute('stroke', 'var(--line-color)');
        group.querySelector('.conn-line').setAttribute('stroke-width', '1.8');
      }
      this.activeConnId = null;
    }
  },

  setLineStyle(connId, style) {
    Store.getConnections().forEach(c => {
      if (c.id === connId) {
        c.style = style;
      }
    });
    const conn = Store.getConnections().find(c => c.id === connId);
    if (conn) {
      const group = this.svg.querySelector(`.conn-group[data-conn-id="${connId}"]`);
      if (group) group.remove();
      this.renderConnection(conn, false);
    }
    Store.save();
    this.hideStylePopup();
  },

  removeConnectionElement(connId) {
    const group = this.svg.querySelector(`.conn-group[data-conn-id="${connId}"]`);
    if (group) group.remove();
  },

  removeConnectionsForCard(cardId) {
    const conns = Store.getConnections().filter(c => c.fromCardId === cardId || c.toCardId === cardId);
    conns.forEach(c => this.removeConnectionElement(c.id));
  },

  dist(a, b) {
    return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
  },

  normalize(dx, dy) {
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.001) return { x: 0, y: 0 };
    return { x: dx / len, y: dy / len };
  }
};
