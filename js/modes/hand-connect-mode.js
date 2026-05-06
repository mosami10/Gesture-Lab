window.GL = window.GL || {};
(() => {
const U = window.GL.Utils;
const TIPS=[4,8,12,16,20];
const HCONN=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];

class HandConnectMode {
  constructor(shared){
    this.shared=shared;this.name='Hand Connect';this.tip='Both hands = energy links + levitating orb';
    this.t=0;
    // orb physics
    this.orb={x:0,y:0,vx:0,vy:0,active:false,heldBy:null,r:28};
    this.prevL=null;this.prevR=null;
    this.orbTrail=[];
    this.particles=[];
  }

  mapHand(lms,w,h){ return lms.map(p=>U.map(p,w,h)); }

  updateOrb(mappedL,mappedR,w,h){
    const orb=this.orb;
    if(!orb.active){ orb.x=w/2; orb.y=h/2-80; orb.active=true; }

    const grab=(pts,label)=>{
      if(!pts) return false;
      const tip=pts[8], thumb=pts[4];
      const d=U.dist(tip,thumb);
      if(d<50){
        const mid={x:(tip.x+thumb.x)/2,y:(tip.y+thumb.y)/2};
        if(U.dist(mid,{x:orb.x,y:orb.y})<orb.r+30){
          orb.heldBy=label; orb.x=mid.x; orb.y=mid.y; return true;
        }
      }
      return false;
    };

    const heldL=mappedL&&grab(mappedL,'L');
    const heldR=mappedR&&grab(mappedR,'R');

    if(!heldL&&!heldR){
      orb.heldBy=null;
      // throw velocity from prev frame
      const GRAVITY=0.25, DAMPING=0.97;
      orb.vy+=GRAVITY; orb.vx*=DAMPING; orb.vy*=DAMPING;
      orb.x+=orb.vx; orb.y+=orb.vy;
      // bounce walls
      if(orb.x<orb.r){orb.x=orb.r;orb.vx*=-0.6;}
      if(orb.x>w-orb.r){orb.x=w-orb.r;orb.vx*=-0.6;}
      if(orb.y<orb.r){orb.y=orb.r;orb.vy*=-0.6;}
      if(orb.y>h-orb.r){orb.y=h-orb.r;orb.vy*=-0.6;}
    } else {
      // compute velocity for throw
      if(this.prevOrb){
        orb.vx=(orb.x-this.prevOrb.x)*0.6;
        orb.vy=(orb.y-this.prevOrb.y)*0.6;
      }
    }
    this.prevOrb={x:orb.x,y:orb.y};

    // trail
    this.orbTrail.push({x:orb.x,y:orb.y,life:1});
    if(this.orbTrail.length>20) this.orbTrail.shift();
    for(const t of this.orbTrail) t.life-=0.06;
    this.orbTrail=this.orbTrail.filter(t=>t.life>0);

    // emit particles from orb
    if(Math.random()<0.4){
      this.particles.push({
        x:orb.x+U.rand(-orb.r,orb.r)*0.6,
        y:orb.y+U.rand(-orb.r,orb.r)*0.6,
        vx:U.rand(-1.5,1.5),vy:U.rand(-2.5,-0.5),
        life:1,size:U.rand(1,4)
      });
    }
    if(this.particles.length>80) this.particles.shift();
    for(const p of this.particles){p.x+=p.vx;p.y+=p.vy;p.vy-=0.05;p.life-=0.025;}
    this.particles=this.particles.filter(p=>p.life>0);
  }

  drawHand(ctx,pts,col){
    ctx.save();ctx.strokeStyle=U.rgba(col,0.5);ctx.lineWidth=1.8;ctx.shadowBlur=0;
    for(const [a,b] of HCONN){
      if(!pts[a]||!pts[b]) continue;
      ctx.beginPath();ctx.moveTo(pts[a].x,pts[a].y);ctx.lineTo(pts[b].x,pts[b].y);ctx.stroke();
    }
    ctx.restore();
    for(const [i,p] of pts.entries()){
      const r=TIPS.includes(i)?6+Math.sin(this.t+i)*1.2:2.5;
      U.dot(ctx,p.x,p.y,r,col,TIPS.includes(i)?14:4);
    }
  }

  drawOrb(ctx,accent){
    const {x,y,r}=this.orb;
    // trail
    for(const tr of this.orbTrail){
      ctx.save();ctx.globalAlpha=tr.life*0.3;
      ctx.fillStyle=accent;ctx.shadowBlur=12;ctx.shadowColor=accent;
      ctx.beginPath();ctx.arc(tr.x,tr.y,r*tr.life*0.6,0,Math.PI*2);ctx.fill();ctx.restore();
    }
    // particles
    for(const p of this.particles){
      ctx.save();ctx.globalAlpha=p.life;ctx.fillStyle=accent;ctx.shadowBlur=8;ctx.shadowColor=accent;
      ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill();ctx.restore();
    }
    // orb body
    ctx.save();
    const gr=ctx.createRadialGradient(x-r*0.3,y-r*0.3,1,x,y,r);
    gr.addColorStop(0,'rgba(255,255,255,0.9)');
    gr.addColorStop(0.4,U.rgba(accent,0.85));
    gr.addColorStop(1,U.rgba(accent,0.1));
    ctx.fillStyle=gr;ctx.shadowBlur=40;ctx.shadowColor=accent;
    ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
    // rotating ring
    ctx.strokeStyle=U.rgba('#ffffff',0.4);ctx.lineWidth=1.5;ctx.shadowBlur=0;
    ctx.save();ctx.translate(x,y);ctx.rotate(this.t);
    ctx.beginPath();ctx.ellipse(0,0,r+6,r*0.4,0,0,Math.PI*2);ctx.stroke();
    ctx.restore();
    ctx.restore();
  }

  update(f){
    this.t+=0.06;
    const L=f.r.leftHandLandmarks, R=f.r.rightHandLandmarks;
    const mL=L?this.mapHand(L,f.w,f.h):null;
    const mR=R?this.mapHand(R,f.w,f.h):null;
    this.updateOrb(mL,mR,f.w,f.h);
    this._mL=mL;this._mR=mR;
  }

  draw(ctx,f){
    const accent=U.accent(), a2='#4dabf7';
    const mL=this._mL, mR=this._mR;

    if(!mL&&!mR){
      U.hud(ctx,f.w,f.h,'HAND CONNECT','Show hands to activate the orb',accent);
      this.drawOrb(ctx,accent);
      return;
    }
    if(mL) this.drawHand(ctx,mL,accent);
    if(mR) this.drawHand(ctx,mR,a2);

    // inter-finger bridges (normal thickness, no highlight)
    if(mL&&mR){
      TIPS.forEach((ti,i)=>{
        const a=mL[ti],b=mR[ti];
        const grad=ctx.createLinearGradient(a.x,a.y,b.x,b.y);
        grad.addColorStop(0,U.rgba(accent,0.6));
        grad.addColorStop(0.5,U.rgba('#ffffff',0.4));
        grad.addColorStop(1,U.rgba(a2,0.6));
        ctx.save();ctx.strokeStyle=grad;ctx.lineWidth=1.5;
        ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.restore();
        const tr=(Math.sin(this.t*1.8+i*0.7)+1)*0.5;
        U.dot(ctx,a.x+(b.x-a.x)*tr,a.y+(b.y-a.y)*tr,3,'#fff',10);
      });
    }
    this.drawOrb(ctx,accent);
    U.hud(ctx,f.w,f.h,'HAND CONNECT','Pinch near the orb to grab • Release to throw',accent);
  }
  clear(){this.orb.active=false;this.orbTrail=[];this.particles=[];}
  destroy(){}
}
window.GL.HandConnectMode = HandConnectMode;
})();
