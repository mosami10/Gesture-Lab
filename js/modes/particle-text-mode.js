window.GestureLab = window.GestureLab || {};

(() => {
  const { Utils } = window.GestureLab;

  class ParticleTextMode {
    constructor(shared) {
      this.shared = shared;
      this.name = 'Particle Text';
      this.tip = 'Move hands through the text to scatter it. Use panel to change the word.';
      this.words = ['GESTURE', 'LAB', 'HELLO', 'VIBES', 'TOUCH', 'FLOW', 'WAVE', 'SYNC'];
      this.wordIndex = 0;
      this.customWord = '';
      this.time = 0;
      this.particles = [];
      this.textCanvas = document.createElement('canvas');
      this.textCanvas.width = 900;
      this.textCanvas.height = 380;
      this.textCtx = this.textCanvas.getContext('2d', { willReadFrequently: true });
      this._width = 0;
      this._height = 0;
      this.colorMode = 0; // 0=accent, 1=rainbow, 2=fire, 3=ice
      this.colorModes = ['Accent', 'Rainbow', 'Fire', 'Ice'];
      this._boundsCache = null;
    }

    getCurrentWord() { return this.customWord || this.words[this.wordIndex]; }

    getParticleColor(index, x, y, w, h) {
      const accent = Utils.getAccent();
      switch (this.colorMode) {
        case 1: { // rainbow
          const hue = ((x / w) * 360 + this.time * 30) % 360;
          return `hsl(${hue}, 100%, 65%)`;
        }
        case 2: { // fire
          const t = (y / h);
          const r = Math.floor(255);
          const g = Math.floor(Utils.lerp(30, 200, 1 - t));
          const b = 0;
          return `rgb(${r},${g},${b})`;
        }
        case 3: { // ice
          const t = (x / w);
          return `hsl(${Utils.lerp(180, 220, t)}, 90%, ${Utils.lerp(60, 90, Math.sin(this.time + index * 0.01) * 0.5 + 0.5)}%)`;
        }
        default: return index % 7 === 0 ? '#ffffff' : accent;
      }
    }

    buildParticles(fw, fh) {
      this._width = fw; this._height = fh;
      const word = this.getCurrentWord();
      const tc = this.textCtx, canvas = this.textCanvas;
      tc.clearRect(0, 0, canvas.width, canvas.height);
      tc.fillStyle = '#ffffff';
      tc.textAlign = 'center'; tc.textBaseline = 'middle';
      const fontSize = word.length > 8 ? 120 : word.length > 5 ? 150 : 180;
      tc.font = `900 ${fontSize}px "Space Grotesk", "Arial Black", sans-serif`;
      tc.fillText(word, canvas.width / 2, canvas.height / 2);

      const img = tc.getImageData(0, 0, canvas.width, canvas.height).data;
      const particles = [];
      const step = 4; // FASTER: was 5, fewer particles = better perf
      const scaleX = Math.min(fw * 0.82, 1100) / canvas.width;
      const scaleY = Math.min(fh * 0.38, 280) / canvas.height;
      const offX = fw / 2 - (canvas.width * scaleX) / 2;
      const offY = fh / 2 - (canvas.height * scaleY) / 2;

      for (let y = 0; y < canvas.height; y += step) {
        for (let x = 0; x < canvas.width; x += step) {
          if (img[(y * canvas.width + x) * 4 + 3] > 140) {
            const hx = offX + x * scaleX, hy = offY + y * scaleY;
            particles.push({
              x: hx + (Math.random() - 0.5) * 200,
              y: hy + (Math.random() - 0.5) * 200,
              homeX: hx, homeY: hy,
              vx: 0, vy: 0,
              size: 1.4 + Math.random() * 2,
              drift: Math.random() * Math.PI * 2,
              alpha: 0.6 + Math.random() * 0.4,
              colorIndex: Math.floor(Math.random() * 7),
            });
          }
        }
      }
      this.particles = particles;
      this._boundsCache = null;
    }

    getBounds() {
      if (this._boundsCache || !this.particles.length) return this._boundsCache;
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const p of this.particles) {
        if (p.homeX < minX) minX = p.homeX; if (p.homeX > maxX) maxX = p.homeX;
        if (p.homeY < minY) minY = p.homeY; if (p.homeY > maxY) maxY = p.homeY;
      }
      this._boundsCache = { minX, maxX, minY, maxY };
      return this._boundsCache;
    }

    getInfluence(frameState) {
      const pts = [];
      [frameState.results.leftHandLandmarks, frameState.results.rightHandLandmarks].filter(Boolean).forEach(hand => {
        [4, 8, 12, 16, 20].forEach(idx => pts.push(Utils.mapNormalized(hand[idx], frameState.width, frameState.height)));
      });
      return pts;
    }

    update(frameState) {
      this.time += 0.025; // slower time = smoother feel
      if (!this.particles.length || this._width !== frameState.width || this._height !== frameState.height) {
        this.buildParticles(frameState.width, frameState.height);
      }

      const inf = this.getInfluence(frameState);
      const REPEL_RADIUS = 130;
      const REPEL_FORCE = 2.2;
      const SPRING = 0.014;
      const DAMPING = 0.90; // was 0.92 — snappier

      for (const p of this.particles) {
        let ax = (p.homeX - p.x) * SPRING;
        let ay = (p.homeY - p.y) * SPRING;

        for (const pt of inf) {
          const dx = p.x - pt.x, dy = p.y - pt.y;
          const d = Math.hypot(dx, dy) || 1;
          if (d < REPEL_RADIUS) {
            const f = ((REPEL_RADIUS - d) / REPEL_RADIUS) * REPEL_FORCE;
            ax += (dx / d) * f; ay += (dy / d) * f;
          }
        }

        const float = Math.sin(this.time * 1.5 + p.drift) * 0.1;
        ax += float * 0.15;
        ay += Math.cos(this.time * 1.2 + p.drift) * 0.025;

        p.vx = (p.vx + ax) * DAMPING;
        p.vy = (p.vy + ay) * DAMPING;
        p.x += p.vx; p.y += p.vy;
      }
    }

    draw(ctx, frameState) {
      const accent = Utils.getAccent();
      const inf = this.getInfluence(frameState);
      const w = frameState.width, h = frameState.height;

      // influence point cursors
      for (const pt of inf) Utils.drawDot(ctx, pt.x, pt.y, 7, accent, 22);

      // particles
      for (const [i, p] of this.particles.entries()) {
        const flicker = 0.72 + Math.sin(this.time * 2.8 + p.drift + i * 0.003) * 0.2;
        ctx.save();
        ctx.globalAlpha = p.alpha * flicker;
        const col = this.getParticleColor(i, p.homeX, p.homeY, w, h);
        ctx.fillStyle = col;
        ctx.shadowBlur = 12; ctx.shadowColor = col;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }

      // bounding box hint
      const b = this.getBounds();
      if (b) {
        ctx.save();
        ctx.strokeStyle = Utils.hexToRgba(accent, 0.15); ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 6]);
        ctx.strokeRect(b.minX - 20, b.minY - 20, (b.maxX - b.minX) + 40, (b.maxY - b.minY) + 40);
        ctx.restore();
      }

      // Color mode indicator top right
      ctx.save();
      ctx.fillStyle = 'rgba(5,12,20,0.75)';
      ctx.beginPath(); ctx.roundRect(w - 130, 16, 114, 36, 10); ctx.fill();
      Utils.drawLabel(ctx, `🎨 ${this.colorModes[this.colorMode]}`, w - 118, w > 500 ? 40 : 40, 11, accent);
      ctx.restore();

      // HUD
      ctx.save();
      ctx.fillStyle = 'rgba(5,12,20,0.75)';
      ctx.beginPath(); ctx.roundRect(20, h - 74, 380, 54, 12); ctx.fill();
      Utils.drawLabel(ctx, 'PARTICLE TEXT  •  ' + this.getCurrentWord(), 36, h - 50, 11, accent);
      Utils.drawLabel(ctx, 'Clear = next word  •  Change word in panel', 36, h - 32, 11, 'rgba(180,210,200,0.8)');
      ctx.restore();
    }

    setWord(word) {
      this.customWord = word.toUpperCase().trim().slice(0, 12);
      this.particles = []; this._width = 0; this._boundsCache = null;
    }

    nextWord() {
      this.customWord = '';
      this.wordIndex = (this.wordIndex + 1) % this.words.length;
      this.particles = []; this._width = 0; this._boundsCache = null;
    }

    nextColorMode() {
      this.colorMode = (this.colorMode + 1) % this.colorModes.length;
    }

    clear() { this.nextWord(); }
    destroy() {}
  }

  window.GestureLab.ParticleTextMode = ParticleTextMode;
})();
