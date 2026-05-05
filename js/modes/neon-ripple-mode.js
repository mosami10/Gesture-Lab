window.GestureLab = window.GestureLab || {};

(() => {
  const { Utils } = window.GestureLab;
  const TIPS = [4, 8, 12, 16, 20];

  class NeonRippleMode {
    constructor(shared) {
      this.shared = shared;
      this.name = 'Neon Ripple';
      this.tip = 'Move hands through space — fingertips emit expanding neon rings.';
      this.time = 0;
      this.ripples = [];
      this.trails = [];
      this.maxRipples = 80;
      this.prevTips = {};
    }

    spawnRipple(x, y, color, speed = 1) {
      if (this.ripples.length >= this.maxRipples) this.ripples.shift();
      this.ripples.push({
        x, y, r: 0, maxR: 80 + Math.random() * 60, life: 1,
        decay: 0.012 + Math.random() * 0.01,
        color, speed: 2.5 + Math.random() * 1.5 * speed,
        lineWidth: 1.5 + Math.random() * 2,
      });
    }

    update(frameState) {
      this.time += 0.04;
      const accent = Utils.getAccent();
      const hands = [
        frameState.results.leftHandLandmarks,
        frameState.results.rightHandLandmarks
      ].filter(Boolean);

      const colors = [accent, '#ff6b9d'];

      for (const [hi, hand] of hands.entries()) {
        for (const [ti, tipIdx] of TIPS.entries()) {
          const pt = Utils.mapNormalized(hand[tipIdx], frameState.width, frameState.height);
          const key = `${hi}_${ti}`;
          const prev = this.prevTips[key];
          if (prev) {
            const speed = Utils.dist(pt, prev);
            if (speed > 4) {
              const col = this.colorMix(colors[hi % 2], '#ffffff', Math.min(speed / 40, 0.4));
              this.spawnRipple(pt.x, pt.y, col, speed / 20);
              // trail
              this.trails.push({ x: pt.x, y: pt.y, life: 1, size: 3 + speed * 0.1, color: colors[hi % 2] });
            }
          }
          this.prevTips[key] = { x: pt.x, y: pt.y };
        }
      }

      // idle ambient ripples when no hands
      if (!hands.length && Math.random() < 0.04) {
        this.spawnRipple(
          Utils.random(100, frameState.width - 100),
          Utils.random(100, frameState.height - 100),
          accent, 0.3
        );
      }

      for (const r of this.ripples) { r.r += r.speed; r.life -= r.decay; }
      for (const t of this.trails) { t.life -= 0.04; }
      this.ripples = this.ripples.filter(r => r.life > 0 && r.r < r.maxR);
      this.trails = this.trails.filter(t => t.life > 0);
    }

    colorMix(hex, hex2, t) {
      const a = this.hexToRgb(hex), b = this.hexToRgb(hex2);
      return `rgb(${Math.round(a[0]*(1-t)+b[0]*t)},${Math.round(a[1]*(1-t)+b[1]*t)},${Math.round(a[2]*(1-t)+b[2]*t)})`;
    }
    hexToRgb(hex) {
      const n = parseInt(hex.replace('#',''), 16);
      return [n>>16, (n>>8)&255, n&255];
    }

    draw(ctx, frameState) {
      const { width: w, height: h } = frameState;
      const accent = Utils.getAccent();

      // trails
      for (const t of this.trails) {
        ctx.save(); ctx.globalAlpha = t.life * 0.7;
        ctx.fillStyle = t.color; ctx.shadowBlur = 14; ctx.shadowColor = t.color;
        ctx.beginPath(); ctx.arc(t.x, t.y, t.size * t.life, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }

      // ripples
      for (const r of this.ripples) {
        const progress = r.r / r.maxR;
        ctx.save();
        ctx.globalAlpha = r.life * (1 - progress * 0.5);
        ctx.strokeStyle = r.color;
        ctx.lineWidth = r.lineWidth * (1 - progress * 0.6);
        ctx.shadowBlur = 18 * r.life; ctx.shadowColor = r.color;
        ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2); ctx.stroke();
        // second ring
        if (r.r > 20) {
          ctx.globalAlpha *= 0.4;
          ctx.lineWidth *= 0.5;
          ctx.beginPath(); ctx.arc(r.x, r.y, r.r * 0.6, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.restore();
      }

      // hand dots
      [frameState.results.leftHandLandmarks, frameState.results.rightHandLandmarks].filter(Boolean).forEach((hand, hi) => {
        const col = hi === 0 ? accent : '#ff6b9d';
        for (const tipIdx of TIPS) {
          const pt = Utils.mapNormalized(hand[tipIdx], w, h);
          Utils.drawDot(ctx, pt.x, pt.y, 6, col, 20);
        }
      });

      ctx.save();
      ctx.fillStyle = 'rgba(5,12,20,0.75)';
      ctx.beginPath(); ctx.roundRect(20, h - 74, 340, 54, 12); ctx.fill();
      Utils.drawLabel(ctx, 'NEON RIPPLE', 36, h - 50, 11, accent);
      Utils.drawLabel(ctx, 'Move fast = bigger rings  •  Slow = gentle pulses', 36, h - 32, 11, 'rgba(180,210,200,0.8)');
      ctx.restore();
    }

    clear() { this.ripples = []; this.trails = []; this.prevTips = {}; }
    destroy() {}
  }

  window.GestureLab.NeonRippleMode = NeonRippleMode;
})();
