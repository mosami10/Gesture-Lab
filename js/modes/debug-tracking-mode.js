window.GestureLab = window.GestureLab || {};

(() => {
  const { Utils } = window.GestureLab;
  const HAND_CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 4],
    [0, 5], [5, 6], [6, 7], [7, 8],
    [5, 9], [9, 10], [10, 11], [11, 12],
    [9, 13], [13, 14], [14, 15], [15, 16],
    [13, 17], [17, 18], [18, 19], [19, 20],
    [0, 17],
  ];
  const POSE_CONNECTIONS = [
    [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
    [11, 23], [12, 24], [23, 24], [23, 25], [25, 27],
    [24, 26], [26, 28],
  ];

  class DebugTrackingMode {
    constructor(shared) {
      this.shared = shared;
      this.name = 'Debug Tracking';
      this.tip = 'Raise your hands to see the tracked landmarks.';
    }

    update() {}

    draw(ctx, frameState) {
      const { width, height, results } = frameState;
      const pose = results.poseLandmarks || [];
      const hands = [results.leftHandLandmarks, results.rightHandLandmarks].filter(Boolean);

      ctx.save();
      ctx.fillStyle = 'rgba(5, 17, 29, 0.22)';
      ctx.fillRect(0, 0, width, height);
      ctx.restore();

      for (const hand of hands) {
        const mapped = hand.map((pt) => Utils.mapNormalized(pt, width, height));
        HAND_CONNECTIONS.forEach(([a, b]) => {
          Utils.drawLine(ctx, mapped[a], mapped[b], 'rgba(100, 243, 255, 0.6)', 2, 1);
        });
        mapped.forEach((pt, index) => {
          Utils.drawDot(ctx, pt.x, pt.y, index === 8 ? 7 : 4, '#64f3ff', 16);
        });
      }

      const mappedPose = pose.map((pt) => Utils.mapNormalized(pt, width, height));
      POSE_CONNECTIONS.forEach(([a, b]) => {
        if (!mappedPose[a] || !mappedPose[b]) return;
        Utils.drawLine(ctx, mappedPose[a], mappedPose[b], 'rgba(94, 161, 255, 0.55)', 3, 1);
      });
      mappedPose.forEach((pt, index) => {
        if (!pt) return;
        Utils.drawDot(ctx, pt.x, pt.y, index === 11 || index === 12 ? 6 : 3, '#5ea1ff', 12);
      });

      ctx.save();
      ctx.fillStyle = 'rgba(5, 17, 29, 0.7)';
      ctx.fillRect(24, height - 80, 240, 44);
      Utils.drawLabel(ctx, 'Tracking debug mode', 38, height - 54);
      Utils.drawLabel(ctx, 'Foundation check before fancy effects', 38, height - 34);
      ctx.restore();
    }

    clear() {}
    destroy() {}
  }

  window.GestureLab.DebugTrackingMode = DebugTrackingMode;
})();
