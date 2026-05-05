window.GestureLab = window.GestureLab || {};

(() => {
  const { Utils } = window.GestureLab;
  const HAND_CONN = [
    [0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],
    [5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],
    [13,17],[17,18],[18,19],[19,20],[0,17],
  ];
  const TIPS = [4, 8, 12, 16, 20];

  class MirrorMode {
    constructor(shared) {
      this.shared = shared;
      this.name = 'Mirror Symmetry';
      this.tip = 'Move one hand — the other side mirrors it with kaleidoscope symmetry.';
      this.time = 0;
      this.trail = [];
      this.symmetry = 2; // 2, 4, 6, 8
      this.symmetries = [2, 4, 6, 8];
      this.symIndex = 0;
    }

    update(frameState) {
      this.time += 0.04;
      const hand = frameState.results.rightHandLandmarks || frameState.results.leftHandLandmarks;
      if (!hand) return;
      const indexTip = Utils.mapNormalized(hand[8], frameState.width, frameState.height);
      this.trail.push({ x: indexTip.x, y: indexTip.y, life: 1 });
      if (this.trail.length > 80) this.trail.shift();
      for (const t of this.trail) t.life -= 0.015;
      this.trail = this.trail.filter(t => t.life > 0);
    }

    drawMirrored(ctx, fn, cx, cy, sym) {
      for (let i = 0; i < sym; i++) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate((Math.PI * 2 * i) / sym);
        fn(ctx);
        // mirror flip
        ctx.scale(-1, 1);
        fn(ctx);
        ctx.restore();
      }
    }

    drawHandInLocal(ctx, landmarks, fw, fh, cx, cy, color) {
      if (!landmarks) return;
      const pts = landmarks.map(p => {
        const m = Utils.mapNormalized(p, fw, fh);
        return { x: m.x - cx, y: m.y - cy };
      });

      ctx.save();
      ctx.strokeStyle = Utils.hexToRgba(color, 0.7); ctx.lineWidth = 2;
      ctx.shadowBlur = 14; ctx.shadowColor = color;
      for (const [a, b] of HAND_CONN) {
        if (!pts[a] || !pts[b]) continue;
        ctx.beginPath(); ctx.moveTo(pts[a].x, pts[a].y); ctx.lineTo(pts[b].x, pts[b].y); ctx.stroke();
      }
      ctx.restore();
      for (const [i, pt] of pts.entries()) {
        const r = TIPS.includes(i) ? 7 : 3;
        Utils.drawDot(ctx, pt.x, pt.y, r, color, TIPS.includes(i) ? 18 : 6);
      }
    }

    draw(ctx, frameState) {
      const { width: w, height: h } = frameState;
      const cx = w / 2, cy = h / 2;
      const accent = Utils.getAccent();
      const sym = this.symmetries[this.symIndex];

      // symmetry dividers
      ctx.save();
      ctx.strokeStyle = Utils.hexToRgba(accent, 0.12); ctx.lineWidth = 1;
      ctx.setLineDash([6, 10]);
      for (let i = 0; i < sym * 2; i++) {
        const angle = (Math.PI * i) / sym;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(angle) * Math.max(w, h), cy + Math.sin(angle) * Math.max(w, h));
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.restore();

      // center dot
      Utils.drawDot(ctx, cx, cy, 4, accent, 16);

      const hand = frameState.results.rightHandLandmarks || frameState.results.leftHandLandmarks;

      if (hand) {
        const color = accent;
        this.drawMirrored(ctx, (dc) => {
          this.drawHandInLocal(dc, hand, w, h, cx, cy, color);
        }, cx, cy, sym);
      }

      // trail mirrored
      if (this.trail.length > 1) {
        this.drawMirrored(ctx, (dc) => {
          for (let i = 1; i < this.trail.length; i++) {
            const a = this.trail[i - 1], b = this.trail[i];
            dc.save(); dc.globalAlpha = b.life * 0.6;
            dc.strokeStyle = accent; dc.lineWidth = 3 * b.life;
            dc.shadowBlur = 10; dc.shadowColor = accent;
            dc.beginPath();
            dc.moveTo(a.x - cx, a.y - cy);
            dc.lineTo(b.x - cx, b.y - cy);
            dc.stroke();
            dc.restore();
          }
        }, cx, cy, sym);
      }

      // symmetry counter top
      ctx.save();
      ctx.fillStyle = 'rgba(5,12,20,0.78)';
      ctx.beginPath(); ctx.roundRect(w / 2 - 70, 14, 140, 38, 10); ctx.fill();
      Utils.drawLabel(ctx, `✦ ${sym}-WAY SYMMETRY`, w / 2 - 55, 38, 11, accent);
      ctx.restore();

      ctx.save();
      ctx.fillStyle = 'rgba(5,12,20,0.75)';
      ctx.beginPath(); ctx.roundRect(20, h - 74, 400, 54, 12); ctx.fill();
      Utils.drawLabel(ctx, 'MIRROR SYMMETRY', 36, h - 50, 11, accent);
      Utils.drawLabel(ctx, 'Clear = cycle symmetry modes (2/4/6/8-way)', 36, h - 32, 11, 'rgba(180,210,200,0.8)');
      ctx.restore();
    }

    clear() {
      this.symIndex = (this.symIndex + 1) % this.symmetries.length;
      this.trail = [];
    }
    destroy() {}
  }

  window.GestureLab.MirrorMode = MirrorMode;
})();
