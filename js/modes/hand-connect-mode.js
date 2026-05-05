window.GestureLab = window.GestureLab || {};

(() => {
  const { Utils } = window.GestureLab;
  const FINGERTIPS = [4, 8, 12, 16, 20];
  const HAND_CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 4],
    [0, 5], [5, 6], [6, 7], [7, 8],
    [5, 9], [9, 10], [10, 11], [11, 12],
    [9, 13], [13, 14], [14, 15], [15, 16],
    [13, 17], [17, 18], [18, 19], [19, 20],
    [0, 17],
  ];

  class HandConnectMode {
    constructor(shared) {
      this.shared = shared;
      this.name = 'Hand Connect';
      this.tip = 'Lift both hands to create glowing links between fingertips.';
      this.pulse = 0;
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

    update() {
      this.pulse += 0.08;
    }

    drawHandSkeleton(ctx, points, color) {
      HAND_CONNECTIONS.forEach(([a, b]) => {
        const ptA = points[a];
        const ptB = points[b];
        if (!ptA || !ptB) return;

        ctx.save();
        ctx.strokeStyle = this.hexToRgba(color, 0.34);
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10;
        ctx.shadowColor = color;
        ctx.beginPath();
        ctx.moveTo(ptA.x, ptA.y);
        ctx.lineTo(ptB.x, ptB.y);
        ctx.stroke();
        ctx.restore();
      });

      points.forEach((pt, index) => {
        const radius = FINGERTIPS.includes(index) ? 7 + Math.sin(this.pulse + index) * 1.3 : 3.6;
        Utils.drawDot(ctx, pt.x, pt.y, radius, color, FINGERTIPS.includes(index) ? 18 : 8);
      });
    }

    drawBridge(ctx, a, b, colorA, colorB, indexOffset) {
      const gradient = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
      gradient.addColorStop(0, this.hexToRgba(colorA, 0.10));
      gradient.addColorStop(0.5, this.hexToRgba('#ffffff', 0.95));
      gradient.addColorStop(1, this.hexToRgba(colorB, 0.10));

      ctx.save();
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 10;
      ctx.shadowBlur = 14;
      ctx.shadowColor = colorA;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();

      ctx.strokeStyle = this.hexToRgba('#ffffff', 0.8);
      ctx.lineWidth = 1.8;
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.restore();

      const travel = (Math.sin(this.pulse * 1.6 + indexOffset) + 1) * 0.5;
      const particle = {
        x: a.x + (b.x - a.x) * travel,
        y: a.y + (b.y - a.y) * travel,
      };
      Utils.drawDot(ctx, particle.x, particle.y, 3.8, '#ffffff', 14);
    }

    draw(ctx, frameState) {
      const left = frameState.results.leftHandLandmarks;
      const right = frameState.results.rightHandLandmarks;
      const accent = this.getAccent();
      const accent2 = '#4dabf7';

      ctx.save();
      const wash = ctx.createRadialGradient(
        frameState.width * 0.5,
        frameState.height * 0.5,
        80,
        frameState.width * 0.5,
        frameState.height * 0.5,
        frameState.width * 0.7
      );
      wash.addColorStop(0, 'rgba(255,255,255,0.02)');
      wash.addColorStop(1, 'rgba(3, 8, 18, 0.28)');
      ctx.fillStyle = wash;
      ctx.fillRect(0, 0, frameState.width, frameState.height);
      ctx.restore();

      if (!left && !right) {
        ctx.save();
        ctx.fillStyle = 'rgba(5, 17, 29, 0.72)';
        ctx.fillRect(24, frameState.height - 88, 360, 56);
        Utils.drawLabel(ctx, 'Hand Connect', 38, frameState.height - 58);
        Utils.drawLabel(ctx, 'Show one or two hands to generate energy links', 38, frameState.height - 36);
        ctx.restore();
        return;
      }

      const mappedLeft = left ? left.map((pt) => Utils.mapNormalized(pt, frameState.width, frameState.height)) : [];
      const mappedRight = right ? right.map((pt) => Utils.mapNormalized(pt, frameState.width, frameState.height)) : [];

      if (mappedLeft.length) this.drawHandSkeleton(ctx, mappedLeft, accent);
      if (mappedRight.length) this.drawHandSkeleton(ctx, mappedRight, accent2);

      if (mappedLeft.length && mappedRight.length) {
        FINGERTIPS.forEach((tipIndex, i) => {
          const a = mappedLeft[tipIndex];
          const b = mappedRight[tipIndex];
          this.drawBridge(ctx, a, b, accent, accent2, i * 0.55);

          const mid = Utils.midpoint(a, b);
          ctx.save();
          ctx.strokeStyle = this.hexToRgba('#ffffff', 0.16);
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(mid.x, mid.y, 10 + Math.sin(this.pulse + i) * 2.4, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        });
      }

      [mappedLeft, mappedRight].filter((group) => group.length).forEach((group, idx) => {
        const center = group.reduce(
          (acc, pt) => ({ x: acc.x + pt.x / group.length, y: acc.y + pt.y / group.length }),
          { x: 0, y: 0 }
        );
        const ringColor = idx === 0 ? accent : accent2;

        ctx.save();
        ctx.strokeStyle = this.hexToRgba(ringColor, 0.24);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(center.x, center.y, 32 + Math.sin(this.pulse + idx) * 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        Utils.drawDot(ctx, center.x, center.y, 4.5, '#ffffff', 10);
      });

      ctx.save();
      ctx.fillStyle = 'rgba(5, 17, 29, 0.72)';
      ctx.fillRect(24, frameState.height - 88, 360, 56);
      Utils.drawLabel(ctx, 'Hand Connect', 38, frameState.height - 58);
      Utils.drawLabel(ctx, 'Fingertips pulse and bridge energy across both hands', 38, frameState.height - 36);
      ctx.restore();
    }

    clear() {}
    destroy() {}
  }

  window.GestureLab.HandConnectMode = HandConnectMode;
})();
