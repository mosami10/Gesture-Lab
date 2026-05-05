window.GestureLab = window.GestureLab || {};

(() => {
  const { Utils } = window.GestureLab;

  class AirDrawMode {
    constructor(shared) {
      this.shared = shared;
      this.name = 'Air Drawer';
      this.tip = 'Pinch thumb + index finger to draw glowing trails. Hit Clear to wipe it.';
      this.strokes = [];
      this.currentStroke = null;
      this.isDrawing = false;
      this.time = 0;
      this.maxStrokes = 18;
    }

    getAccent() {
      const styles = getComputedStyle(document.documentElement);
      return styles.getPropertyValue('--accent').trim() || '#63e6be';
    }

    hexToRgba(hex, alpha = 1) {
      const clean = hex.replace('#', '');
      const num = parseInt(clean, 16);
      const r = num >> 16;
      const g = (num >> 8) & 255;
      const b = num & 255;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    update(frameState) {
      this.time += 0.06;
      const hand = frameState.results.rightHandLandmarks || frameState.results.leftHandLandmarks;

      if (!hand) {
        this.currentStroke = null;
        this.isDrawing = false;
        return;
      }

      const indexTip = Utils.mapNormalized(hand[8], frameState.width, frameState.height);
      const thumbTip = Utils.mapNormalized(hand[4], frameState.width, frameState.height);
      const pinchDistance = Utils.dist(indexTip, thumbTip);
      const pinchThreshold = 42;

      if (pinchDistance < pinchThreshold) {
        if (!this.isDrawing) {
          this.currentStroke = {
            color: this.getAccent(),
            points: [],
          };
          this.strokes.push(this.currentStroke);
          if (this.strokes.length > this.maxStrokes) this.strokes.shift();
        }
        this.isDrawing = true;

        const points = this.currentStroke.points;
        const last = points[points.length - 1];
        if (!last || Utils.dist(last, indexTip) > 2.5) {
          points.push({ x: indexTip.x, y: indexTip.y, t: performance.now() });
        }
        if (points.length > 220) points.shift();
      } else {
        this.isDrawing = false;
        this.currentStroke = null;
      }
    }

    drawSmoothStroke(ctx, points) {
      if (points.length < 2) return;

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);

      for (let i = 1; i < points.length - 1; i += 1) {
        const midX = (points[i].x + points[i + 1].x) * 0.5;
        const midY = (points[i].y + points[i + 1].y) * 0.5;
        ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
      }

      const last = points[points.length - 1];
      ctx.lineTo(last.x, last.y);
      ctx.stroke();
    }

    draw(ctx, frameState) {
      const hand = frameState.results.rightHandLandmarks || frameState.results.leftHandLandmarks;
      const accent = this.getAccent();
      const accentSoft = this.hexToRgba(accent, 0.16);
      const accentGlow = this.hexToRgba(accent, 0.95);

      ctx.save();
      const fade = ctx.createLinearGradient(0, 0, 0, frameState.height);
      fade.addColorStop(0, 'rgba(3, 10, 20, 0.10)');
      fade.addColorStop(1, 'rgba(3, 10, 20, 0.20)');
      ctx.fillStyle = fade;
      ctx.fillRect(0, 0, frameState.width, frameState.height);
      ctx.restore();

      this.strokes.forEach((stroke) => {
        const points = stroke.points;
        if (points.length < 2) return;

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.strokeStyle = this.hexToRgba(stroke.color, 0.16);
        ctx.lineWidth = 22;
        ctx.shadowBlur = 26;
        ctx.shadowColor = stroke.color;
        this.drawSmoothStroke(ctx, points);

        ctx.strokeStyle = this.hexToRgba(stroke.color, 0.35);
        ctx.lineWidth = 11;
        ctx.shadowBlur = 16;
        ctx.shadowColor = stroke.color;
        this.drawSmoothStroke(ctx, points);

        ctx.strokeStyle = this.hexToRgba('#ffffff', 0.9);
        ctx.lineWidth = 3.25;
        ctx.shadowBlur = 0;
        this.drawSmoothStroke(ctx, points);
        ctx.restore();

        const head = points[points.length - 1];
        if (head) {
          Utils.drawDot(ctx, head.x, head.y, 5 + Math.sin(this.time * 2.3) * 1.1, '#ffffff', 18);
          Utils.drawDot(ctx, head.x, head.y, 8, stroke.color, 18);
        }
      });

      if (hand) {
        const indexTip = Utils.mapNormalized(hand[8], frameState.width, frameState.height);
        const thumbTip = Utils.mapNormalized(hand[4], frameState.width, frameState.height);
        const pinchDistance = Utils.dist(indexTip, thumbTip);
        const active = pinchDistance < 42;

        for (let i = 0; i < 4; i += 1) {
          const angle = this.time * 2.2 + i * (Math.PI / 2);
          const orbitRadius = active ? 18 : 11;
          const ox = indexTip.x + Math.cos(angle) * orbitRadius;
          const oy = indexTip.y + Math.sin(angle) * orbitRadius;
          Utils.drawDot(ctx, ox, oy, 2.2, accent, 8);
        }

        Utils.drawDot(ctx, indexTip.x, indexTip.y, 10, active ? accent : '#ffffff', 28);
        Utils.drawDot(ctx, thumbTip.x, thumbTip.y, 8, active ? accent : '#9cc8ff', 18);
        Utils.drawLine(ctx, indexTip, thumbTip, active ? accentGlow : 'rgba(255,255,255,0.28)', 2, 1);

        if (active) {
          ctx.save();
          ctx.strokeStyle = accentSoft;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(indexTip.x, indexTip.y, 22 + Math.sin(this.time * 3.2) * 3, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }

      ctx.save();
      ctx.fillStyle = 'rgba(5, 17, 29, 0.70)';
      ctx.fillRect(24, frameState.height - 88, 320, 56);
      Utils.drawLabel(ctx, 'Air Drawer', 38, frameState.height - 58);
      Utils.drawLabel(ctx, 'Pinch to paint neon trails in the air', 38, frameState.height - 36);
      ctx.restore();
    }

    clear() {
      this.strokes = [];
      this.currentStroke = null;
    }

    destroy() {}
  }

  window.GestureLab.AirDrawMode = AirDrawMode;
})();
