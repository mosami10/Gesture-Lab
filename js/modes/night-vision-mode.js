window.GL = window.GL || {};
(() => {
const U = window.GL.Utils;
const POSE_CONN=[[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24],[23,25],[25,27],[24,26],[26,28],[27,29],[27,31],[28,30],[28,32]];

class NightVisionMode {
  constructor(shared){
    this.shared=shared;this.name='Night Vision';this.tip='Your body glows green — hold still for full scan';
    this.t=0;
    // segmentation dots
    this.sc=document.createElement('canvas');this.sc.width=200;this.sc.height=150;
    this.sctx=this.sc.getContext('2d',{willReadFrequently:true});
    this.bodyDots=[];this.lastSeg=0;this.frame=0;
    // noise overlay
    this.noiseCanvas=document.createElement('canvas');
    this.noiseCanvas.width=320;this.noiseCanvas.height=240;
    this.nctx=this.noiseCanvas.getContext('2d');
    this.scanLine=0;
  }

  updateSeg(mask,fw,fh){
    if(!mask) return;
    this.sctx.drawImage(mask,0,0,this.sc.width,this.sc.height);
    const d=this.sctx.getImageData(0,0,this.sc.width,this.sc.height).data;
    const pts=[];
    for(let y=0;y<this.sc.height;y+=1) for(let x=0;x<this.sc.width;x+=1){
      if(d[(y*this.sc.width+x)*4+3]>60){
        pts.push({
          nx:x/this.sc.width,ny:y/this.sc.height,
          bright:0.5+Math.random()*0.5,
          sz:1+Math.random()*2.5
        });
      }
    }
    this.bodyDots=pts;
  }

  drawNoise(ctx,w,h){
    const nc=this.nctx,nv=this.noiseCanvas;
    nc.clearRect(0,0,nv.width,nv.height);
    const id=nc.createImageData(nv.width,nv.height);
    for(let i=0;i<id.data.length;i+=4){
      const v=Math.random()>0.97?Math.floor(Math.random()*80):0;
      id.data[i]=0;id.data[i+1]=v;id.data[i+2]=0;id.data[i+3]=v*1.5;
    }
    nc.putImageData(id,0,0);
    ctx.save();ctx.globalAlpha=0.35;
    ctx.drawImage(nv,0,0,w,h);ctx.restore();
  }

  update(f){
    this.t+=0.04;this.frame++;
    this.scanLine=(this.scanLine+2.5)%f.h;
    if(this.frame-this.lastSeg>5){
      this.updateSeg(f.r.segmentationMask,f.w,f.h);
      this.lastSeg=this.frame;
    }
  }

  draw(ctx,f){
    const {w,h}=f;
    // full dark overlay
    ctx.save();ctx.fillStyle='rgba(0,8,0,0.72)';ctx.fillRect(0,0,w,h);ctx.restore();

    // body silhouette dot cloud
    for(const[i,p] of this.bodyDots.entries()){
      const px=p.nx*w,py=p.ny*h;
      const pulse=0.6+Math.sin(this.t*2+i*0.005)*0.35;
      const bright=p.bright*pulse;
      ctx.save();ctx.globalAlpha=bright;
      const g=35+Math.floor(bright*180);
      ctx.fillStyle=`rgb(0,${g},0)`;
      ctx.shadowBlur=bright>0.7?12:4;ctx.shadowColor=`rgb(0,${g},0)`;
      ctx.fillRect(px,py,p.sz,p.sz);
      ctx.restore();
    }

    // vignette
    const vig=ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,Math.max(w,h)*0.6);
    vig.addColorStop(0,'rgba(0,0,0,0)');vig.addColorStop(1,'rgba(0,20,0,0.7)');
    ctx.fillStyle=vig;ctx.fillRect(0,0,w,h);

    // scanline
    ctx.save();
    const sg=ctx.createLinearGradient(0,this.scanLine-20,0,this.scanLine+10);
    sg.addColorStop(0,'rgba(0,255,0,0)');sg.addColorStop(0.6,'rgba(0,255,0,0.04)');
    sg.addColorStop(1,'rgba(0,255,0,0.22)');
    ctx.fillStyle=sg;ctx.fillRect(0,this.scanLine-20,w,30);ctx.restore();

    // noise
    this.drawNoise(ctx,w,h);

    // corner UI elements (NV goggles HUD)
    ctx.save();ctx.strokeStyle='rgba(0,255,0,0.3)';ctx.lineWidth=1;
    // corner brackets
    const bw=40,bh=30;
    [[20,20],[w-60,20],[20,h-50],[w-60,h-50]].forEach(([bx,by])=>{
      ctx.beginPath();ctx.moveTo(bx+bw,by);ctx.lineTo(bx,by);ctx.lineTo(bx,by+bh);ctx.stroke();
      ctx.beginPath();ctx.moveTo(bx,by+bh+10);ctx.lineTo(bx+bw+20,by+bh+10);ctx.stroke();
    });
    ctx.restore();

    // labels
    U.label(ctx,'NV-CAM ●',22,48,10,'rgba(0,220,0,0.7)');
    U.label(ctx,'REC',w-50,48,10,'rgba(0,220,0,0.5)');
    U.label(ctx,`${Math.floor(this.t*8)%100+900} MHz`,w-80,h-30,9,'rgba(0,200,0,0.5)');

    if(!this.bodyDots.length){
      ctx.save();ctx.fillStyle='rgba(0,30,0,0.85)';
      ctx.beginPath();ctx.roundRect(w/2-150,h/2-28,300,54,12);ctx.fill();
      U.label(ctx,'SCANNING… STEP INTO VIEW',w/2-120,h/2+2,12,'rgba(0,255,0,0.8)');
      ctx.restore();
    }

    U.hud(ctx,w,h,'NIGHT VISION','Body silhouette thermal scan','#00ff40');
  }
  clear(){this.bodyDots=[];}
  destroy(){}
}
window.GL.NightVisionMode = NightVisionMode;
})();
