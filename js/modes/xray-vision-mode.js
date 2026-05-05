window.GestureLab = window.GestureLab || {};

(() => {
  const { Utils } = window.GestureLab;

  const POSE_PAIRS = [
    [11,12],[11,13],[13,15],[12,14],[14,16],
    [11,23],[12,24],[23,24],[23,25],[25,27],
    [24,26],[26,28],[27,29],[27,31],[28,30],[28,32],
    [0,1],[1,2],[2,3],[3,7],[0,4],[4,5],[5,6],[6,8],
  ];

  class XRayVisionMode {
    constructor(shared) {
      this.shared = shared;
      this.name = 'X-Ray Vision';
      this.tip = 'Raise both hands to open portal. Your skeleton appears inside.';
      this.time = 0;
      this.scanY = 0;
      this.frameCounter = 0;
      // segmentation
      this.segCanvas = document.createElement('canvas');
      this.segCanvas.width = 160; this.segCanvas.height = 120;
      this.segCtx = this.segCanvas.getContext('2d', { willReadFrequently: true });
      this.bodyPixels = [];
      this.lastSegFrame = 0;
    }

    getAccent() { return Utils.getAccent(); }

    getHands(frameState) {
      const left = frameState.results.leftHandLandmarks;
      const right = frameState.results.rightHandLandmarks;
      if (!left || !right) return null;
      const lThumb = Utils.mapNormalized(left[4], frameState.width, frameState.height);
      const lIndex = Utils.mapNormalized(left[8], frameState.width, frameState.height);
      const rThumb = Utils.mapNormalized(right[4], frameState.width, frameState.height);
      const rIndex = Utils.mapNormalized(right[8], frameState.width, frameState.height);
      return { lThumb, lIndex, rThumb, rIndex };
    }

    updateSeg(mask, fw, fh) {
      if (!mask) return;
      const sw = this.segCanvas.width, sh = this.segCanvas.height;
      this.segCtx.drawImage(mask, 0, 0, sw, sh);
      const data = this.segCtx.getImageData(0, 0, sw, sh).data;
      const pts = [];
      for (let y = 0; y < sh; y += 2) {
        for (let x = 0; x < sw; x += 2) {
          if (data[(y * sw + x) * 4 + 3] > 80) {
            pts.push({ nx: x / sw, ny: y / sh, s: 2 + Math.random() * 2, a: 0.4 + Math.random() * 0.5 });
          }
        }
      }
      this.bodyPixels = pts.slice(0, 2000);
    }

    update(frameState) {
      this.time += 0.045;
      this.frameCounter++;
      if (this.frameCounter - this.lastSegFrame > 8) {
        this.updateSeg(frameState.results.segmentationMask, frameState.width, frameState.height);
        this.lastSegFrame = this.frameCounter;
      }
    }

    draw(ctx, frameState) {
      const accent = this.getAccent();
      const hands = this.getHands(frameState);
      const { width: fw, height: fh } = frameState;
      const pose = frameState.results.poseLandmarks;

      if (!hands) {
        ctx.save();
        ctx.fillStyle = 'rgba(5,12,20,0.75)';
        ctx.beginPath(); ctx.roundRect(20, fh - 74, 380, 54, 12); ctx.fill();
        Utils.drawLabel(ctx, 'X-RAY VISION', 36, fh - 50, 11, accent);
        Utils.drawLabel(ctx, 'Raise both hands to open the scanner portal', 36, fh - 32, 11, 'rgba(180,210,200,0.8)');
        ctx.restore(); return;
      }

      // portal corners from thumbs and index fingers of both hands
      const corners = [hands.lThumb, hands.rThumb, hands.rIndex, hands.lIndex];
      const xs = corners.map(p => p.x), ys = corners.map(p => p.y);
      const minX = Math.min(...xs), maxX = Math.max(...xs);
      const minY = Math.min(...ys), maxY = Math.max(...ys);
      const pw = Math.max(maxX - minX, 160), ph = Math.max(maxY - minY, 200);

      // ── CLIP to portal ──
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(corners[0].x, corners[0].y);
      ctx.lineTo(corners[1].x, corners[1].y);
      ctx.lineTo(corners[2].x, corners[2].y);
      ctx.lineTo(corners[3].x, corners[3].y);
      ctx.closePath();
      ctx.clip();

      // dark bg inside portal
      ctx.fillStyle = 'rgba(0, 8, 24, 0.92)';
      ctx.fillRect(minX - 10, minY - 10, pw + 20, ph + 20);

      // GREEN GRID
      ctx.strokeStyle = Utils.hexToRgba(accent, 0.08);
      ctx.lineWidth = 0.7;
      for (let x = minX; x <= maxX; x += 20) {
        ctx.beginPath(); ctx.moveTo(x, minY); ctx.lineTo(x, maxY); ctx.stroke();
      }
      for (let y = minY; y <= maxY; y += 20) {
        ctx.beginPath(); ctx.moveTo(minX, y); ctx.lineTo(maxX, y); ctx.stroke();
      }

      // ── BODY SEGMENTATION DOT CLOUD ──
      for (const [i, pt] of this.bodyPixels.entries()) {
        const px = minX + pt.nx * pw, py = minY + pt.ny * ph;
        if (px < minX || px > maxX || py < minY || py > maxY) continue;
        const pulse = 0.65 + Math.sin(this.time * 2 + i * 0.008) * 0.3;
        ctx.save(); ctx.globalAlpha = pt.a * pulse;
        ctx.fillStyle = i % 8 === 0 ? '#ffffff' : accent;
        ctx.shadowBlur = i % 8 === 0 ? 5 : 9; ctx.shadowColor = accent;
        ctx.fillRect(px, py, pt.s, pt.s);
        ctx.restore();
      }

      // ── POSE SKELETON — the main new feature ──
      if (pose) {
        const mapped = pose.map(p => Utils.mapNormalized(p, fw, fh));

        // bones
        ctx.save();
        ctx.strokeStyle = Utils.hexToRgba(accent, 0.9);
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 18; ctx.shadowColor = accent;
        ctx.lineCap = 'round';
        for (const [a, b] of POSE_PAIRS) {
          const pa = mapped[a], pb = mapped[b];
          if (!pa || !pb) continue;
          if (pa.visibility < 0.3 || pb.visibility < 0.3) continue;
          ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
        }
        ctx.restore();

        // joints
        for (const [i, pt] of mapped.entries()) {
          if (!pt || pt.visibility < 0.3) continue;
          const isKey = [11,12,13,14,15,16,23,24,25,26,27,28].includes(i);
          Utils.drawDot(ctx, pt.x, pt.y, isKey ? 5 : 3, accent, 14);
          Utils.drawDot(ctx, pt.x, pt.y, isKey ? 2 : 1, '#ffffff', 0);
        }
      }

      // scan line
      this.scanY = minY + ((Math.sin(this.time * 1.2) + 1) * 0.5) * ph;
      const scanGrad = ctx.createLinearGradient(0, this.scanY - 50, 0, this.scanY + 10);
      scanGrad.addColorStop(0, 'rgba(255,255,255,0)');
      scanGrad.addColorStop(0.6, Utils.hexToRgba(accent, 0.08));
      scanGrad.addColorStop(1, Utils.hexToRgba(accent, 0.5));
      ctx.fillStyle = scanGrad;
      ctx.fillRect(minX, this.scanY - 50, pw, 60);

      ctx.restore(); // end clip

      // ── PORTAL BORDER ──
      ctx.save();
      ctx.strokeStyle = Utils.hexToRgba(accent, 0.95);
      ctx.lineWidth = 2.5; ctx.shadowBlur = 20; ctx.shadowColor = accent;
      ctx.beginPath();
      ctx.moveTo(corners[0].x, corners[0].y);
      ctx.lineTo(corners[1].x, corners[1].y);
      ctx.lineTo(corners[2].x, corners[2].y);
      ctx.lineTo(corners[3].x, corners[3].y);
      ctx.closePath(); ctx.stroke();
      ctx.restore();

      // corner dots
      for (const c of corners) Utils.drawDot(ctx, c.x, c.y, 9, accent, 24);

      // HUD panel
      const px = Math.max(20, minX - 10), py2 = Math.max(70, minY - 80);
      ctx.save();
      ctx.fillStyle = 'rgba(5,12,20,0.82)';
      ctx.strokeStyle = Utils.hexToRgba(accent, 0.25); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(20, fh - 74, 380, 54, 12); ctx.fill();
      Utils.drawLabel(ctx, 'X-RAY VISION', 36, fh - 50, 11, accent);
      Utils.drawLabel(ctx, `Portal ${Math.round(pw)} × ${Math.round(ph)}  •  Skeleton tracking`, 36, fh - 32, 11, 'rgba(180,210,200,0.8)');
      ctx.restore();
    }

    clear() { this.bodyPixels = []; this.lastSegFrame = 0; this.frameCounter = 0; }
    destroy() {}
  }

  window.GestureLab.XRayVisionMode = XRayVisionMode;
})();
