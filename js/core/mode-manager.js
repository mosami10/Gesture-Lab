window.GestureLab = window.GestureLab || {};

(() => {
  class ModeManager {
    constructor(shared) {
      this.shared = shared;
      this.registry = {};
      this.current = null;
      this.currentKey = null;
    }

    register(key, ModeClass) { this.registry[key] = ModeClass; }

    setMode(key) {
      const ModeClass = this.registry[key];
      if (!ModeClass) return;
      if (this.current?.destroy) this.current.destroy();
      this.current = new ModeClass(this.shared);
      this.currentKey = key;
      if (this.current?.init) this.current.init();
    }

    update(frameState) { this.current?.update?.(frameState); }
    draw(ctx, frameState) { this.current?.draw?.(ctx, frameState); }
    clear() { this.current?.clear?.(); }
  }

  window.GestureLab.ModeManager = ModeManager;
})();
