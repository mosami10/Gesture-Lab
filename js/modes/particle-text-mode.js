window.GestureLab = window.GestureLab || {};

(() => {
  const { Utils } = window.GestureLab;

  class ParticleTextMode {
    constructor(shared) {
      this.shared = shared;
      this.name = 'Particle Text';
      this.tip = 'Move your hands through the text field to disturb the particles.';
      this.words = ['GESTURE', 'LAB'];
      this.wordIndex = 0;
      this.time = 0;
      this.width = 0;
      this.height = 0;
      this.particles = [];
      this.textCanvas = document.createElement('canvas');
      this.textCanvas.width = 900;
      this.textCanvas.height = 380;
      this.textCtx = this.textCanvas.getContext('2d', { willReadFrequently: true });
    }

    getAccent() {
      return getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#63e6be';
    }

    hexToRgba(hex, alpha = 1) {
      const clean = hex.replace('#', '');
      const num = parseInt(clean, 16);
      const r = num >> 16;
      const g = (num >> 8) & 255;
      const b = num & 255;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    buildParticles(frameState) {
      this.width = frameState.width;
      this.height = frameState.height;
      const word = this.words[this.wordIndex];

      this.textCtx.clearRect(0, 0, this.textCanvas.width, this.textCanvas.height);
      this.textCtx.fillStyle = '#ffffff';
      this.textCtx.textAlign = 'center';
      this.textCtx.textBaseline = 'middle';
      this.textCtx.font = `800 ${word.length > 7 ? 170 : 190}px Inter, sans-serif`;
      this.textCtx.fillText(word, this.textCanvas.width / 2, this.textCanvas.height / 2);

      const img = this.textCtx.getImageData(0, 0, this.textCanvas.width, this.textCanvas.height).data;
      const particles = [];
      const step = 5;
      const scaleX = Math.min(frameState.width * 0.76, 940) / this.textCanvas.width;
      const scaleY = Math.min(frameState.height * 0.34, 260) / this.textCanvas.height;
      const offsetX = frameState.width / 2 - (this.textCanvas.width * scaleX) / 2;
      const offsetY = frameState.height / 2 - (this.textCanvas.height * scaleY) / 2;

      for (let y = 0; y < this.textCanvas.height; y += step) {
        for (let x = 0; x < this.textCanvas.width; x += step) {
          const idx = (y * this.textCanvas.width + x) * 4 + 3;
          if (img[idx] > 140) {
            const hx = offsetX + x * scaleX;
            const hy = offsetY + y * scaleY;

            particles.push({
              x: hx + (Math.random() - 0.5) * 180,
              y: hy + (Math.random() - 0.5) * 180,
              homeX: hx,
              homeY: hy,
              vx: 0,
              vy: 0,
              size: 1.6 + Math.random() * 1.8,
              drift: Math.random() * Math.PI * 2,
              alpha: 0.55 + Math.random() * 0.45,
            });
          }
        }
      }

      this.particles = particles;
    }

    getInfluencePoints(frameState) {
      const pts = [];
      [frameState.results.leftHandLandmarks, frameState.results.rightHandLandmarks].filter(Boolean).forEach((hand) => {
        [4, 8, 12, 16, 20].forEach((idx) => {
          pts.push(Utils.mapNormalized(hand[idx], frameState.width, frameState.height));
        });
      });
      return pts;
    }

    update(frameState) {
      this.time += 0.03;

      if (!this.particles.length || this.width !== frameState.width || this.height !== frameState.height) {
        this.buildParticles(frameState);
      }

      const accent = this.getAccent();
      const influencePoints = this.getInfluencePoints(frameState);

      this.particles.forEach((particle, index) => {
        let ax = (particle.homeX - particle.x) * 0.012;
        let ay = (particle.homeY - particle.y) * 0.012;

        influencePoints.forEach((pt) => {
          const dx = particle.x - pt.x;
          const dy = particle.y - pt.y;
          const dist = Math.hypot(dx, dy) || 1;
          if (dist < 110) {
            const force = (110 - dist) / 110;
            ax += (dx / dist) * force * 1.8;
            ay += (dy / dist) * force * 1.8;
          }
        });

        const float = Math.sin(this.time * 1.8 + particle.drift + index * 0.002) * 0.08;
        ax += float * 0.2;
        ay += Math.cos(this.time * 1.6 + particle.drift) * 0.03;

        particle.vx = (particle.vx + ax) * 0.92;
        particle.vy = (particle.vy + ay) * 0.92;
        particle.x += particle.vx;
        particle.y += particle.vy;
      });
    }

    draw(ctx, frameState) {
      const accent = this.getAccent();

      ctx.save();
      const vignette = ctx.createRadialGradient(
        frameState.width * 0.5,
        frameState.height * 0.52,
        60,
        frameState.width * 0.5,
        frameState.height * 0.52,
        frameState.width * 0.72
      );
      vignette.addColorStop(0, 'rgba(4, 16, 24, 0.16)');
      vignette.addColorStop(1, 'rgba(4, 16, 24, 0.42)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, frameState.width, frameState.height);
      ctx.restore();

      const influencePoints = this.getInfluencePoints(frameState);
      influencePoints.forEach((pt, index) => {
        Utils.drawDot(ctx, pt.x, pt.y, index % 5 === 1 ? 8 : 5, accent, 20);
      });

      this.particles.forEach((particle, index) => {
        const flicker = 0.75 + Math.sin(this.time * 3 + particle.drift + index * 0.004) * 0.18;
        ctx.save();
        ctx.globalAlpha = particle.alpha * flicker;
        ctx.fillStyle = index % 9 === 0 ? '#ffffff' : accent;
        ctx.shadowBlur = index % 9 === 0 ? 8 : 14;
        ctx.shadowColor = index % 9 === 0 ? '#ffffff' : accent;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      if (this.particles.length) {
        const boundsLeft = Math.min(...this.particles.map((p) => p.homeX));
        const boundsRight = Math.max(...this.particles.map((p) => p.homeX));
        const boundsTop = Math.min(...this.particles.map((p) => p.homeY));
        const boundsBottom = Math.max(...this.particles.map((p) => p.homeY));

        ctx.save();
        ctx.strokeStyle = this.hexToRgba(accent, 0.18);
        ctx.lineWidth = 1.5;
        ctx.strokeRect(boundsLeft - 18, boundsTop - 18, (boundsRight - boundsLeft) + 36, (boundsBottom - boundsTop) + 36);
        ctx.restore();
      }

      ctx.save();
      ctx.fillStyle = 'rgba(5, 17, 29, 0.74)';
      ctx.fillRect(24, frameState.height - 88, 360, 56);
      Utils.drawLabel(ctx, 'Particle Text', 38, frameState.height - 58);
      Utils.drawLabel(ctx, 'Move your hands through the particles to scatter the word', 38, frameState.height - 36);
      ctx.restore();
    }

    clear() {
      this.wordIndex = (this.wordIndex + 1) % this.words.length;
      this.particles = [];
      this.width = 0;
      this.height = 0;

      const app = this.shared?.app;
      if (app?.canvas) {
        this.buildParticles({
          width: app.canvas.width,
          height: app.canvas.height,
          results: app.tracker?.results || {},
        });
      }
    }

    destroy() {}
  }

  window.GestureLab.ParticleTextMode = ParticleTextMode;
})();
