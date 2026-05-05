window.GestureLab = window.GestureLab || {};

(() => {
  const { Utils } = window.GestureLab;
  const TIPS = [4, 8, 12, 16, 20];

  class GravitySandboxMode {
    constructor(shared) {
      this.shared = shared;
      this.name = 'Gravity Sandbox';
      this.tip = 'Particles fall with gravity — hands attract or repel them.';
      this.time = 0;
      this.particles = [];
      this.maxP = 300;
      this.mode = 0; // 0=repel, 1=attract, 2=vortex
      this.modes = ['Repel', 'Attract', 'Vortex'];
      this.gravity = 0.18;
      this.lastSpawn = 0;
      this._initParticles();
    }

    _initParticles() {
      this.particles = [];
      for (let i = 0; i < this.maxP; i++) {
        this.particles.push(this._newParticle(
          Utils.random(0, window.innerWidth),
          Utils.random(0, window.innerHeight)
        ));
      }
    }

    _newParticle(x, y) {
      const accent = Utils.getAccent();
      const cols = [accent, '#ff6b9d', '#ffd43b', '#4dabf7', '#c77dff'];
      return {
        x, y,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 2,
        size: 1.5 + Math.random() * 3.5,
        color: cols[Math.floor(Math.random() * cols.length)],
        life: 1,
        decay: 0.002 + Math.random() * 0.003,
        trail: [],
      };
    }

    update(frameState) {
      this.time += 0.04;
      const w = frameState.width, h = frameState.height;

      // spawn new particles from top
      if (performance.now() - this.lastSpawn > 60 && this.particles.length < this.maxP) {
        this.particles.push(this._newParticle(Utils.random(0, w), -10));
        this.lastSpawn = performance.now();
      }

      // collect hand influence points
      const inf = [];
      [frameState.results.leftHandLandmarks, frameState.results.rightHandLandmarks].filter(Boolean).forEach(hand => {
        for (const tipIdx of TIPS) {
          inf.push(Utils.mapNormalized(hand[tipIdx], w, h));
        }
      });

      for (const p of this.particles) {
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 10) p.trail.shift();

        let ax = 0, ay = this.gravity;

        for (const pt of inf) {
          const dx = pt.x - p.x, dy = pt.y - p.y;
          const dist = Math.hypot(dx, dy) || 1;
          const radius = 120;
          if (dist < radius) {
            const f = ((radius - dist) / radius) * 3.5;
            if (this.mode === 0) { // repel
              ax -= (dx / dist) * f; ay -= (dy / dist) * f;
            } else if (this.mode === 1) { // attract
              ax += (dx / dist) * f * 0.8; ay += (dy / dist) * f * 0.8;
            } else { // vortex
              ax += (-dy / dist) * f * 0.9; ay += (dx / dist) * f * 0.9;
            }
          }
        }

        p.vx = (p.vx + ax) * 0.95;
        p.vy = (p.vy + ay) * 0.95;
        p.vx = Utils.clamp(p.vx, -15, 15);
        p.vy = Utils.clamp(p.vy, -15, 15);
        p.x += p.vx; p.y += p.vy;

        // walls: bounce
        if (p.x < 0) { p.x = 0; p.vx *= -0.5; }
        if (p.x > w) { p.x = w; p.vx *= -0.5; }
        if (p.y > h + 20) {
          p.x = Utils.random(0, w); p.y = -10;
          p.vx = (Math.random() - 0.5) * 3; p.vy = 0;
          p.trail = [];
        }
        p.life -= p.decay;
      }

      this.particles = this.particles.filter(p => p.life > 0);
      while (this.particles.length < this.maxP * 0.7) {
        this.particles.push(this._newParticle(Utils.random(0, w), -10));
      }
    }

    draw(ctx, frameState) {
      const { width: w, height: h } = frameState;
      const accent = Utils.getAccent();

      for (const p of this.particles) {
        // trail
        for (let i = 0; i < p.trail.length - 1; i++) {
          const a = p.trail[i], b = p.trail[i + 1];
          ctx.save(); ctx.globalAlpha = (i / p.trail.length) * p.life * 0.4;
          ctx.strokeStyle = p.color; ctx.lineWidth = p.size * 0.5;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          ctx.restore();
        }
        Utils.drawDot(ctx, p.x, p.y, p.size * p.life, p.color, 10 * p.life);
      }

      // hand influence circles
      [frameState.results.leftHandLandmarks, frameState.results.rightHandLandmarks].filter(Boolean).forEach((hand, hi) => {
        const col = hi === 0 ? accent : '#ff6b9d';
        for (const tipIdx of TIPS) {
          const pt = Utils.mapNormalized(hand[tipIdx], w, h);
          ctx.save();
          ctx.strokeStyle = Utils.hexToRgba(col, 0.2); ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(pt.x, pt.y, 120, 0, Math.PI * 2); ctx.stroke();
          ctx.restore();
          Utils.drawDot(ctx, pt.x, pt.y, 8, col, 22);
        }
      });

      // mode badge
      ctx.save();
      ctx.fillStyle = 'rgba(5,12,20,0.78)';
      ctx.beginPath(); ctx.roundRect(w - 120, 14, 104, 36, 10); ctx.fill();
      Utils.drawLabel(ctx, `⟳ ${this.modes[this.mode]}`, w - 108, 37, 11, accent);
      ctx.restore();

      ctx.save();
      ctx.fillStyle = 'rgba(5,12,20,0.75)';
      ctx.beginPath(); ctx.roundRect(20, h - 74, 400, 54, 12); ctx.fill();
      Utils.drawLabel(ctx, 'GRAVITY SANDBOX', 36, h - 50, 11, accent);
      Utils.drawLabel(ctx, 'Clear = switch mode (Repel / Attract / Vortex)', 36, h - 32, 11, 'rgba(180,210,200,0.8)');
      ctx.restore();
    }

    clear() {
      this.mode = (this.mode + 1) % this.modes.length;
    }
    destroy() {}
  }

  window.GestureLab.GravitySandboxMode = GravitySandboxMode;
})();
