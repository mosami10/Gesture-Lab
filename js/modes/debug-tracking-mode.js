window.GestureLab = window.GestureLab || {};

(() => {
  const { Utils } = window.GestureLab;

  const HAND_CONNECTIONS = [
    [0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],
    [5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],
    [13,17],[17,18],[18,19],[19,20],[0,17],
  ];
  const POSE_CONNECTIONS = [
    [11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24],
    [23,25],[25,27],[24,26],[26,28],[27,29],[27,31],[28,30],[28,32],
  ];
  const FACE_CONNECTIONS = [
    [10,338],[338,297],[297,332],[332,284],[284,251],[251,389],[389,356],[356,454],
    [454,323],[323,361],[361,288],[288,397],[397,365],[365,379],[379,378],[378,400],
    [400,377],[377,152],[152,148],[148,176],[176,149],[149,150],[150,136],[136,172],
    [172,58],[58,132],[132,93],[93,234],[234,127],[127,162],[162,21],[21,54],
    [54,103],[103,67],[67,109],[109,10],
  ];

  class DebugTrackingMode {
    constructor(shared) {
      this.shared = shared;
      this.name = 'Debug Tracking';
      this.tip = 'Raw landmark overlay — pose, face mesh, and both hands.';
      this.time = 0;
    }

    update() { this.time += 0.04; }

    drawSkeleton(ctx, landmarks, connections, color, w, h, dotR = 2, lineW = 1) {
      const pts = landmarks.map(p => Utils.mapNormalized(p, w, h));
      ctx.save();
      ctx.strokeStyle = Utils.hexToRgba(color, 0.55);
      ctx.lineWidth = lineW;
      ctx.shadowBlur = 6;
      ctx.shadowColor = color;
      for (const [a, b] of connections) {
        if (!pts[a] || !pts[b]) continue;
        ctx.beginPath(); ctx.moveTo(pts[a].x, pts[a].y); ctx.lineTo(pts[b].x, pts[b].y); ctx.stroke();
      }
      ctx.restore();
      for (const pt of pts) Utils.drawDot(ctx, pt.x, pt.y, dotR, color, 4);
    }

    draw(ctx, frameState) {
      const { results, width: w, height: h } = frameState;
      const accent = Utils.getAccent();

      // face mesh
      if (results.faceLandmarks) {
        this.drawSkeleton(ctx, results.faceLandmarks, FACE_CONNECTIONS, '#4dabf7', w, h, 1, 0.5);
      }
      // pose
      if (results.poseLandmarks) {
        this.drawSkeleton(ctx, results.poseLandmarks, POSE_CONNECTIONS, accent, w, h, 3, 1.5);
      }
      // hands
      if (results.leftHandLandmarks) this.drawSkeleton(ctx, results.leftHandLandmarks, HAND_CONNECTIONS, '#ff6b9d', w, h, 4, 2);
      if (results.rightHandLandmarks) this.drawSkeleton(ctx, results.rightHandLandmarks, HAND_CONNECTIONS, '#ffd43b', w, h, 4, 2);

      // legend
      ctx.save();
      ctx.fillStyle = 'rgba(5,12,20,0.75)';
      ctx.beginPath(); ctx.roundRect(20, h - 110, 240, 90, 12); ctx.fill();
      Utils.drawLabel(ctx, '● FACE MESH', 38, h - 88, 11, '#4dabf7');
      Utils.drawLabel(ctx, '● POSE', 38, h - 70, 11, accent);
      Utils.drawLabel(ctx, '● LEFT HAND', 38, h - 52, 11, '#ff6b9d');
      Utils.drawLabel(ctx, '● RIGHT HAND', 38, h - 34, 11, '#ffd43b');
      ctx.restore();
    }

    clear() {}
    destroy() {}
  }

  window.GestureLab.DebugTrackingMode = DebugTrackingMode;
})();
