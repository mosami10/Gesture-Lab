window.GL = window.GL || {};
(() => {
const U = window.GL.Utils;
const TIPS=[4,8,12,16,20];

class NeonRippleMode {
  constructor(shared){
    this.shared=shared;this.name='Neon Ripple';this.tip='Move fast = big chromatic rings  •  Slow = gentle pulses';
    this.t=0;this.ripples=[];this.trails=[];this.prevTips={};
    this.audioRipples=[];this.beatTimer=0;
  }

  spawn(x,y,col,speed=1,type='normal'){
    if(this.ripples.length>=100) this.ripples.shift();
    this.ripples.push({x,y,r:0,maxR:70+Math.random()*80,life:1,
      decay:0.011+Math.random()*0.009,color:col,speed:2+Math.random()*2*speed,
      lw:1.2+Math.random()*2,type});
  }

  update(f){
    this.t+=0.04;this.beatTimer++;
    const accent=U.accent();
    const cols=[accent,'#ff6b9d','#ffd43b','#4dabf7'];
    const hands=[f.r.leftHandLandmarks,f.r.rightHandLandmarks].filter(Boolean);

    for(const [hi,hand] of hands.entries()){
      for(const [ti,tipIdx] of TIPS.entries()){
        const pt=U.map(hand[tipIdx],f.w,f.h);
        const key=`${hi}_${ti}`;
        const prev=this.prevTips[key];
        if(prev){
          const spd=U.dist(pt,prev);
          if(spd>5){
            const col=cols[(hi*3+ti)%cols.length];
            this.spawn(pt.x,pt.y,col,spd/18,'velocity');
            this.trails.push({x:pt.x,y:pt.y,life:1,size:3+spd*0.08,color:col});
          }
        }
        this.prevTips[key]={x:pt.x,y:pt.y};
      }
    }

    // ambient pulse every 90 frames
    if(this.beatTimer%90===0){
      this.spawn(f.w/2+U.rand(-100,100),f.h/2+U.rand(-80,80),accent,0.3,'ambient');
    }

    for(const r of this.ripples){r.r+=r.speed;r.life-=r.decay;}
    for(const t of this.trails) t.life-=0.05;
    this.ripples=this.ripples.filter(r=>r.life>0&&r.r<r.maxR);
    this.trails=this.trails.filter(t=>t.life>0);
  }

  draw(ctx,f){
    const accent=U.accent();

    // trails
    for(const t of this.trails){
      ctx.save();ctx.globalAlpha=t.life*0.7;
      ctx.fillStyle=t.color;ctx.shadowBlur=14;ctx.shadowColor=t.color;
      ctx.beginPath();ctx.arc(t.x,t.y,t.size*t.life,0,Math.PI*2);ctx.fill();ctx.restore();
    }

    // ripples with chromatic aberration on fast ones
    for(const r of this.ripples){
      const prog=r.r/r.maxR;
      const alpha=r.life*(1-prog*0.5);

      if(r.type==='velocity'&&r.r>15){
        // chromatic: offset R and B channels slightly
        [-3,0,3].forEach((off,i)=>{
          const chCol=i===0?'rgba(255,0,80,':(i===2?'rgba(0,220,255,':U.rgba(r.color,'')+',');
          const chAlpha=i===1?alpha:alpha*0.4;
          ctx.save();ctx.globalAlpha=chAlpha;
          ctx.strokeStyle=i===0?`rgba(255,50,100,${alpha*0.4})`:i===2?`rgba(0,200,255,${alpha*0.4})`:r.color;
          ctx.lineWidth=r.lw*(1-prog*0.5);
          ctx.shadowBlur=i===1?20*r.life:0;ctx.shadowColor=r.color;
          ctx.beginPath();ctx.arc(r.x+off,r.y,r.r,0,Math.PI*2);ctx.stroke();
          ctx.restore();
        });
      } else {
        ctx.save();ctx.globalAlpha=alpha;
        ctx.strokeStyle=r.color;ctx.lineWidth=r.lw*(1-prog*0.5);
        ctx.shadowBlur=16*r.life;ctx.shadowColor=r.color;
        ctx.beginPath();ctx.arc(r.x,r.y,r.r,0,Math.PI*2);ctx.stroke();
        if(r.r>18){
          ctx.globalAlpha*=0.3;ctx.lineWidth*=0.5;
          ctx.beginPath();ctx.arc(r.x,r.y,r.r*0.55,0,Math.PI*2);ctx.stroke();
        }
        ctx.restore();
      }
    }

    // hand dots
    [f.r.leftHandLandmarks,f.r.rightHandLandmarks].filter(Boolean).forEach((hand,hi)=>{
      const col=hi===0?accent:'#ff6b9d';
      for(const ti of TIPS) U.dot(ctx,U.map(hand[ti],f.w,f.h).x,U.map(hand[ti],f.w,f.h).y,6,col,18);
    });

    U.hud(ctx,f.w,f.h,'NEON RIPPLE','Move fast = big chromatic rings',accent);
  }
  clear(){this.ripples=[];this.trails=[];this.prevTips={};}
  destroy(){}
}
window.GL.NeonRippleMode = NeonRippleMode;
})();
