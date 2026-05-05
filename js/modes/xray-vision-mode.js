window.GestureLab = window.GestureLab || {};

(() => {
  const { Utils } = window.GestureLab;

  class XRayVisionMode {
    constructor(shared) {
      this.shared = shared;
      this.name = 'X-Ray Vision';
      this.tip = 'Raise both hands and frame the portal with your thumbs and index fingers.';
      this.time = 0;
      this.maskCanvas = document.createElement('canvas');
      this.maskCanvas.width = 96;
      this.maskCanvas.height = 96;
      this.maskCtx = this.maskCanvas.getContext('2d', { willReadFrequently: true });
      this.samplePoints = [];
      this.lastSampleFrame = 0;
      this.frameCounter = 0;
    }

    getAccent() {
      return getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#63e6be';
    }

    hexToRgba(hex, alpha = 1) {
      const clean = hex.replace('#', '');
      const num = parseInt(clean, 16);
      const r = num >> 16;
      const g = (num >> 8) & 255;
      const b = num & 255;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    getHands(frameState) {
      const left = frameState.results.leftHandLandmarks;
      const right = frameState.results.rightHandLandmarks;
      if (!left || !right) return null;

      const lThumb = Utils.mapNormalized(left[4], frameState.width, frameState.height);
      const lIndex = Utils.mapNormalized(left[8], frameState.width, frameState.height);
      const rThumb = Utils.mapNormalized(right[4], frameState.width, frameState.height);
      const rIndex = Utils.mapNormalized(right[8], frameState.width, frameState.height);

      return { left, right, lThumb, lIndex, rThumb, rIndex };
    }

    resampleMask(mask) {
      if (!mask) return;
      this.maskCtx.clearRect(0, 0, this.maskCanvas.width, this.maskCanvas.height);
      this.maskCtx.drawImage(mask, 0, 0, this.maskCanvas.width, this.maskCanvas.height);
      const data = this.maskCtx.getImageData(0, 0, this.maskCanvas.width, this.maskCanvas.height).data;

      const points = [];
      for (let y = 0; y < this.maskCanvas.height; y += 2) {
        for (let x = 0; x < this.maskCanvas.width; x += 2) {
          const idx = (y * this.maskCanvas.width + x) * 4 + 3;
          if (data[idx] > 120) {
            points.push({
              x: x / this.maskCanvas.width,
              y: y / this.maskCanvas.height,
              size: 1 + Math.random() * 1.7,
              alpha: 0.35 + Math.random() * 0.6,
            });
          }
        }
      }

      this.samplePoints = points.slice(0, 1800);
    }

    update(frameState) {
      this.time += 0.04;
      this.frameCounter += 1;

      if (this.frameCounter - this.lastSampleFrame > 10 && frameState.results.segmentationMask) {
        this.resampleMask(frameState.results.segmentationMask);
        this.lastSampleFrame = this.frameCounter;
      }
    }

    drawPortalBorder(ctx, points, accent) {
      const [a, b, c, d] = points;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.lineTo(c.x, c.y);
      ctx.lineTo(d.x, d.y);
      ctx.closePath();

      ctx.strokeStyle = this.hexToRgba(accent, 0.92);
      ctx.lineWidth = 2.2;
      ctx.shadowBlur = 18;
      ctx.shadowColor = accent;
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 0.8;
      ctx.shadowBlur = 0;
      ctx.stroke();
      ctx.restore();

      points.forEach((pt) => {
        Utils.drawDot(ctx, pt.x, pt.y, 10, accent, 22);
        Utils.drawDot(ctx, pt.x, pt.y, 3.5, '#ffffff', 0);
      });
    }

    draw(ctx, frameState) {
      const accent = this.getAccent();
      const hands = this.getHands(frameState);
      const pose = frameState.results.poseLandmarks || [];

      ctx.save();
      ctx.fillStyle = 'rgba(2, 8, 16, 0.24)';
      ctx.fillRect(0, 0, frameState.width, frameState.height);
      ctx.restore();

      if (!hands) {
        ctx.save();
        ctx.fillStyle = 'rgba(5, 17, 29, 0.72)';
        ctx.fillRect(24, frameState.height - 88, 390, 56);
        Utils.drawLabel(ctx, 'X-Ray Vision', 38, frameState.height - 58);
        Utils.drawLabel(ctx, 'Raise both hands to open the portal scanner', 38, frameState.height - 36);
        ctx.restore();
        return;
      }

      const points = [hands.lThumb, hands.rThumb, hands.rIndex, hands.lIndex];
      const minX = Math.min(...points.map((p) => p.x));
      const minY = Math.min(...points.map((p) => p.y));
      const maxX = Math.max(...points.map((p) => p.x));
      const maxY = Math.max(...points.map((p) => p.y));
      const width = Math.max(maxX - minX, 120);
      const height = Math.max(maxY - minY, 160);
      const center = { x: (minX + maxX) * 0.5, y: (minY + maxY) * 0.5 };

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      ctx.lineTo(points[1].x, points[1].y);
      ctx.lineTo(points[2].x, points[2].y);
      ctx.lineTo(points[3].x, points[3].y);
      ctx.closePath();
      ctx.clip();

      ctx.fillStyle = 'rgba(0, 5, 16, 0.84)';
      ctx.fillRect(minX, minY, width, height);

      const gridColor = this.hexToRgba(accent, 0.10);
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 1;
      for (let x = minX; x <= maxX; x += 18) {
        ctx.beginPath();
        ctx.moveTo(x, minY);
        ctx.lineTo(x, maxY);
        ctx.stroke();
      }
      for (let y = minY; y <= maxY; y += 18) {
        ctx.beginPath();
        ctx.moveTo(minX, y);
        ctx.lineTo(maxX, y);
        ctx.stroke();
      }

      const scanY = minY + ((Math.sin(this.time * 1.5) + 1) * 0.5) * height;
      const gradient = ctx.createLinearGradient(0, scanY - 60, 0, scanY + 8);
      gradient.addColorStop(0, 'rgba(255,255,255,0)');
      gradient.addColorStop(0.55, this.hexToRgba(accent, 0.10));
      gradient.addColorStop(1, this.hexToRgba(accent, 0.65));
      ctx.fillStyle = gradient;
      ctx.fillRect(minX, scanY - 60, width, 68);

      this.samplePoints.forEach((pt, index) => {
        const x = minX + pt.x * width;
        const y = minY + pt.y * height;
        const pulse = 0.7 + Math.sin(this.time * 2.2 + index * 0.01) * 0.25;
        ctx.save();
        ctx.globalAlpha = pt.alpha * pulse;
        ctx.fillStyle = index % 10 === 0 ? '#ffffff' : accent;
        ctx.shadowBlur = index % 10 === 0 ? 7 : 11;
        ctx.shadowColor = index % 10 === 0 ? '#ffffff' : accent;
        ctx.fillRect(x, y, pt.size, pt.size);
        ctx.restore();
      });

      const mappedPose = pose.map((pt) => Utils.mapNormalized(pt, frameState.width, frameState.height));
      const jointIndices = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
      jointIndices.forEach((idx) => {
        const pt = mappedPose[idx];
        if (!pt) return;
        if (pt.x > minX && pt.x < maxX && pt.y > minY && pt.y < maxY) {
          Utils.drawDot(ctx, pt.x, pt.y, idx < 20 ? 4.5 : 4, '#ffffff', 10);
          Utils.drawDot(ctx, pt.x, pt.y, 8, accent, 16);
        }
      });

      ctx.restore();

      this.drawPortalBorder(ctx, points, accent);

      ctx.save();
      ctx.fillStyle = 'rgba(5, 17, 29, 0.72)';
      ctx.fillRect(24, frameState.height - 88, 400, 56);
      Utils.drawLabel(ctx, 'X-Ray Vision', 38, frameState.height - 58);
      Utils.drawLabel(ctx, 'Frame the portal and watch the scanline body silhouette', 38, frameState.height - 36);
      ctx.restore();

      const panelX = Math.max(24, center.x - 130);
      const panelY = Math.max(110, minY - 92);
      ctx.save();
      ctx.fillStyle = 'rgba(5, 17, 29, 0.72)';
      ctx.strokeStyle = this.hexToRgba(accent, 0.25);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(panelX, panelY, 220, 70, 18);
      ctx.fill();
      ctx.stroke();
      Utils.drawLabel(ctx, 'Neural scan online', panelX + 16, panelY + 24);
      Utils.drawLabel(ctx, `Portal size ${Math.round(width)} × ${Math.round(height)}`, panelX + 16, panelY + 44);
      Utils.drawLabel(ctx, `Mask particles ${this.samplePoints.length}`, panelX + 16, panelY + 62);
      ctx.restore();
    }

    clear() {
      this.samplePoints = [];
    }

    destroy() {}
  }

  window.GestureLab.XRayVisionMode = XRayVisionMode;
})();
