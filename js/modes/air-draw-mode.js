window.GL = window.GL || {};
(() => {
const U = window.GL.Utils;

class AirDrawMode {
  constructor(shared) {
    this.shared=shared; this.name='Air Draw';
    this.tip='Pinch = draw/erase (tap toggles)  •  Peace sign = spray  •  Open palm = clear trail';
    this.t=0; this.strokes=[]; this.cur=null; this.drawing=false;
    this.erasing=false; this.mode='draw'; // draw | erase | spray
    this.prevPinch=false;
    this.sprayParticles=[];
    this.palette=['#00ffe0','#ff6b9d','#ffd43b','#4dabf7','#c77dff','#ff6b6b','#69db7c','#ff9f43'];
    this.colIdx=0;
    this.dc=null; this.dctx=null; // persistent draw canvas
  }

  init() {
    this.dc=document.createElement('canvas');
    this.dc.width=window.innerWidth; this.dc.height=window.innerHeight;
    this.dctx=this.dc.getContext('2d');
  }

  color() { return this.palette[this.colIdx%this.palette.length]; }

  detectGestures(hand,w,h) {
    const tip = U.map(hand[8],w,h), thumb = U.map(hand[4],w,h);
    const mid = U.map(hand[12],w,h), ring = U.map(hand[16],w,h);
    const pinky = U.map(hand[20],w,h), wrist = U.map(hand[0],w,h);
    const pinch = U.dist(tip,thumb) < 46;
    const peace = U.dist(tip,wrist)>80 && U.dist(mid,wrist)>80 && U.dist(ring,wrist)<60 && U.dist(pinky,wrist)<60;
    const palm = [8,12,16,20].every(i=>U.dist(U.map(hand[i],w,h),wrist)>90);
    return {pinch,peace,palm,tip,thumb,mid};
  }

  update(f) {
    this.t+=0.05;
    const hand = f.r.rightHandLandmarks||f.r.leftHandLandmarks;
    if(!hand){this.drawing=false;this.cur=null;return;}
    const g = this.detectGestures(hand,f.w,f.h);

    // tap to toggle draw/erase
    if(g.pinch && !this.prevPinch) {
      if(this.mode==='draw') this.mode='erase';
      else { this.mode='draw'; this.colIdx++; }
    }
    this.prevPinch=g.pinch;

    // open palm = color cycle
    if(g.palm && Math.random()<0.02) this.colIdx++;

    // spray mode
    if(g.peace) {
      for(let i=0;i<3;i++) {
        this.sprayParticles.push({
          x:g.tip.x+U.rand(-30,30), y:g.tip.y+U.rand(-30,30),
          vx:U.rand(-2,2), vy:U.rand(-3,0.5),
          life:1, size:U.rand(1,4), color:this.color()
        });
      }
      this.drawing=false; this.cur=null;
      return;
    }

    if(g.pinch) {
      if(this.mode==='erase') {
        if(this.dctx){
          this.dctx.save();
          this.dctx.globalCompositeOperation='destination-out';
          this.dctx.beginPath();this.dctx.arc(g.tip.x,g.tip.y,28,0,Math.PI*2);this.dctx.fill();
          this.dctx.restore();
        }
      } else {
        if(!this.drawing){
          this.cur={color:this.color(),pts:[]};
          this.strokes.push(this.cur);
          if(this.strokes.length>40) this.strokes.shift();
        }
        this.drawing=true;
        const pts=this.cur.pts, last=pts[pts.length-1];
        if(!last||U.dist(last,g.tip)>2) pts.push({x:g.tip.x,y:g.tip.y});
        if(pts.length>300) pts.shift();
        // paint to persistent canvas
        if(this.dctx&&pts.length>=2){
          const p1=pts[pts.length-2],p2=pts[pts.length-1],col=this.cur.color;
          const dc=this.dctx;
          dc.save();dc.lineCap='round';dc.lineJoin='round';
          dc.strokeStyle=U.rgba(col,0.12);dc.lineWidth=26;dc.shadowBlur=22;dc.shadowColor=col;
          dc.beginPath();dc.moveTo(p1.x,p1.y);dc.lineTo(p2.x,p2.y);dc.stroke();
          dc.strokeStyle=U.rgba(col,0.5);dc.lineWidth=10;dc.shadowBlur=12;
          dc.beginPath();dc.moveTo(p1.x,p1.y);dc.lineTo(p2.x,p2.y);dc.stroke();
          dc.strokeStyle='rgba(255,255,255,0.9)';dc.lineWidth=2.5;dc.shadowBlur=0;
          dc.beginPath();dc.moveTo(p1.x,p1.y);dc.lineTo(p2.x,p2.y);dc.stroke();
          dc.restore();
        }
      }
    } else {
      this.drawing=false; this.cur=null;
    }

    for(const p of this.sprayParticles){p.x+=p.vx;p.y+=p.vy;p.vy-=0.05;p.life-=0.02;}
    this.sprayParticles=this.sprayParticles.filter(p=>p.life>0);
  }

  draw(ctx,f) {
    const hand = f.r.rightHandLandmarks||f.r.leftHandLandmarks;
    const col = this.color();

    if(this.dc) ctx.drawImage(this.dc,0,0);

    // spray particles
    for(const p of this.sprayParticles){
      ctx.save();ctx.globalAlpha=p.life;
      ctx.fillStyle=p.color;ctx.shadowBlur=8;ctx.shadowColor=p.color;
      ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill();ctx.restore();
    }

    if(hand){
      const g=this.detectGestures(hand,f.w,f.h);
      const active=g.pinch;
      if(this.mode==='erase'){
        ctx.save();ctx.strokeStyle='rgba(255,255,255,0.5)';ctx.lineWidth=2;
        ctx.beginPath();ctx.arc(g.tip.x,g.tip.y,28,0,Math.PI*2);ctx.stroke();ctx.restore();
      } else {
        for(let i=0;i<4;i++){
          const ang=this.t*2.5+i*Math.PI/2, r=active?22:12;
          U.dot(ctx,g.tip.x+Math.cos(ang)*r,g.tip.y+Math.sin(ang)*r,2.5,col,8);
        }
        U.dot(ctx,g.tip.x,g.tip.y,active?12:8,col,30);
        U.dot(ctx,g.thumb.x,g.thumb.y,7,active?col:'rgba(255,255,255,0.4)',12);
        if(active){
          ctx.save();ctx.strokeStyle=U.rgba(col,0.3);ctx.lineWidth=2;
          ctx.beginPath();ctx.arc(g.tip.x,g.tip.y,26+Math.sin(this.t*4)*3,0,Math.PI*2);ctx.stroke();ctx.restore();
        }
      }
    }

    // colour strip
    this.palette.forEach((c,i)=>{
      ctx.save();ctx.fillStyle=c;
      if(i===this.colIdx%this.palette.length){ctx.shadowBlur=14;ctx.shadowColor=c;}
      ctx.beginPath();ctx.arc(22+i*28,22,10,0,Math.PI*2);ctx.fill();
      if(i===this.colIdx%this.palette.length){
        ctx.strokeStyle='#fff';ctx.lineWidth=2;
        ctx.beginPath();ctx.arc(22+i*28,22,13,0,Math.PI*2);ctx.stroke();
      }
      ctx.restore();
    });

    // mode badge
    const modeCol = this.mode==='erase' ? '#ff6b6b' : col;
    ctx.save();ctx.fillStyle='rgba(4,10,20,0.78)';
    ctx.beginPath();ctx.roundRect(f.w-130,14,114,32,10);ctx.fill();
    U.label(ctx,(this.mode==='erase'?'⬜ ERASE':'✏️ DRAW'),f.w-118,36,11,modeCol);
    ctx.restore();

    U.hud(ctx,f.w,f.h,'AIR DRAW','Pinch toggles draw/erase  •  Peace sign = spray',col);
  }

  clear(){
    this.strokes=[];this.cur=null;
    if(this.dctx) this.dctx.clearRect(0,0,this.dc.width,this.dc.height);
    this.sprayParticles=[];
  }
  destroy(){this.dc=null;this.dctx=null;}
}
window.GL.AirDrawMode = AirDrawMode;
})();
