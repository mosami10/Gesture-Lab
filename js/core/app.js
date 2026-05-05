window.GestureLab = window.GestureLab || {};

(() => {
  const {
    ModeManager, Tracker,
    DebugTrackingMode, AirDrawMode, HandConnectMode, ParticleTextMode,
    XRayVisionMode, NeonRippleMode, MirrorMode, GravitySandboxMode,
  } = window.GestureLab;

  const BG_MODES = ['Camera', 'Dark', 'Deep Space', 'Forest', 'Neon City', 'Sunset'];

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
      this.bgSelect = document.getElementById('bgSelect');
      this.wordInput = document.getElementById('wordInput');
      this.setWordBtn = document.getElementById('setWordBtn');
      this.colorModeBtn = document.getElementById('colorModeBtn');

      this.bgMode = 0;
      this.bgCanvas = document.createElement('canvas');
      this.bgCtx = this.bgCanvas.getContext('2d');

      this.shared = { app: this };
      this.tracker = new Tracker(this.video);
      this.modeManager = new ModeManager(this.shared);
      this.lastFpsSample = performance.now();
      this.frameCount = 0;
      this.fps = 0;
      this.currentModeKey = 'debug';

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
      this.modeManager.register('particletext', ParticleTextMode);
      this.modeManager.register('xrayvision', XRayVisionMode);
      this.modeManager.register('neonripple', NeonRippleMode);
      this.modeManager.register('mirror', MirrorMode);
      this.modeManager.register('gravity', GravitySandboxMode);
    }

    bindEvents() {
      window.addEventListener('resize', () => this.resize());

      this.startButton.addEventListener('click', async () => {
        try {
          this.engineStatus.textContent = 'Starting…';
          this.hudTip.textContent = 'Loading camera and AI models…';
          await this.tracker.start();
          this.engineStatus.textContent = 'Live';
          this.hudTip.textContent = this.modeManager.current?.tip || 'Tracking started.';
          this.loader.classList.add('hidden');
          this.startButton.textContent = 'Camera On';
          this.startButton.disabled = true;
        } catch (err) {
          console.error(err);
          this.engineStatus.textContent = 'Error';
          this.hudTip.textContent = 'Camera permission failed.';
          alert('Camera error. Please allow camera access and reload.');
        }
      });

      this.clearButton.addEventListener('click', () => this.modeManager.clear());

      this.modeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          const key = btn.dataset.mode;
          this.modeManager.setMode(key);
          this.currentModeKey = key;
          this.updateModeUI(key);
          this.updateParticlePanel();
        });
      });

      // Background selector
      if (this.bgSelect) {
        this.bgSelect.addEventListener('change', () => {
          this.bgMode = parseInt(this.bgSelect.value);
          if (this.bgMode !== 0) this.buildBgCanvas();
        });
      }

      // Particle text controls
      if (this.setWordBtn) {
        this.setWordBtn.addEventListener('click', () => {
          const mode = this.modeManager.current;
          if (mode?.setWord && this.wordInput?.value.trim()) {
            mode.setWord(this.wordInput.value.trim());
          }
        });
        this.wordInput?.addEventListener('keydown', e => {
          if (e.key === 'Enter') this.setWordBtn.click();
        });
      }

      if (this.colorModeBtn) {
        this.colorModeBtn.addEventListener('click', () => {
          const mode = this.modeManager.current;
          if (mode?.nextColorMode) mode.nextColorMode();
        });
      }
    }

    buildBgCanvas() {
      const w = this.bgCanvas.width = this.canvas.width;
      const h = this.bgCanvas.height = this.canvas.height;
      const bc = this.bgCtx;
      const gradients = {
        1: [['#030812', '#071018']], // dark
        2: [['#000011', '#0a0a2e', '#1a0a3e']], // deep space
        3: [['#0a1f0a', '#0d2e14', '#1a4a1a']], // forest
        4: [['#050515', '#0a051f', '#1a0a2e', '#0f0a3e']], // neon city
        5: [['#1a0505', '#2e0d0a', '#3e1a05', '#2e2e0a']], // sunset
      };
      const stops = gradients[this.bgMode] || gradients[1];
      const g = bc.createLinearGradient(0, 0, 0, h);
      const colors = stops[0];
      colors.forEach((c, i) => g.addColorStop(i / (colors.length - 1), c));
      bc.fillStyle = g;
      bc.fillRect(0, 0, w, h);

      // space stars
      if (this.bgMode === 2) {
        for (let i = 0; i < 200; i++) {
          bc.fillStyle = `rgba(255,255,255,${0.2 + Math.random() * 0.6})`;
          bc.fillRect(Math.random() * w, Math.random() * h, Math.random() * 2, Math.random() * 2);
        }
      }
      // neon grid
      if (this.bgMode === 4) {
        const accent = window.GestureLab.Utils.getAccent();
        bc.strokeStyle = window.GestureLab.Utils.hexToRgba(accent, 0.05);
        bc.lineWidth = 1;
        for (let x = 0; x < w; x += 40) { bc.beginPath(); bc.moveTo(x, 0); bc.lineTo(x, h); bc.stroke(); }
        for (let y = 0; y < h; y += 40) { bc.beginPath(); bc.moveTo(0, y); bc.lineTo(w, y); bc.stroke(); }
      }
    }

    bindThemeControls() {
      this.accentPicker?.addEventListener('input', e => this.setAccent(e.target.value));
      this.swatches.forEach(btn => {
        btn.addEventListener('click', () => {
          const color = btn.dataset.color;
          if (!color) return;
          if (this.accentPicker) this.accentPicker.value = color;
          this.setAccent(color);
        });
      });
    }

    restoreTheme() {
      const saved = localStorage.getItem('gesturelab-accent');
      const savedBg = localStorage.getItem('gesturelab-bg');
      if (saved) { if (this.accentPicker) this.accentPicker.value = saved; this.setAccent(saved); }
      else if (this.accentPicker) this.setAccent(this.accentPicker.value);
      if (savedBg) { this.bgMode = parseInt(savedBg); if (this.bgSelect) this.bgSelect.value = savedBg; }
    }

    setAccent(hex) {
      const strong = this.shiftHex(hex, -24);
      const soft = window.GestureLab.Utils.hexToRgba(hex, 0.16);
      document.documentElement.style.setProperty('--accent', hex);
      document.documentElement.style.setProperty('--accent-strong', strong);
      document.documentElement.style.setProperty('--accent-soft', soft);
      localStorage.setItem('gesturelab-accent', hex);
      if (this.bgMode !== 0) this.buildBgCanvas();
    }

    shiftHex(hex, amount) {
      const n = parseInt(hex.replace('#', ''), 16);
      const clamp = v => Math.max(0, Math.min(255, v));
      const r = clamp((n >> 16) + amount);
      const g = clamp(((n >> 8) & 0xFF) + amount);
      const b = clamp((n & 0xFF) + amount);
      return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
    }

    updateModeUI(key) {
      const labels = {
        debug: 'Debug Tracking', airdraw: 'Air Drawer', handconnect: 'Hand Connect',
        particletext: 'Particle Text', xrayvision: 'X-Ray Vision',
        neonripple: 'Neon Ripple', mirror: 'Mirror Symmetry', gravity: 'Gravity Sandbox',
      };
      this.modeButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.mode === key));
      const label = labels[key] || key;
      this.modeStatus.textContent = label;
      this.hudMode.textContent = label;
      this.hudTip.textContent = this.modeManager.current?.tip || '';
    }

    updateParticlePanel() {
      const panel = document.getElementById('particleControls');
      if (panel) panel.style.display = this.currentModeKey === 'particletext' ? 'block' : 'none';
    }

    resize() {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      if (this.bgMode !== 0) this.buildBgCanvas();
    }

    drawBackground() {
      const ctx = this.ctx;
      if (this.bgMode === 0) {
        // camera feed
        ctx.save();
        ctx.translate(this.canvas.width, 0); ctx.scale(-1, 1);
        if (this.video.readyState >= 2) {
          ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
        } else {
          ctx.fillStyle = '#030812';
          ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
        ctx.restore();
        // subtle dark vignette
        const vig = ctx.createRadialGradient(this.canvas.width/2, this.canvas.height/2, 0, this.canvas.width/2, this.canvas.height/2, Math.max(this.canvas.width, this.canvas.height) * 0.7);
        vig.addColorStop(0, 'transparent');
        vig.addColorStop(1, 'rgba(0,0,0,0.35)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      } else {
        ctx.drawImage(this.bgCanvas, 0, 0);
      }
    }

    updateHud(frameState) {
      const hasLeft = Boolean(frameState.results.leftHandLandmarks);
      const hasRight = Boolean(frameState.results.rightHandLandmarks);
      this.handsStatus.textContent = String(Number(hasLeft) + Number(hasRight));
      this.poseStatus.textContent = Boolean(frameState.results.poseLandmarks) ? 'Yes' : 'No';
      this.fpsStatus.textContent = String(this.fps);
    }

    updateFps(now) {
      this.frameCount++;
      if (now - this.lastFpsSample >= 500) {
        this.fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsSample));
        this.frameCount = 0; this.lastFpsSample = now;
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

  window.addEventListener('DOMContentLoaded', () => new App());
})();
