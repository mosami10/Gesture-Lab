window.GL = window.GL || {};
(() => {
const U = window.GL.Utils;
const TIPS=[4,8,12,16,20];

class GravitySandboxMode {
  constructor(shared){
    this.shared=shared;this.name='Gravity Sandbox';this.tip='Clear = cycle Repel → Attract → Vortex → Wormhole';
    this.t=0;this.particles=[];this.maxP=350;
    this.mode=0;this.modes=['Repel','Attract','Vortex','Wormhole'];
    this.gravity=0.2;this.lastSpawn=0;
    this._init();
  }

  _newP(x,y){
    const cols=['#00ffe0','#ff6b9d','#ffd43b','#4dabf7','#c77dff'];
    return {x,y,vx:U.rand(-2,2),vy:U.rand(-1.5,1.5),
      sz:1.8+Math.random()*3.5,col:cols[U.randInt(0,5)],
      life:1,decay:0.0015+Math.random()*0.002,trail:[]};
  }

  _init(){
    this.particles=[];
    for(let i=0;i<this.maxP;i++) this.particles.push(this._newP(U.rand(0,window.innerWidth),U.rand(0,window.innerHeight)));
  }

  update(f){
    this.t+=0.04;
    const w=f.w,h=f.h;
    if(performance.now()-this.lastSpawn>50&&this.particles.length<this.maxP){
      this.particles.push(this._newP(U.rand(0,w),-10));
      this.lastSpawn=performance.now();
    }
    const inf=[];
    [f.r.leftHandLandmarks,f.r.rightHandLandmarks].filter(Boolean).forEach(hand=>{
      for(const ti of TIPS) inf.push(U.map(hand[ti],w,h));
    });

    for(const p of this.particles){
      p.trail.push({x:p.x,y:p.y});
      if(p.trail.length>14) p.trail.shift();
      let ax=0,ay=this.gravity;
      for(const pt of inf){
        const dx=pt.x-p.x,dy=pt.y-p.y,d=Math.hypot(dx,dy)||1;
        const R=130,f2=((R-d)/R)*4;
        if(d<R){
          if(this.mode===0){ax-=(dx/d)*f2;ay-=(dy/d)*f2;}
          else if(this.mode===1){ax+=(dx/d)*f2*0.8;ay+=(dy/d)*f2*0.8;}
          else if(this.mode===2){ax+=(-dy/d)*f2;ay+=(dx/d)*f2;}
          else{ // wormhole: suck toward center then shoot up
            const cx=w/2,cy=h/2;
            ax+=(cx-p.x)*0.015;ay+=(cy-p.y)*0.015-2;
          }
        }
      }
      p.vx=(p.vx+ax)*0.95;p.vy=(p.vy+ay)*0.95;
      p.vx=U.clamp(p.vx,-18,18);p.vy=U.clamp(p.vy,-18,18);
      p.x+=p.vx;p.y+=p.vy;
      if(p.x<0){p.x=0;p.vx*=-0.5;}if(p.x>w){p.x=w;p.vx*=-0.5;}
      if(p.y>h+30){p.x=U.rand(0,w);p.y=-10;p.vx=U.rand(-2,2);p.vy=0;p.trail=[];}
      p.life-=p.decay;
    }
    this.particles=this.particles.filter(p=>p.life>0);
    while(this.particles.length<this.maxP*0.7) this.particles.push(this._newP(U.rand(0,f.w),-10));
  }

  draw(ctx,f){
    const accent=U.accent();
    // wormhole center
    if(this.mode===3){
      const cx=f.w/2,cy=f.h/2;
      ctx.save();
      const gr=ctx.createRadialGradient(cx,cy,0,cx,cy,100);
      gr.addColorStop(0,U.rgba(accent,0.4));gr.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=gr;ctx.beginPath();ctx.arc(cx,cy,100,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle=U.rgba(accent,0.2);ctx.lineWidth=1.5;
      for(let i=1;i<=3;i++){
        ctx.beginPath();ctx.arc(cx,cy,i*30+Math.sin(this.t*2+i)*5,0,Math.PI*2);ctx.stroke();
      }
      ctx.restore();
    }

    for(const p of this.particles){
      for(let i=0;i<p.trail.length-1;i++){
        const a=p.trail[i],b=p.trail[i+1];
        ctx.save();ctx.globalAlpha=(i/p.trail.length)*p.life*0.4;
        ctx.strokeStyle=p.col;ctx.lineWidth=p.sz*0.5;
        ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.restore();
      }
      U.dot(ctx,p.x,p.y,p.sz*p.life,p.col,8*p.life);
    }

    // hand influence circles
    [f.r.leftHandLandmarks,f.r.rightHandLandmarks].filter(Boolean).forEach((hand,hi)=>{
      const col=hi===0?accent:'#ff6b9d';
      for(const ti of TIPS){
        const pt=U.map(hand[ti],f.w,f.h);
        ctx.save();ctx.strokeStyle=U.rgba(col,0.18);ctx.lineWidth=1.5;
        ctx.beginPath();ctx.arc(pt.x,pt.y,130,0,Math.PI*2);ctx.stroke();ctx.restore();
        U.dot(ctx,pt.x,pt.y,8,col,22);
      }
    });

    const modeIcon=['↗','↙','↻','⬤'][this.mode];
    ctx.save();ctx.fillStyle='rgba(4,10,20,0.78)';
    ctx.beginPath();ctx.roundRect(f.w-130,14,114,32,10);ctx.fill();
    U.label(ctx,`${modeIcon} ${this.modes[this.mode]}`,f.w-118,36,11,accent);ctx.restore();

    U.hud(ctx,f.w,f.h,'GRAVITY SANDBOX','Clear = Repel→Attract→Vortex→Wormhole',accent);
  }
  clear(){this.mode=(this.mode+1)%this.modes.length;}
  destroy(){}
}
window.GL.GravitySandboxMode = GravitySandboxMode;
})();
