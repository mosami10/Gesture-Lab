window.GL = window.GL || {};
(() => {
const {ModeManager,Tracker,Utils:U,DebugMode,AirDrawMode,HandConnectMode,ParticleTextMode,
  NightVisionMode,NeonRippleMode,CloneTrailMode,GravitySandboxMode} = window.GL;

class App {
  constructor(){
    this.vid=document.getElementById('cam');
    this.canvas=document.getElementById('stage');
    this.ctx=this.canvas.getContext('2d');
    this.tracker=new Tracker(this.vid);
    this.mm=new ModeManager({app:this});
    this.lastFps=performance.now();this.frames=0;this.fps=0;
    this.bgMode=0;this.bgCanvas=document.createElement('canvas');this.bgCtx=this.bgCanvas.getContext('2d');
    this.curMode='debug';

    this.mm.register('debug',DebugMode);
    this.mm.register('airdraw',AirDrawMode);
    this.mm.register('handconnect',HandConnectMode);
    this.mm.register('particles',ParticleTextMode);
    this.mm.register('nightvision',NightVisionMode);
    this.mm.register('ripple',NeonRippleMode);
    this.mm.register('clone',CloneTrailMode);
    this.mm.register('gravity',GravitySandboxMode);

    this._bind();
    this._restoreTheme();
    this._resize();
    this.mm.set('debug');this._updateModeUI('debug');
    requestAnimationFrame(()=>this._render());
  }

  _bind(){
    window.addEventListener('resize',()=>this._resize());
    document.getElementById('btnStart').addEventListener('click',async()=>this._start());
    document.getElementById('btnClear').addEventListener('click',()=>this.mm.clear());
    document.querySelectorAll('.mode-btn').forEach(b=>b.addEventListener('click',()=>{
      this.mm.set(b.dataset.mode);this.curMode=b.dataset.mode;this._updateModeUI(b.dataset.mode);
    }));
    document.getElementById('accentPicker').addEventListener('input',e=>this._setAccent(e.target.value));
    document.querySelectorAll('.swatch').forEach(s=>s.addEventListener('click',()=>{
      const c=s.dataset.color;document.getElementById('accentPicker').value=c;this._setAccent(c);
    }));
    document.getElementById('bgSelect').addEventListener('change',e=>{
      this.bgMode=parseInt(e.target.value);if(this.bgMode!==0)this._buildBg();
      localStorage.setItem('gl-bg',this.bgMode);
    });
    document.getElementById('wordInput')?.addEventListener('keydown',e=>{if(e.key==='Enter')document.getElementById('btnWord').click();});
    document.getElementById('btnWord')?.addEventListener('click',()=>{
      const w=document.getElementById('wordInput').value.trim();
      if(w&&this.mm.cur?.setWord) this.mm.cur.setWord(w);
    });
    document.getElementById('btnColMode')?.addEventListener('click',()=>this.mm.cur?.nextColMode?.());

    // icon panel toggles
    document.querySelectorAll('.panel-icon-btn').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const target=btn.dataset.panel;
        document.querySelectorAll('.floating-panel').forEach(p=>p.classList.toggle('open',p.dataset.panel===target&&!p.classList.contains('open')));
      });
    });
    document.addEventListener('click',e=>{
      if(!e.target.closest('.panel-icon-btn')&&!e.target.closest('.floating-panel')){
        document.querySelectorAll('.floating-panel').forEach(p=>p.classList.remove('open'));
      }
    });
  }

  async _start(){
    const btn=document.getElementById('btnStart');
    btn.textContent='Loading…';btn.disabled=true;
    document.getElementById('engineStatus').textContent='Starting…';
    try {
      await this.tracker.start();
      document.getElementById('engineStatus').textContent='Live';
      document.getElementById('engineStatus').style.color='var(--accent)';
      document.getElementById('loader').classList.add('out');
      setTimeout(()=>document.getElementById('loader').style.display='none',600);
    } catch(e){
      btn.textContent='Retry';btn.disabled=false;
      document.getElementById('engineStatus').textContent='Error';
      alert('Camera failed. Allow access and reload.');
    }
  }

  _updateModeUI(key){
    document.querySelectorAll('.mode-btn').forEach(b=>b.classList.toggle('active',b.dataset.mode===key));
    const labels={debug:'Debug Scan',airdraw:'Air Draw',handconnect:'Hand Connect',
      particles:'Particle Text',nightvision:'Night Vision',ripple:'Neon Ripple',
      clone:'Clone Trail',gravity:'Gravity Sandbox'};
    const label=labels[key]||key;
    document.getElementById('modeLabel').textContent=label;
    document.getElementById('hudMode').textContent=label;
    document.getElementById('hudTip').textContent=this.mm.cur?.tip||'';
    const pc=document.getElementById('particleCtrl');
    if(pc) pc.style.display=key==='particles'?'block':'none';
  }

  _buildBg(){
    const w=this.bgCanvas.width=this.canvas.width, h=this.bgCanvas.height=this.canvas.height;
    const bc=this.bgCtx;
    const schemes={1:['#020408','#040810'],2:['#000010','#080025','#150040'],
      3:['#040d04','#0a1f08','#142d10'],4:['#030010','#0a0020','#150030'],
      5:['#120304','#1f0810','#2e0d18']};
    const cols=schemes[this.bgMode]||schemes[1];
    const g=bc.createLinearGradient(0,0,0,h);
    cols.forEach((c,i)=>g.addColorStop(i/(cols.length-1),c));
    bc.fillStyle=g;bc.fillRect(0,0,w,h);
    if(this.bgMode===2){for(let i=0;i<300;i++){bc.fillStyle=`rgba(255,255,255,${.1+Math.random()*.7})`;bc.fillRect(Math.random()*w,Math.random()*h,Math.random()*1.5,Math.random()*1.5);}}
    if(this.bgMode===4){const ac=U.accent();bc.strokeStyle=U.rgba(ac,0.04);bc.lineWidth=1;for(let x=0;x<w;x+=50){bc.beginPath();bc.moveTo(x,0);bc.lineTo(x,h);bc.stroke();}for(let y=0;y<h;y+=50){bc.beginPath();bc.moveTo(0,y);bc.lineTo(w,y);bc.stroke();}}
  }

  _setAccent(hex){
    const n=parseInt(hex.replace('#',''),16);
    const shift=(n,d)=>Math.max(0,Math.min(255,n+d)).toString(16).padStart(2,'0');
    const r=n>>16,g=(n>>8)&255,b=n&255;
    document.documentElement.style.setProperty('--accent',hex);
    document.documentElement.style.setProperty('--accent-strong',`#${shift(r,-24)}${shift(g,-24)}${shift(b,-24)}`);
    document.documentElement.style.setProperty('--accent-soft',`rgba(${r},${g},${b},0.14)`);
    localStorage.setItem('gl-accent',hex);
    if(this.bgMode!==0) this._buildBg();
  }

  _restoreTheme(){
    const a=localStorage.getItem('gl-accent');const bg=localStorage.getItem('gl-bg');
    if(a){document.getElementById('accentPicker').value=a;this._setAccent(a);}
    else this._setAccent(document.getElementById('accentPicker').value);
    if(bg){this.bgMode=parseInt(bg);const bs=document.getElementById('bgSelect');if(bs)bs.value=bg;}
  }

  _resize(){
    this.canvas.width=window.innerWidth;this.canvas.height=window.innerHeight;
    if(this.bgMode!==0)this._buildBg();
  }

  _drawBg(){
    const ctx=this.ctx,w=this.canvas.width,h=this.canvas.height;
    if(this.bgMode===0){
      // CORRECT aspect ratio: show camera with object-fit cover behaviour
      ctx.save();ctx.translate(w,0);ctx.scale(-1,1);
      if(this.vid.readyState>=2){
        const vw=this.vid.videoWidth||640,vh=this.vid.videoHeight||480;
        const scale=Math.max(w/vw,h/vh);
        const sw=vw*scale,sh=vh*scale;
        const ox=(w-sw)/2,oy=(h-sh)/2;
        ctx.drawImage(this.vid,ox,oy,sw,sh);
      } else {ctx.fillStyle='#020810';ctx.fillRect(0,0,w,h);}
      ctx.restore();
      // subtle vignette
      const vig=ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,Math.max(w,h)*0.65);
      vig.addColorStop(0,'transparent');vig.addColorStop(1,'rgba(0,0,0,0.3)');
      ctx.fillStyle=vig;ctx.fillRect(0,0,w,h);
    } else {
      ctx.drawImage(this.bgCanvas,0,0);
    }
  }

  _render(){
    const now=performance.now();
    this.frames++;
    if(now-this.lastFps>=500){
      this.fps=Math.round(this.frames*2);this.frames=0;this.lastFps=now;
      document.getElementById('fpsVal').textContent=this.fps;
      const fr=document.getElementById('fpsVal');
      fr.style.color=this.fps>20?'var(--accent)':this.fps>12?'#ffd43b':'#ff6b6b';
    }
    const f=this.tracker.frame(this.canvas.width,this.canvas.height);
    document.getElementById('handsVal').textContent=String(+(!!f.r.leftHandLandmarks)+(!!f.r.rightHandLandmarks));
    document.getElementById('poseVal').textContent=f.r.poseLandmarks?'Yes':'No';
    this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
    this._drawBg();
    this.mm.update(f);this.mm.draw(this.ctx,f);
    requestAnimationFrame(()=>this._render());
  }
}

window.addEventListener('DOMContentLoaded',()=>{ window.GL._app=new App(); });
})();
