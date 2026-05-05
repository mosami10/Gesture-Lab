window.GestureLab = window.GestureLab || {};

(() => {
  const { Utils } = window.GestureLab;
  const FINGERTIPS = [4, 8, 12, 16, 20];

  class HandConnectMode {
    constructor(shared) {
      this.shared = shared;
      this.name = 'Hand Connect';
      this.tip = 'Lift both hands to create glowing links between fingertips.';
      this.pulse = 0;
    }

    update() {
      this.pulse += 0.08;
    }

    draw(ctx, frameState) {
      const left = frameState.results.leftHandLandmarks;
      const right = frameState.results.rightHandLandmarks;

      ctx.save();
      ctx.fillStyle = 'rgba(3, 8, 18, 0.26)';
      ctx.fillRect(0, 0, frameState.width, frameState.height);
      ctx.restore();

      if (!left && !right) {
        ctx.save();
        ctx.fillStyle = 'rgba(5, 17, 29, 0.72)';
        ctx.fillRect(24, frameState.height - 80, 340, 48);
        Utils.drawLabel(ctx, 'Hand Connect', 38, frameState.height - 54);
        Utils.drawLabel(ctx, 'Show one or two hands to generate links', 38, frameState.height - 34);
        ctx.restore();
        return;
      }

      const mappedLeft = left ? left.map((pt) => Utils.mapNormalized(pt, frameState.width, frameState.height)) : [];
      const mappedRight = right ? right.map((pt) => Utils.mapNormalized(pt, frameState.width, frameState.height)) : [];

      const pulseSize = 1 + Math.sin(this.pulse) * 0.25;

      const drawHandHalo = (points, color) => {
        points.forEach((pt, index) => {
          const radius = FINGERTIPS.includes(index) ? 7 * pulseSize : 4;
          Utils.drawDot(ctx, pt.x, pt.y, radius, color, 18);
        });
      };

      drawHandHalo(mappedLeft, '#64f3ff');
      drawHandHalo(mappedRight, '#5ea1ff');

      if (mappedLeft.length && mappedRight.length) {
        FINGERTIPS.forEach((tipIndex, i) => {
          const a = mappedLeft[tipIndex];
          const b = mappedRight[tipIndex];
          const lineAlpha = 0.35 + i * 0.1;
          Utils.drawLine(ctx, a, b, 'rgba(100, 243, 255, 0.65)', 2 + i * 0.35, lineAlpha);
          const mid = Utils.midpoint(a, b);
          Utils.drawDot(ctx, mid.x, mid.y, 3 + Math.sin(this.pulse + i) * 1.2, '#ffffff', 10);
        });
      }

      const handClouds = [mappedLeft, mappedRight].filter((group) => group.length);
      handClouds.forEach((group) => {
        const center = group.reduce((acc, pt) => ({ x: acc.x + pt.x / group.length, y: acc.y + pt.y / group.length }), { x: 0, y: 0 });
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(center.x, center.y, 36 + Math.sin(this.pulse) * 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      });

      ctx.save();
      ctx.fillStyle = 'rgba(5, 17, 29, 0.72)';
      ctx.fillRect(24, frameState.height - 80, 330, 48);
      Utils.drawLabel(ctx, 'Hand Connect', 38, frameState.height - 54);
      Utils.drawLabel(ctx, 'Fingertips pulse and link across both hands', 38, frameState.height - 34);
      ctx.restore();
    }

    clear() {}
    destroy() {}
  }

  window.GestureLab.HandConnectMode = HandConnectMode;
})();
