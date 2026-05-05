window.GestureLab = window.GestureLab || {};

(() => {
  const { Utils } = window.GestureLab;

  class ComingSoonMode {
    constructor(shared, title, description) {
      this.shared = shared;
      this.name = title;
      this.description = description;
      this.tip = description;
    }

    update() {}

    draw(ctx, frameState) {
      ctx.save();
      ctx.fillStyle = 'rgba(2, 8, 16, 0.5)';
      ctx.fillRect(0, 0, frameState.width, frameState.height);

      const cardWidth = Math.min(440, frameState.width - 48);
      const cardHeight = 180;
      const x = (frameState.width - cardWidth) / 2;
      const y = (frameState.height - cardHeight) / 2;

      ctx.fillStyle = 'rgba(5, 17, 29, 0.8)';
      ctx.strokeStyle = 'rgba(100, 243, 255, 0.28)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(x, y, cardWidth, cardHeight, 24);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#64f3ff';
      ctx.font = '700 16px Inter, sans-serif';
      ctx.fillText(this.name, x + 24, y + 42);

      ctx.fillStyle = 'rgba(233, 248, 255, 0.96)';
      ctx.font = '500 15px Inter, sans-serif';
      ctx.fillText('Reserved for a later build part.', x + 24, y + 78);

      ctx.fillStyle = 'rgba(157, 182, 200, 1)';
      ctx.font = '400 14px Inter, sans-serif';
      wrapText(ctx, this.description, x + 24, y + 112, cardWidth - 48, 24);
      ctx.restore();
    }

    clear() {}
    destroy() {}
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';

    words.forEach((word) => {
      const testLine = `${line}${word} `;
      const { width } = ctx.measureText(testLine);
      if (width > maxWidth && line) {
        ctx.fillText(line, x, y);
        line = `${word} `;
        y += lineHeight;
      } else {
        line = testLine;
      }
    });

    if (line) {
      ctx.fillText(line, x, y);
    }
  }

  window.GestureLab.ComingSoonMode = ComingSoonMode;
})();
