window.GestureLab = window.GestureLab || {};

(() => {
  const Utils = {
    clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    },
    lerp(start, end, t) {
      return start + (end - start) * t;
    },
    dist(a, b) {
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      return Math.hypot(dx, dy);
    },
    mapNormalized(point, width, height, mirrored = true) {
      return {
        x: mirrored ? (1 - point.x) * width : point.x * width,
        y: point.y * height,
        z: point.z ?? 0,
      };
    },
    midpoint(a, b) {
      return {
        x: (a.x + b.x) * 0.5,
        y: (a.y + b.y) * 0.5,
      };
    },
    drawDot(ctx, x, y, radius, color, glow = 0) {
      ctx.save();
      ctx.fillStyle = color;
      if (glow > 0) {
        ctx.shadowBlur = glow;
        ctx.shadowColor = color;
      }
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    },
    drawLine(ctx, a, b, color, width = 1, alpha = 1) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.restore();
    },
    drawLabel(ctx, text, x, y) {
      ctx.save();
      ctx.font = '12px Inter, sans-serif';
      ctx.fillStyle = 'rgba(233, 248, 255, 0.95)';
      ctx.fillText(text, x, y);
      ctx.restore();
    },
  };

  window.GestureLab.Utils = Utils;
})();
