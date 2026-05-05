window.GestureLab = window.GestureLab || {};

(() => {
  const { Utils } = window.GestureLab;

  class AirDrawMode {
    constructor(shared) {
      this.shared = shared;
      this.name = 'Air Drawer';
      this.tip = 'Pinch thumb + index to draw. Spread to stop. Index alone = erase.';
      this.strokes = [];
      this.currentStroke = null;
      this.isDrawing = false;
      this.time = 0;
      this.maxStrokes = 30;
      this.brushSize = 6;
      this.palette = ['#00ffe0','#ff6b9d','#ffd43b','#4dabf7','#c77dff','#ff6b6b','#69db7c'];
      this.colorIndex = 0;
      this.drawCanvas = null;
      this.drawCtx = null;
    }

    init() {
      // persistent draw canvas for proper trail persistence
      this.drawCanvas = document.createElement('canvas');
      this.drawCanvas.width = window.innerWidth;
      this.drawCanvas.height = window.innerHeight;
      this.drawCtx = this.drawCanvas.getContext('2d');
    }

    getCurrentColor() {
      const accent = Utils.getAccent();
      return this.palette[this.colorIndex] || accent;
    }

    update(frameState) {
      this.time += 0.05;
      const hand = frameState.results.rightHandLandmarks || frameState.results.leftHandLandmarks;
      if (!hand) { this.currentStroke = null; this.isDrawing = false; return; }

      const indexTip = Utils.mapNormalized(hand[8], frameState.width, frameState.height);
      const thumbTip = Utils.mapNormalized(hand[4], frameState.width, frameState.height);
      const middleTip = Utils.mapNormalized(hand[12], frameState.width, frameState.height);
      const pinchDist = Utils.dist(indexTip, thumbTip);
      const eraseDist = Utils.dist(indexTip, middleTip);

      // eraser: index + middle pinch
      if (eraseDist < 40) {
        if (this.drawCtx) {
          this.drawCtx.save();
          this.drawCtx.globalCompositeOperation = 'destination-out';
          this.drawCtx.beginPath();
          this.drawCtx.arc(indexTip.x, indexTip.y, 30, 0, Math.PI * 2);
          this.drawCtx.fill();
          this.drawCtx.restore();
        }
        this.isDrawing = false; this.currentStroke = null;
        return;
      }

      if (pinchDist < 45) {
        if (!this.isDrawing) {
          this.colorIndex = (this.colorIndex + 1) % this.palette.length;
          this.currentStroke = { color: this.getCurrentColor(), points: [] };
          this.strokes.push(this.currentStroke);
          if (this.strokes.length > this.maxStrokes) this.strokes.shift();
        }
        this.isDrawing = true;
        const pts = this.currentStroke.points;
        const last = pts[pts.length - 1];
        if (!last || Utils.dist(last, indexTip) > 2) {
          pts.push({ x: indexTip.x, y: indexTip.y, t: performance.now() });
        }
        if (pts.length > 300) pts.shift();

        // paint onto persistent canvas
        if (this.drawCtx && pts.length >= 2) {
          const p1 = pts[pts.length - 2], p2 = pts[pts.length - 1];
          const color = this.currentStroke.color;
          const dc = this.drawCtx;
          dc.save();
          dc.lineCap = 'round'; dc.lineJoin = 'round';
          dc.strokeStyle = Utils.hexToRgba(color, 0.14);
          dc.lineWidth = this.brushSize * 3.5;
          dc.shadowBlur = 20; dc.shadowColor = color;
          dc.beginPath(); dc.moveTo(p1.x, p1.y); dc.lineTo(p2.x, p2.y); dc.stroke();
          dc.strokeStyle = Utils.hexToRgba(color, 0.45);
          dc.lineWidth = this.brushSize * 1.2;
          dc.shadowBlur = 10;
          dc.beginPath(); dc.moveTo(p1.x, p1.y); dc.lineTo(p2.x, p2.y); dc.stroke();
          dc.strokeStyle = 'rgba(255,255,255,0.85)';
          dc.lineWidth = this.brushSize * 0.4;
          dc.shadowBlur = 0;
          dc.beginPath(); dc.moveTo(p1.x, p1.y); dc.lineTo(p2.x, p2.y); dc.stroke();
          dc.restore();
        }
      } else {
        this.isDrawing = false; this.currentStroke = null;
      }
    }

    draw(ctx, frameState) {
      const hand = frameState.results.rightHandLandmarks || frameState.results.leftHandLandmarks;
      const accent = this.getCurrentColor();

      // blit persistent draw canvas
      if (this.drawCanvas) ctx.drawImage(this.drawCanvas, 0, 0);

      if (hand) {
        const indexTip = Utils.mapNormalized(hand[8], frameState.width, frameState.height);
        const thumbTip = Utils.mapNormalized(hand[4], frameState.width, frameState.height);
        const middleTip = Utils.mapNormalized(hand[12], frameState.width, frameState.height);
        const pinchDist = Utils.dist(indexTip, thumbTip);
        const eraseDist = Utils.dist(indexTip, middleTip);
        const active = pinchDist < 45;
        const erasing = eraseDist < 40;

        if (erasing) {
          // eraser cursor
          ctx.save();
          ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(indexTip.x, indexTip.y, 30, 0, Math.PI * 2); ctx.stroke();
          Utils.drawLabel(ctx, 'ERASER', indexTip.x - 20, indexTip.y - 36, 10, 'rgba(255,255,255,0.7)');
          ctx.restore();
        } else {
          // orbiting dots around cursor
          for (let i = 0; i < 4; i++) {
            const angle = this.time * 2.5 + i * (Math.PI / 2);
            const r = active ? 22 : 13;
            Utils.drawDot(ctx, indexTip.x + Math.cos(angle) * r, indexTip.y + Math.sin(angle) * r, 2.5, accent, 8);
          }
          Utils.drawDot(ctx, indexTip.x, indexTip.y, active ? 12 : 8, accent, 30);
          Utils.drawDot(ctx, thumbTip.x, thumbTip.y, 7, active ? accent : 'rgba(255,255,255,0.4)', 12);
          Utils.drawLine(ctx, indexTip, thumbTip, active ? accent : 'rgba(255,255,255,0.2)', 1.5, 0.8);

          // pinch ring
          if (active) {
            ctx.save(); ctx.strokeStyle = Utils.hexToRgba(accent, 0.3); ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(indexTip.x, indexTip.y, 26 + Math.sin(this.time * 4) * 3, 0, Math.PI * 2); ctx.stroke();
            ctx.restore();
          }
        }
      }

      // color picker strip
      const sw = 22, pad = 6, startX = 20, startY = 20;
      this.palette.forEach((col, i) => {
        ctx.save();
        ctx.fillStyle = col;
        if (i === this.colorIndex) { ctx.shadowBlur = 14; ctx.shadowColor = col; }
        ctx.beginPath(); ctx.arc(startX + i * (sw + pad), startY, sw / 2, 0, Math.PI * 2); ctx.fill();
        if (i === this.colorIndex) {
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(startX + i * (sw + pad), startY, sw / 2 + 3, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.restore();
      });

      // HUD
      ctx.save();
      ctx.fillStyle = 'rgba(5,12,20,0.75)';
      ctx.beginPath(); ctx.roundRect(20, frameState.height - 74, 320, 54, 12); ctx.fill();
      Utils.drawLabel(ctx, 'AIR DRAWER', 36, frameState.height - 50, 11, accent);
      Utils.drawLabel(ctx, 'Pinch = draw  •  Middle+Index = erase', 36, frameState.height - 32, 11, 'rgba(180,210,200,0.8)');
      ctx.restore();
    }

    clear() {
      this.strokes = []; this.currentStroke = null;
      if (this.drawCtx) this.drawCtx.clearRect(0, 0, this.drawCanvas.width, this.drawCanvas.height);
    }

    destroy() { this.drawCanvas = null; this.drawCtx = null; }
  }

  window.GestureLab.AirDrawMode = AirDrawMode;
})();
