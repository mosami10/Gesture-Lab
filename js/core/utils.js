window.GestureLab = window.GestureLab || {};

(() => {
  const Utils = {
    clamp(value, min, max) { return Math.max(min, Math.min(max, value)); },
    lerp(start, end, t) { return start + (end - start) * t; },
    dist(a, b) { const dx = a.x - b.x; const dy = a.y - b.y; return Math.hypot(dx, dy); },
    mapNormalized(point, width, height, mirrored = true) {
      return { x: mirrored ? (1 - point.x) * width : point.x * width, y: point.y * height, z: point.z ?? 0 };
    },
    midpoint(a, b) { return { x: (a.x + b.x) * 0.5, y: (a.y + b.y) * 0.5 }; },
    hexToRgba(hex, alpha = 1) {
      const clean = hex.replace('#', '');
      const num = parseInt(clean, 16);
      return `rgba(${num >> 16}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
    },
    getAccent() {
      return getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#00ffe0';
    },
    drawDot(ctx, x, y, radius, color, glow = 0) {
      ctx.save();
      ctx.fillStyle = color;
      if (glow > 0) { ctx.shadowBlur = glow; ctx.shadowColor = color; }
      ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    },
    drawLine(ctx, a, b, color, width = 1, alpha = 1) {
      ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = width;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.restore();
    },
    drawLabel(ctx, text, x, y, size = 12, color = 'rgba(220,255,245,0.9)') {
      ctx.save(); ctx.font = `${size}px "Space Grotesk", sans-serif`; ctx.fillStyle = color; ctx.fillText(text, x, y); ctx.restore();
    },
    easeOut(t) { return 1 - Math.pow(1 - t, 3); },
    random(min, max) { return min + Math.random() * (max - min); },
    randomInt(min, max) { return Math.floor(Utils.random(min, max)); },
  };

  window.GestureLab.Utils = Utils;
})();
