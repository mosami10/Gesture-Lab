window.GestureLab = window.GestureLab || {};

(() => {
  class ModeManager {
    constructor(shared) {
      this.shared = shared;
      this.registry = {};
      this.current = null;
      this.currentKey = null;
    }

    register(key, ModeClass) {
      this.registry[key] = ModeClass;
    }

    setMode(key) {
      const ModeClass = this.registry[key];
      if (!ModeClass) return;

      if (this.current && typeof this.current.destroy === 'function') {
        this.current.destroy();
      }

      this.current = new ModeClass(this.shared);
      this.currentKey = key;

      if (typeof this.current.init === 'function') {
        this.current.init();
      }
    }

    update(frameState) {
      if (this.current && typeof this.current.update === 'function') {
        this.current.update(frameState);
      }
    }

    draw(ctx, frameState) {
      if (this.current && typeof this.current.draw === 'function') {
        this.current.draw(ctx, frameState);
      }
    }

    clear() {
      if (this.current && typeof this.current.clear === 'function') {
        this.current.clear();
      }
    }
  }

  window.GestureLab.ModeManager = ModeManager;
})();
