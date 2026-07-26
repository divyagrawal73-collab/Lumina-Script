// js/particles.js - Floating particle effects

const Particles = {
  canvas: null,
  ctx: null,
  particles: [],
  maxParticles: 30,
  animationId: null,
  isRunning: false,

  init() {
    // Skip if reduced motion preferred
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    this.canvas = document.getElementById('particleCanvas');
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Scroll reactivity
    window.addEventListener('scroll', () => {
      if (window.scrollY > 100 && !this.isRunning) {
        this.start();
      } else if (window.scrollY <= 100 && this.isRunning) {
        this.stop();
      }
    });

    // Start if already scrolled
    if (window.scrollY > 100) this.start();
  },

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  },

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.animate();
  },

  stop() {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  },

  spawn() {
    if (this.particles.length >= this.maxParticles) return;

    const colors = [
      getComputedStyle(document.documentElement).getPropertyValue('--primary').trim(),
      'rgba(139, 92, 246, 0.3)',
      'rgba(236, 72, 153, 0.3)',
      'rgba(14, 165, 233, 0.3)',
    ];

    this.particles.push({
      x: Math.random() * this.canvas.width,
      y: this.canvas.height + 10,
      size: Math.random() * 4 + 1,
      speedY: Math.random() * 0.5 + 0.2,
      speedX: (Math.random() - 0.5) * 0.3,
      color: colors[Math.floor(Math.random() * colors.length)],
      opacity: Math.random() * 0.5 + 0.2,
      life: 0,
      maxLife: Math.random() * 200 + 100,
    });
  },

  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.y -= p.speedY;
      p.x += p.speedX;
      p.life++;
      p.opacity = Math.max(0, p.opacity - 0.002);

      if (p.life > p.maxLife || p.y < -10 || p.opacity <= 0) {
        this.particles.splice(i, 1);
      }
    }
  },

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.particles.forEach(p => {
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.opacity;
      this.ctx.fill();
    });
    this.ctx.globalAlpha = 1;
  },

  animate() {
    if (!this.isRunning) return;

    // Spawn new particles occasionally
    if (Math.random() < 0.1) this.spawn();

    this.update();
    this.draw();
    this.animationId = requestAnimationFrame(() => this.animate());
  }
};

document.addEventListener('DOMContentLoaded', () => Particles.init());
