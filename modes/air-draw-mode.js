window.GestureLab = window.GestureLab || {};

(() => {
  const { Utils } = window.GestureLab;

  class AirDrawMode {
    constructor(shared) {
      this.shared = shared;
      this.name = 'Air Drawer';
      this.tip = 'Pinch thumb + index finger to draw. Hit Clear to wipe it.';
      this.strokes = [];
      this.currentStroke = null;
      this.isDrawing = false;
    }

    update(frameState) {
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
          this.currentStroke = [];
          this.strokes.push(this.currentStroke);
        }
        this.isDrawing = true;
        this.currentStroke.push({ x: indexTip.x, y: indexTip.y });
        if (this.currentStroke.length > 1800) {
          this.currentStroke.shift();
        }
      } else {
        this.isDrawing = false;
        this.currentStroke = null;
      }
    }

    draw(ctx, frameState) {
      const hand = frameState.results.rightHandLandmarks || frameState.results.leftHandLandmarks;

      ctx.save();
      ctx.fillStyle = 'rgba(3, 10, 20, 0.18)';
      ctx.fillRect(0, 0, frameState.width, frameState.height);
      ctx.restore();

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const stroke of this.strokes) {
        if (stroke.length < 2) continue;
        ctx.beginPath();
        ctx.moveTo(stroke[0].x, stroke[0].y);
        for (let i = 1; i < stroke.length; i += 1) {
          ctx.lineTo(stroke[i].x, stroke[i].y);
        }
        ctx.strokeStyle = 'rgba(100, 243, 255, 0.95)';
        ctx.lineWidth = 6;
        ctx.shadowBlur = 18;
        ctx.shadowColor = '#64f3ff';
        ctx.stroke();
      }
      ctx.restore();

      if (hand) {
        const indexTip = Utils.mapNormalized(hand[8], frameState.width, frameState.height);
        const thumbTip = Utils.mapNormalized(hand[4], frameState.width, frameState.height);
        const pinchDistance = Utils.dist(indexTip, thumbTip);
        const active = pinchDistance < 42;

        Utils.drawDot(ctx, indexTip.x, indexTip.y, 10, active ? '#64f3ff' : '#ffffff', 24);
        Utils.drawDot(ctx, thumbTip.x, thumbTip.y, 8, active ? '#64f3ff' : '#5ea1ff', 18);
        Utils.drawLine(ctx, indexTip, thumbTip, active ? 'rgba(100, 243, 255, 0.8)' : 'rgba(255,255,255,0.28)', 2, 1);
      }

      ctx.save();
      ctx.fillStyle = 'rgba(5, 17, 29, 0.72)';
      ctx.fillRect(24, frameState.height - 80, 280, 48);
      Utils.drawLabel(ctx, 'Air Drawer', 38, frameState.height - 54);
      Utils.drawLabel(ctx, 'Pinch to draw • release to stop', 38, frameState.height - 34);
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
