window.GL = window.GL || {};
window.GL.Utils = {
  clamp: (v,a,b) => Math.max(a, Math.min(b,v)),
  lerp: (a,b,t) => a+(b-a)*t,
  dist: (a,b) => Math.hypot(a.x-b.x, a.y-b.y),
  map: (p,w,h,m=true) => ({ x: m?(1-p.x)*w:p.x*w, y:p.y*h, z:p.z??0, visibility:p.visibility??1 }),
  mid: (a,b) => ({ x:(a.x+b.x)*.5, y:(a.y+b.y)*.5 }),
  hex2rgb: (hex) => { const n=parseInt(hex.replace('#',''),16); return [n>>16,(n>>8)&255,n&255]; },
  rgba: (hex,a=1) => { const [r,g,b]=window.GL.Utils.hex2rgb(hex); return `rgba(${r},${g},${b},${a})`; },
  accent: () => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()||'#00ffe0',
  dot: (ctx,x,y,r,col,glow=0) => {
    ctx.save(); ctx.fillStyle=col;
    if(glow>0){ctx.shadowBlur=glow;ctx.shadowColor=col;}
    ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.restore();
  },
  line: (ctx,a,b,col,w=1,alpha=1) => {
    ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=col;ctx.lineWidth=w;
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.restore();
  },
  label: (ctx,txt,x,y,sz=11,col='rgba(200,240,230,0.9)',font='Space Grotesk') => {
    ctx.save();ctx.font=`600 ${sz}px "${font}",sans-serif`;ctx.fillStyle=col;ctx.fillText(txt,x,y);ctx.restore();
  },
  rand: (a,b) => a+Math.random()*(b-a),
  randInt: (a,b) => Math.floor(window.GL.Utils.rand(a,b)),
  hud: (ctx,w,h,title,tip,accent) => {
    ctx.save();
    ctx.fillStyle='rgba(4,10,20,0.78)';
    ctx.beginPath();ctx.roundRect(18,h-72,Math.max(title.length*7+tip.length*5.5+80,300),52,12);ctx.fill();
    window.GL.Utils.label(ctx,title,34,h-50,11,accent);
    window.GL.Utils.label(ctx,tip,34,h-32,10,'rgba(160,200,190,0.8)');
    ctx.restore();
  },
};
