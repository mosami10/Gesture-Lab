window.GestureLab = window.GestureLab || {};

(() => {
  const {
    ModeManager,
    Tracker,
    DebugTrackingMode,
    AirDrawMode,
    HandConnectMode,
    ComingSoonMode,
  } = window.GestureLab;

  class App {
    constructor() {
      this.video = document.getElementById('camera');
      this.canvas = document.getElementById('stage');
      this.ctx = this.canvas.getContext('2d');
      this.loader = document.getElementById('loader');

      this.engineStatus = document.getElementById('engineStatus');
      this.modeStatus = document.getElementById('modeStatus');
      this.handsStatus = document.getElementById('handsStatus');
      this.poseStatus = document.getElementById('poseStatus');
      this.fpsStatus = document.getElementById('fpsStatus');
      this.hudMode = document.getElementById('hudMode');
      this.hudTip = document.getElementById('hudTip');

      this.startButton = document.getElementById('startButton');
      this.clearButton = document.getElementById('clearButton');
      this.modeButtons = [...document.querySelectorAll('.mode-btn')];
      this.accentPicker = document.getElementById('accentPicker');
      this.swatches = [...document.querySelectorAll('.swatch')];

      this.shared = { app: this };
      this.tracker = new Tracker(this.video);
      this.modeManager = new ModeManager(this.shared);
      this.lastFrameTime = performance.now();
      this.lastFpsSample = performance.now();
      this.frameCount = 0;
      this.fps = 0;

      this.registerModes();
      this.bindEvents();
      this.bindThemeControls();
      this.restoreTheme();
      this.resize();
      this.modeManager.setMode('debug');
      this.updateModeUI('debug');
      requestAnimationFrame(() => this.render());
    }

    registerModes() {
      this.modeManager.register('debug', DebugTrackingMode);
      this.modeManager.register('airdraw', AirDrawMode);
      this.modeManager.register('handconnect', HandConnectMode);
      this.modeManager.register('particletext', class extends ComingSoonMode {
        constructor(shared) {
          super(shared, 'Particle Text', 'This will become the text-and-particles mode in Part 3.');
        }
      });
      this.modeManager.register('xrayvision', class extends ComingSoonMode {
        constructor(shared) {
          super(shared, 'X-Ray Vision', 'This will become the advanced portal mode after the core system is stable.');
        }
      });
    }

    bindEvents() {
      window.addEventListener('resize', () => this.resize());

      this.startButton.addEventListener('click', async () => {
        try {
          this.engineStatus.textContent = 'Starting';
          this.hudTip.textContent = 'Loading camera and tracking…';
          await this.tracker.start();
          this.engineStatus.textContent = 'Live';
          this.hudTip.textContent = this.modeManager.current?.tip || 'Tracking started.';
          this.loader.classList.add('hidden');
        } catch (error) {
          console.error(error);
          this.engineStatus.textContent = 'Error';
          this.hudTip.textContent = 'Camera permission or browser support failed.';
          alert('Could not start camera. Make sure camera permission is allowed in your browser and system settings.');
        }
      });

      this.clearButton.addEventListener('click', () => {
        this.modeManager.clear();
      });

      this.modeButtons.forEach((button) => {
        button.addEventListener('click', () => {
          const key = button.dataset.mode;
          this.modeManager.setMode(key);
          this.updateModeUI(key);
        });
      });
    }

    bindThemeControls() {
      if (this.accentPicker) {
        this.accentPicker.addEventListener('input', (event) => {
          this.setAccent(event.target.value);
        });
      }

      this.swatches.forEach((button) => {
        button.addEventListener('click', () => {
          const color = button.dataset.color;
          if (!color) return;
          if (this.accentPicker) this.accentPicker.value = color;
          this.setAccent(color);
        });
      });
    }

    restoreTheme() {
      const saved = localStorage.getItem('gesturelab-accent');
      if (saved) {
        if (this.accentPicker) this.accentPicker.value = saved;
        this.setAccent(saved);
      } else if (this.accentPicker) {
        this.setAccent(this.accentPicker.value);
      }
    }

    setAccent(hex) {
      const strong = this.shiftHex(hex, -24);
      const soft = this.hexToRgba(hex, 0.16);

      document.documentElement.style.setProperty('--accent', hex);
      document.documentElement.style.setProperty('--accent-strong', strong);
      document.documentElement.style.setProperty('--accent-soft', soft);

      localStorage.setItem('gesturelab-accent', hex);
    }

    shiftHex(hex, amount) {
      const clean = hex.replace('#', '');
      const num = parseInt(clean, 16);

      let r = (num >> 16) + amount;
      let g = ((num >> 8) & 0x00FF) + amount;
      let b = (num & 0x0000FF) + amount;

      r = Math.max(Math.min(255, r), 0);
      g = Math.max(Math.min(255, g), 0);
      b = Math.max(Math.min(255, b), 0);

      return '#' + [r, g, b]
        .map((value) => value.toString(16).padStart(2, '0'))
        .join('');
    }

    hexToRgba(hex, alpha = 1) {
      const clean = hex.replace('#', '');
      const num = parseInt(clean, 16);

      const r = num >> 16;
      const g = (num >> 8) & 255;
      const b = num & 255;

      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    updateModeUI(key) {
      const labelMap = {
        debug: 'Debug Tracking',
        airdraw: 'Air Drawer',
        handconnect: 'Hand Connect',
        particletext: 'Particle Text',
        xrayvision: 'X-Ray Vision',
      };

      this.modeButtons.forEach((button) => {
        button.classList.toggle('active', button.dataset.mode === key);
      });

      const label = labelMap[key] || key;
      this.modeStatus.textContent = label;
      this.hudMode.textContent = label;
      this.hudTip.textContent = this.modeManager.current?.tip || 'Mode switched.';
    }

    resize() {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    }

    drawBackground() {
      this.ctx.save();
      this.ctx.translate(this.canvas.width, 0);
      this.ctx.scale(-1, 1);
      if (this.video.readyState >= 2) {
        this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
      } else {
        this.ctx.fillStyle = '#05111d';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      }
      this.ctx.restore();
    }

    updateHud(frameState) {
      const hasLeft = Boolean(frameState.results.leftHandLandmarks);
      const hasRight = Boolean(frameState.results.rightHandLandmarks);
      const hands = Number(hasLeft) + Number(hasRight);
      const hasPose = Boolean(frameState.results.poseLandmarks);

      this.handsStatus.textContent = String(hands);
      this.poseStatus.textContent = hasPose ? 'Yes' : 'No';
      this.fpsStatus.textContent = String(this.fps);
    }

    updateFps(now) {
      this.frameCount += 1;
      if (now - this.lastFpsSample >= 500) {
        this.fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsSample));
        this.frameCount = 0;
        this.lastFpsSample = now;
      }
    }

    render() {
      const now = performance.now();
      this.updateFps(now);
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.drawBackground();

      const frameState = this.tracker.getFrameState(this.canvas.width, this.canvas.height);
      this.modeManager.update(frameState);
      this.modeManager.draw(this.ctx, frameState);
      this.updateHud(frameState);

      requestAnimationFrame(() => this.render());
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    new App();
  });
})();
