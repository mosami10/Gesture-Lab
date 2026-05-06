window.GL = window.GL || {};
(() => {
const U = window.GL.Utils;
const POSE_CONN=[[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24],[23,25],[25,27],[24,26],[26,28]];
const HAND_CONN=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];

class CloneTrailMode {
  constructor(shared){
    this.shared=shared;this.name='Clone Trail';this.tip='Move your body — leave ghost echoes behind';
    this.t=0;this.clones=[];this.maxClones=12;this.captureTimer=0;
    this.captureInterval=8; // frames between captures
    this.hueShift=0;
  }

  captureFrame(r,w,h){
    if(!r.poseLandmarks&&!r.leftHandLandmarks&&!r.rightHandLandmarks) return;
    const clone={
      pose:r.poseLandmarks?r.poseLandmarks.map(p=>U.map(p,w,h)):null,
      lh:r.leftHandLandmarks?r.leftHandLandmarks.map(p=>U.map(p,w,h)):null,
      rh:r.rightHandLandmarks?r.rightHandLandmarks.map(p=>U.map(p,w,h)):null,
      life:1, hue:(this.hueShift)%360, created:this.t
    };
    this.clones.push(clone);
    if(this.clones.length>this.maxClones) this.clones.shift();
    this.hueShift+=24;
  }

  update(f){
    this.t+=0.04;this.captureTimer++;
    if(this.captureTimer>=this.captureInterval){
      this.captureFrame(f.r,f.w,f.h);
      this.captureTimer=0;
    }
    for(const c of this.clones) c.life-=0.008;
    this.clones=this.clones.filter(c=>c.life>0);
  }

  drawSkel(ctx,pts,conn,col,alpha,lw=1.5){
    if(!pts) return;
    ctx.save();ctx.globalAlpha=alpha;
    ctx.strokeStyle=col;ctx.lineWidth=lw;ctx.shadowBlur=12;ctx.shadowColor=col;
    for(const [a,b] of conn){
      if(!pts[a]||!pts[b]) continue;
      ctx.beginPath();ctx.moveTo(pts[a].x,pts[a].y);ctx.lineTo(pts[b].x,pts[b].y);ctx.stroke();
    }
    ctx.restore();
    for(const p of pts) U.dot(ctx,p.x,p.y,2.5,col,alpha*0.3>0.01?6:0);
  }

  draw(ctx,f){
    const accent=U.accent();
    // draw clones oldest→newest (older = more transparent)
    for(const [i,clone] of this.clones.entries()){
      const age=i/this.clones.length; // 0=oldest, 1=newest
      const alpha=clone.life*(0.1+age*0.55);
      const col=`hsl(${clone.hue},90%,65%)`;
      if(clone.pose) this.drawSkel(ctx,clone.pose,POSE_CONN,col,alpha,2);
      if(clone.lh) this.drawSkel(ctx,clone.lh,HAND_CONN,col,alpha*0.9,1.5);
      if(clone.rh) this.drawSkel(ctx,clone.rh,HAND_CONN,col,alpha*0.9,1.5);
    }
    // draw live frame on top (brightest)
    const live={
      pose:f.r.poseLandmarks?f.r.poseLandmarks.map(p=>U.map(p,f.w,f.h)):null,
      lh:f.r.leftHandLandmarks?f.r.leftHandLandmarks.map(p=>U.map(p,f.w,f.h)):null,
      rh:f.r.rightHandLandmarks?f.r.rightHandLandmarks.map(p=>U.map(p,f.w,f.h)):null,
    };
    if(live.pose) this.drawSkel(ctx,live.pose,POSE_CONN,accent,0.9,2.5);
    if(live.lh) this.drawSkel(ctx,live.lh,HAND_CONN,'#ff6b9d',0.9,2);
    if(live.rh) this.drawSkel(ctx,live.rh,HAND_CONN,'#ffd43b',0.9,2);

    if(!live.pose&&!live.lh&&!live.rh){
      ctx.save();ctx.fillStyle='rgba(4,10,20,0.8)';
      ctx.beginPath();ctx.roundRect(f.w/2-140,f.h/2-24,280,46,12);ctx.fill();
      U.label(ctx,'STEP INTO VIEW TO START',f.w/2-110,f.h/2+4,12,accent);
      ctx.restore();
    }

    U.hud(ctx,f.w,f.h,'CLONE TRAIL','Move around — your echoes follow',accent);
  }
  clear(){this.clones=[];}
  destroy(){}
}
window.GL.CloneTrailMode = CloneTrailMode;
})();
