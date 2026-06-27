const PARTICLE_COUNT = 55;
const MAX_SPEED = 0.35;
const MIN_SIZE = 1.5;
const MAX_SIZE = 3;
const CONN_DIST = 130;
const REPULSE_RADIUS = 90;
const REPULSE_FORCE = 0.6;

const ParticleSystem = {
  canvas: null,
  ctx: null,
  particles: [],
  mouseX: -9999,
  mouseY: -9999,
  frameId: null,
  running: false,
  primaryColor: '#4bcfa0',

  init() {
    this.canvas = document.getElementById('particleCanvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.updateColor();
    this.resize();
    this.createParticles();
    this.bindEvents();
    this.start();
    this.canvas.classList.add('ready');
  },

  updateColor() {
    this.primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#4bcfa0';
  },

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  },

  createParticle(w, h) {
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * MAX_SPEED * 2,
      vy: (Math.random() - 0.5) * MAX_SPEED * 2,
      size: MIN_SIZE + Math.random() * (MAX_SIZE - MIN_SIZE),
      alpha: 0.25 + Math.random() * 0.35
    };
  },

  createParticles() {
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const count = isLight ? Math.floor(PARTICLE_COUNT * 0.4) : PARTICLE_COUNT;
    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push(this.createParticle(w, h));
    }
  },

  bindEvents() {
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        this.resize();
        this.createParticles();
      }, 200);
    });

    const container = this.canvas.parentElement;
    container.addEventListener('mousemove', (e) => {
      const rect = container.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;
    });

    container.addEventListener('mouseleave', () => {
      this.mouseX = -9999;
      this.mouseY = -9999;
    });
  },

  start() {
    if (this.running) return;
    this.running = true;
    this.loop();
  },

  stop() {
    this.running = false;
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  },

  loop() {
    if (!this.running) return;
    this.update();
    this.render();
    this.frameId = requestAnimationFrame(() => this.loop());
  },

  update() {
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);

    for (const p of this.particles) {
      p.vx += (Math.random() - 0.5) * 0.03;
      p.vy += (Math.random() - 0.5) * 0.03;
      p.vx *= 0.985;
      p.vy *= 0.985;

      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (speed > MAX_SPEED) {
        p.vx = (p.vx / speed) * MAX_SPEED;
        p.vy = (p.vy / speed) * MAX_SPEED;
      }

      const dx = p.x - this.mouseX;
      const dy = p.y - this.mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < REPULSE_RADIUS && dist > 1) {
        const force = (REPULSE_RADIUS - dist) / REPULSE_RADIUS * REPULSE_FORCE;
        p.vx += (dx / dist) * force;
        p.vy += (dy / dist) * force;
      }

      p.x += p.vx;
      p.y += p.vy;

      if (p.x < -20) p.x = w + 20;
      if (p.x > w + 20) p.x = -20;
      if (p.y < -20) p.y = h + 20;
      if (p.y > h + 20) p.y = -20;
    }
  },

  render() {
    const ctx = this.ctx;
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.width / dpr;
    const h = this.canvas.height / dpr;

    ctx.clearRect(0, 0, w, h);

    const rgb = this.hexToRgb(this.primaryColor);

    for (const p of this.particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${p.alpha})`;
      ctx.fill();
    }

    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const a = this.particles[i];
        const b = this.particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < CONN_DIST) {
          const alpha = (1 - dist / CONN_DIST) * 0.12;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
  },

  hexToRgb(hex) {
    const h = hex.replace('#', '');
    return {
      r: parseInt(h.substring(0, 2), 16) || 75,
      g: parseInt(h.substring(2, 4), 16) || 207,
      b: parseInt(h.substring(4, 6), 16) || 160
    };
  }
};
