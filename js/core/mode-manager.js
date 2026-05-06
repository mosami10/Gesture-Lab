window.GL = window.GL || {};
class ModeManager {
  constructor(shared) { this.shared=shared; this.reg={}; this.cur=null; this.key=null; }
  register(k,C) { this.reg[k]=C; }
  set(k) {
    const C=this.reg[k]; if(!C) return;
    this.cur?.destroy?.();
    this.cur = new C(this.shared); this.key=k;
    this.cur?.init?.();
  }
  update(f) { this.cur?.update?.(f); }
  draw(ctx,f) { this.cur?.draw?.(ctx,f); }
  clear() { this.cur?.clear?.(); }
}
window.GL.ModeManager = ModeManager;
