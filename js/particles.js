/* ======================================
   Particle Effect
   Ported from ECSC original website
   Yellow particles + red mouse connections
   ====================================== */

class ParticleSystem {
  constructor(canvasEl) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext("2d");
    this.width = 0;
    this.height = 0;
    this.particles = [];
    this.mouse = { x: null, y: null };
    this.animId = null;
  }

  init() {
    this._resize();
    window.addEventListener("resize", () => this._resize());

    document.addEventListener("mousemove", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;
    });

    document.addEventListener("mouseout", () => {
      this.mouse.x = null;
      this.mouse.y = null;
    });

    // Create particles
    const count = Math.floor((this.width * this.height) / 18000);
    for (let i = 0; i < count; i++) {
      this.particles.push(new Particle(this.width, this.height));
    }

    this._animate();
  }

  _resize() {
    const parent = this.canvas.parentElement;
    this.width = parent.clientWidth;
    this.height = parent.clientHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  _animate() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.update(this.width, this.height);
      p.draw(this.ctx);

      // Connect to mouse (red)
      if (this.mouse.x != null) {
        const dx = this.mouse.x - p.x;
        const dy = this.mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150) {
          this.ctx.beginPath();
          this.ctx.strokeStyle = `rgba(190, 61, 42, ${0.8 * (1 - dist / 150)})`;
          this.ctx.lineWidth = 1.5;
          this.ctx.moveTo(p.x, p.y);
          this.ctx.lineTo(this.mouse.x, this.mouse.y);
          this.ctx.stroke();
        }
      }

      // Connect to nearby particles (yellow)
      for (let j = i + 1; j < this.particles.length; j++) {
        const p2 = this.particles[j];
        const dx = p.x - p2.x;
        const dy = p.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100) {
          this.ctx.beginPath();
          this.ctx.strokeStyle = `rgba(245, 196, 94, ${0.2 * (1 - dist / 100)})`;
          this.ctx.lineWidth = 1;
          this.ctx.moveTo(p.x, p.y);
          this.ctx.lineTo(p2.x, p2.y);
          this.ctx.stroke();
        }
      }
    }

    this.animId = requestAnimationFrame(() => this._animate());
  }

  destroy() {
    if (this.animId) cancelAnimationFrame(this.animId);
  }
}

class Particle {
  constructor(w, h) {
    this.x = Math.random() * w;
    this.y = Math.random() * h;
    this.vx = (Math.random() - 0.5) * 1.2;
    this.vy = (Math.random() - 0.5) * 1.2;
    this.radius = Math.random() * 2 + 0.5;
  }

  update(w, h) {
    this.x += this.vx;
    this.y += this.vy;
    if (this.x < 0 || this.x > w) this.vx = -this.vx;
    if (this.y < 0 || this.y > h) this.vy = -this.vy;
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(245, 196, 94, 0.35)";
    ctx.fill();
  }
}
