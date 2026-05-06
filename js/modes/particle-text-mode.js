window.GL = window.GL || {};
(() => {
const U = window.GL.Utils;

class ParticleTextMode {
  constructor(shared){
    this.shared=shared;this.name='Particle Text';this.tip='Snap fingers = Thanos dissolve  •  Move hands to scatter';
    this.words=['GESTURE','FLOW','VIBE','SNAP','WAVE','SYNC','NEON','PULSE'];
    this.wIdx=0;this.customWord='';this.t=0;this.particles=[];
    this.tc=document.createElement('canvas');this.tc.width=900;this.tc.height=380;
    this.tctx=this.tc.getContext('2d',{willReadFrequently:true});
    this._w=0;this._h=0;this.colMode=0;this.colModes=['Accent','Rainbow','Fire','Ice','Void'];
    this._bounds=null;
    // thanos
    this.snapping=false;this.snapProgress=0;this.snapParticles=[];
    this.prevSnap=false;this.snapCooldown=0;
    // segmentation for thanos
    this.segCanvas=document.createElement('canvas');this.segCanvas.width=120;this.segCanvas.height=90;
    this.segCtx=this.segCanvas.getContext('2d',{willReadFrequently:true});
    this.bodyDots=[];
  }

  word(){ return (this.customWord||this.words[this.wIdx]).toUpperCase(); }

  detectSnap(hand,w,h){
    if(!hand) return false;
    const thumb=U.map(hand[4],w,h), middle=U.map(hand[12],w,h);
    return U.dist(thumb,middle)<38;
  }

  buildParticles(fw,fh){
    this._w=fw;this._h=fh;
    const wd=this.word();
    const tc=this.tctx,cv=this.tc;
    tc.clearRect(0,0,cv.width,cv.height);
    tc.fillStyle='#fff';tc.textAlign='center';tc.textBaseline='middle';
    tc.font=`900 ${wd.length>8?110:wd.length>5?145:175}px "Space Grotesk","Arial Black",sans-serif`;
    tc.fillText(wd,cv.width/2,cv.height/2);
    const img=tc.getImageData(0,0,cv.width,cv.height).data;
    const pts=[];const step=4;
    const scX=Math.min(fw*0.8,1000)/cv.width, scY=Math.min(fh*0.36,270)/cv.height;
    const ox=fw/2-(cv.width*scX)/2, oy=fh/2-(cv.height*scY)/2;
    for(let y=0;y<cv.height;y+=step) for(let x=0;x<cv.width;x+=step){
      if(img[(y*cv.width+x)*4+3]>140){
        const hx=ox+x*scX,hy=oy+y*scY;
        pts.push({x:hx+U.rand(-160,160),y:hy+U.rand(-160,160),hx,hy,vx:0,vy:0,
          sz:1.4+Math.random()*2,drift:Math.random()*Math.PI*2,alpha:0.6+Math.random()*0.4,ci:U.randInt(0,7)});
      }
    }
    this.particles=pts;this._bounds=null;
  }

  updateSeg(mask){
    if(!mask) return;
    const sc=this.segCanvas,sctx=this.segCtx;
    sctx.drawImage(mask,0,0,sc.width,sc.height);
    const d=sctx.getImageData(0,0,sc.width,sc.height).data;
    const pts=[];
    for(let y=0;y<sc.height;y+=2) for(let x=0;x<sc.width;x+=2){
      if(d[(y*sc.width+x)*4+3]>80) pts.push({nx:x/sc.width,ny:y/sc.height});
    }
    this.bodyDots=pts.slice(0,600);
  }

  triggerThanos(){
    if(this.snapping||this.snapCooldown>0) return;
    // explode particles into thanos dust
    this.snapParticles=this.particles.map(p=>({
      x:p.x,y:p.y,vx:U.rand(-8,8),vy:U.rand(-12,-2),
      life:1,size:p.sz*1.5,color:p.ci,drift:p.drift
    }));
    this.particles=[];this.snapping=true;this.snapProgress=0;this.snapCooldown=120;
    // if segmentation available, also scatter body
    for(const b of this.bodyDots){
      this.snapParticles.push({
        x:b.nx*this._w,y:b.ny*this._h,
        vx:U.rand(-12,12),vy:U.rand(-15,-3),
        life:1,size:U.rand(2,6),color:Math.floor(Math.random()*7),drift:Math.random()*6.28
      });
    }
  }

  getColor(ci,x,y,w,h){
    const accent=U.accent();
    switch(this.colMode){
      case 1:return `hsl(${(x/w*360+this.t*25)%360},100%,65%)`;
      case 2:{const t=(y/h);return `rgb(255,${Math.floor(U.lerp(30,200,1-t))},0)`;}
      case 3:return `hsl(${U.lerp(180,220,x/w)},90%,${U.lerp(60,90,Math.sin(this.t+ci*0.1)*0.5+0.5)}%)`;
      case 4:return `hsl(${270+ci*10},80%,${40+ci*5}%)`;
      default:return ci%7===0?'#ffffff':accent;
    }
  }

  getInfluence(r,w,h){
    const pts=[];
    [r.leftHandLandmarks,r.rightHandLandmarks].filter(Boolean).forEach(hand=>{
      [4,8,12,16,20].forEach(i=>pts.push(U.map(hand[i],w,h)));
    });
    return pts;
  }

  update(f){
    this.t+=0.025;if(this.snapCooldown>0)this.snapCooldown--;
    if(!this.particles.length||this._w!==f.w||this._h!==f.h) this.buildParticles(f.w,f.h);
    if(f.r.segmentationMask&&Math.random()<0.1) this.updateSeg(f.r.segmentationMask);

    const hand=f.r.rightHandLandmarks||f.r.leftHandLandmarks;
    const snap=this.detectSnap(hand,f.w,f.h);
    if(snap&&!this.prevSnap) this.triggerThanos();
    this.prevSnap=snap;

    // update snap particles
    if(this.snapping){
      this.snapProgress+=0.015;
      for(const p of this.snapParticles){
        p.x+=p.vx;p.y+=p.vy;p.vy+=0.15;p.vx*=0.97;p.life-=0.012+Math.random()*0.01;
      }
      this.snapParticles=this.snapParticles.filter(p=>p.life>0);
      if(this.snapParticles.length===0&&this.snapProgress>0.5){
        this.snapping=false;this.wIdx=(this.wIdx+1)%this.words.length;
        this.customWord='';this.particles=[];this._w=0;
      }
    }

    const inf=this.getInfluence(f.r,f.w,f.h);
    for(const p of this.particles){
      let ax=(p.hx-p.x)*0.014, ay=(p.hy-p.y)*0.014;
      for(const pt of inf){
        const dx=p.x-pt.x,dy=p.y-pt.y,d=Math.hypot(dx,dy)||1;
        if(d<130){const fo=((130-d)/130)*2.2;ax+=(dx/d)*fo;ay+=(dy/d)*fo;}
      }
      ax+=Math.sin(this.t*1.5+p.drift)*0.12;
      ay+=Math.cos(this.t*1.2+p.drift)*0.03;
      p.vx=(p.vx+ax)*0.90;p.vy=(p.vy+ay)*0.90;
      p.x+=p.vx;p.y+=p.vy;
    }
  }

  draw(ctx,f){
    const accent=U.accent();
    const inf=this.getInfluence(f.r,f.w,f.h);

    // snap particles (dust)
    for(const[i,p] of this.snapParticles.entries()){
      ctx.save();ctx.globalAlpha=p.life*p.life;
      const col=this.getColor(p.color,p.x,p.y,f.w,f.h);
      ctx.fillStyle=col;ctx.shadowBlur=8;ctx.shadowColor=col;
      ctx.beginPath();ctx.arc(p.x,p.y,p.size*p.life,0,Math.PI*2);ctx.fill();ctx.restore();
    }

    // influence cursors
    for(const pt of inf) U.dot(ctx,pt.x,pt.y,7,accent,22);

    // main particles
    for(const[i,p] of this.particles.entries()){
      const fl=0.7+Math.sin(this.t*2.8+p.drift+i*0.003)*0.22;
      ctx.save();ctx.globalAlpha=p.alpha*fl;
      const col=this.getColor(p.ci,p.hx,p.hy,f.w,f.h);
      ctx.fillStyle=col;ctx.shadowBlur=11;ctx.shadowColor=col;
      ctx.beginPath();ctx.arc(p.x,p.y,p.sz,0,Math.PI*2);ctx.fill();ctx.restore();
    }

    // color mode indicator
    ctx.save();ctx.fillStyle='rgba(4,10,20,0.76)';
    ctx.beginPath();ctx.roundRect(f.w-136,14,120,32,10);ctx.fill();
    U.label(ctx,`🎨 ${this.colModes[this.colMode]}`,f.w-124,36,11,accent);
    ctx.restore();

    // snap hint when hand detected
    if(f.r.rightHandLandmarks||f.r.leftHandLandmarks){
      const hand=f.r.rightHandLandmarks||f.r.leftHandLandmarks;
      const thumb=U.map(hand[4],f.w,f.h), mid=U.map(hand[12],f.w,f.h);
      const sd=U.dist(thumb,mid);
      if(sd<60){
        ctx.save();ctx.globalAlpha=(1-sd/60)*0.8;
        ctx.fillStyle='rgba(4,10,20,0.8)';ctx.beginPath();ctx.roundRect(f.w/2-80,80,160,34,10);ctx.fill();
        U.label(ctx,'👻 SNAP TO DISSOLVE',f.w/2-70,102,11,accent);
        ctx.restore();
      }
    }

    U.hud(ctx,f.w,f.h,'PARTICLE TEXT — '+this.word(),'Snap = Thanos dissolve  •  Clear = next word',accent);
  }

  setWord(w){ this.customWord=w.toUpperCase().trim().slice(0,12);this.particles=[];this._w=0;this._bounds=null; }
  nextColMode(){ this.colMode=(this.colMode+1)%this.colModes.length; }
  clear(){ this.wIdx=(this.wIdx+1)%this.words.length;this.customWord='';this.particles=[];this._w=0;this._bounds=null; }
  destroy(){}
}
window.GL.ParticleTextMode = ParticleTextMode;
})();
