window.GestureLab = window.GestureLab || {};

(() => {
  const { Utils } = window.GestureLab;
  const TIPS = [4, 8, 12, 16, 20];
  const HAND_CONN = [
    [0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],
    [5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],
    [13,17],[17,18],[18,19],[19,20],[0,17],
  ];

  class HandConnectMode {
    constructor(shared) {
      this.shared = shared;
      this.name = 'Hand Connect';
      this.tip = 'Lift both hands — fingertips create glowing energy bridges.';
      this.pulse = 0;
      this.particles = [];
      this.maxParticles = 60;
    }

    spawnParticle(a, b, colorA, colorB) {
      if (this.particles.length >= this.maxParticles) this.particles.shift();
      const t = Math.random();
      this.particles.push({
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        vx: (Math.random() - 0.5) * 2.5,
        vy: (Math.random() - 0.5) * 2.5 - 1,
        life: 1,
        decay: 0.018 + Math.random() * 0.02,
        size: 1.5 + Math.random() * 3,
        color: Math.random() > 0.5 ? colorA : colorB,
      });
    }

    update(frameState) {
      this.pulse += 0.07;
      const left = frameState.results.leftHandLandmarks;
      const right = frameState.results.rightHandLandmarks;

      if (left && right) {
        const mappedL = left.map(p => Utils.mapNormalized(p, frameState.width, frameState.height));
        const mappedR = right.map(p => Utils.mapNormalized(p, frameState.width, frameState.height));
        const accent = Utils.getAccent();
        if (Math.random() < 0.5) {
          const tipIdx = TIPS[Math.floor(Math.random() * TIPS.length)];
          this.spawnParticle(mappedL[tipIdx], mappedR[tipIdx], accent, '#4dabf7');
        }
      }

      for (const p of this.particles) {
        p.x += p.vx; p.y += p.vy; p.vy -= 0.05; p.life -= p.decay;
      }
      this.particles = this.particles.filter(p => p.life > 0);
    }

    drawHand(ctx, landmarks, color, w, h) {
      const pts = landmarks.map(p => Utils.mapNormalized(p, w, h));
      ctx.save();
      ctx.strokeStyle = Utils.hexToRgba(color, 0.4); ctx.lineWidth = 2;
      ctx.shadowBlur = 12; ctx.shadowColor = color;
      for (const [a, b] of HAND_CONN) {
        if (!pts[a] || !pts[b]) continue;
        ctx.beginPath(); ctx.moveTo(pts[a].x, pts[a].y); ctx.lineTo(pts[b].x, pts[b].y); ctx.stroke();
      }
      ctx.restore();
      for (const [i, pt] of pts.entries()) {
        const r = TIPS.includes(i) ? 7 + Math.sin(this.pulse + i) * 1.5 : 3.5;
        Utils.drawDot(ctx, pt.x, pt.y, r, color, TIPS.includes(i) ? 20 : 6);
      }
    }

    draw(ctx, frameState) {
      const left = frameState.results.leftHandLandmarks;
      const right = frameState.results.rightHandLandmarks;
      const accent = Utils.getAccent();
      const accent2 = '#4dabf7';

      // floating particles
      for (const p of this.particles) {
        ctx.save(); ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color; ctx.shadowBlur = 10; ctx.shadowColor = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }

      if (!left && !right) {
        ctx.save();
        ctx.fillStyle = 'rgba(5,12,20,0.75)';
        ctx.beginPath(); ctx.roundRect(20, frameState.height - 74, 360, 54, 12); ctx.fill();
        Utils.drawLabel(ctx, 'HAND CONNECT', 36, frameState.height - 50, 11, accent);
        Utils.drawLabel(ctx, 'Show both hands to generate energy links', 36, frameState.height - 32, 11, 'rgba(180,210,200,0.8)');
        ctx.restore(); return;
      }

      const mappedL = left ? left.map(p => Utils.mapNormalized(p, frameState.width, frameState.height)) : [];
      const mappedR = right ? right.map(p => Utils.mapNormalized(p, frameState.width, frameState.height)) : [];

      if (mappedL.length) this.drawHand(ctx, left, accent, frameState.width, frameState.height);
      if (mappedR.length) this.drawHand(ctx, right, accent2, frameState.width, frameState.height);

      if (mappedL.length && mappedR.length) {
        TIPS.forEach((tipIdx, i) => {
          const a = mappedL[tipIdx], b = mappedR[tipIdx];
          const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
          grad.addColorStop(0, Utils.hexToRgba(accent, 0.1));
          grad.addColorStop(0.5, 'rgba(255,255,255,0.9)');
          grad.addColorStop(1, Utils.hexToRgba(accent2, 0.1));

          ctx.save();
          ctx.strokeStyle = grad; ctx.lineWidth = 8 + Math.sin(this.pulse + i) * 2;
          ctx.shadowBlur = 18; ctx.shadowColor = accent;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.5; ctx.shadowBlur = 0;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          ctx.restore();

          // travel bead
          const travel = (Math.sin(this.pulse * 1.8 + i * 0.7) + 1) * 0.5;
          Utils.drawDot(ctx, a.x + (b.x - a.x) * travel, a.y + (b.y - a.y) * travel, 4, '#fff', 16);
        });
      }

      ctx.save();
      ctx.fillStyle = 'rgba(5,12,20,0.75)';
      ctx.beginPath(); ctx.roundRect(20, frameState.height - 74, 360, 54, 12); ctx.fill();
      Utils.drawLabel(ctx, 'HAND CONNECT', 36, frameState.height - 50, 11, accent);
      Utils.drawLabel(ctx, 'Energy bridges between matching fingertips', 36, frameState.height - 32, 11, 'rgba(180,210,200,0.8)');
      ctx.restore();
    }

    clear() { this.particles = []; }
    destroy() {}
  }

  window.GestureLab.HandConnectMode = HandConnectMode;
})();
