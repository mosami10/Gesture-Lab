window.GL = window.GL || {};
(() => {
const U = window.GL.Utils;
const FACE_CONN = [
  [10,338],[338,297],[297,332],[332,284],[284,251],[251,389],[389,356],[356,454],
  [454,323],[323,361],[361,288],[288,397],[397,365],[365,379],[379,378],[378,400],
  [400,377],[377,152],[152,148],[148,176],[176,149],[149,150],[150,136],[136,172],
  [172,58],[58,132],[132,93],[93,234],[234,127],[127,162],[162,21],[21,54],
  [54,103],[103,67],[67,109],[109,10],
];
const POSE_CONN = [[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24],[23,25],[25,27],[24,26],[26,28]];
const HAND_CONN = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];

const ROASTS = [
  ["Jawline", "Bro your jawline called. It wants to be found.", "Try mewing. Actually try anything.", "PSL: 4.2"],
  ["Canthal Tilt", "Slight negative canthal tilt. Prey eyes detected.", "Hunter eyes are not in your immediate future.", "PSL: 4.8"],
  ["Midface", "Long midface ratio. The classics.", "Mewing won't fix this but keep going champ.", "PSL: 4.5"],
  ["Cheekbones", "Cheekbones are playing hide and seek. They're winning.", "Body fat % suggestions: lower it.", "PSL: 5.1"],
  ["Symmetry", "Face symmetry: 73%. The other 27% is character.", "Technically everyone is asymmetric. You're just more honest about it.", "PSL: 5.3"],
  ["Overall", "NPC detected. Reroll at character creation.", "You have strong 'background character' energy right now.", "PSL: 4.7"],
  ["Frame", "Neck-to-head ratio suggests insufficient frame.", "Start with neck curls. Not joking.", "PSL: 5.0"],
  ["Eye Area", "Upper eyelid exposure: moderate. Not hunter eyes.", "You could look worse. You could also look better.", "PSL: 4.9"],
];

const TIPS_GOOD = [
  "Mew consistently — tongue on roof of mouth 24/7",
  "Lose body fat — face fat hides bone structure",
  "Fix your sleep — HGH is free and powerful",
  "Straight posture — instant PSL +0.5",
  "Grow a beard if you can — covers weak chin",
  "Skincare morning + night — texture matters",
  "Lift heavy — frame is underrated",
  "Get a good haircut — shape your face better",
];

const SCAN_COLORS = ['#00ffe0','#ff6b9d','#ffd43b','#4dabf7','#ff6b6b','#c77dff'];

class DebugMode {
  constructor(shared) {
    this.shared=shared; this.name='Debug / Scan'; this.tip='Namaste gesture = looksmax roast • Tap fingers = change scan colour';
    this.t=0; this.scanCol=0; this.roastActive=false; this.roastData=null; this.roastTimer=0;
    this.prevPinch=false; this.scanPulse=0;
  }

  getScanColor() { return SCAN_COLORS[this.scanCol % SCAN_COLORS.length]; }

  detectNameste(r) {
    // both wrists close together + both palm bases close = namaste
    const lw = r.leftHandLandmarks, rw = r.rightHandLandmarks;
    if (!lw||!rw) return false;
    const lBase = lw[0], rBase = rw[0];
    const dist = Math.hypot(lBase.x-rBase.x, lBase.y-rBase.y);
    return dist < 0.1;
  }

  detectFingerTap(r) {
    const hand = r.rightHandLandmarks||r.leftHandLandmarks;
    if (!hand) return false;
    const tip = hand[8], thumb = hand[4];
    const d = Math.hypot(tip.x-thumb.x, tip.y-thumb.y);
    return d < 0.04;
  }

  triggerRoast() {
    const r = ROASTS[Math.floor(Math.random()*ROASTS.length)];
    const tip = TIPS_GOOD[Math.floor(Math.random()*TIPS_GOOD.length)];
    this.roastData = { category: r[0], line1: r[1], line2: r[2], psl: r[3], tip };
    this.roastActive = true; this.roastTimer = 280;
  }

  update(f) {
    this.t += 0.04; this.scanPulse += 0.08;
    if (this.roastTimer > 0) this.roastTimer--;
    else this.roastActive = false;

    const tap = this.detectFingerTap(f.r);
    if (tap && !this.prevPinch) { this.scanCol++; }
    this.prevPinch = tap;

    if (this.detectNameste(f.r) && !this.roastActive) this.triggerRoast();
  }

  drawSkel(ctx, lms, conn, col, w, h, dr=2, lw=1) {
    const pts = lms.map(p => U.map(p,w,h));
    ctx.save(); ctx.strokeStyle=U.rgba(col,0.5); ctx.lineWidth=lw;
    ctx.shadowBlur=8; ctx.shadowColor=col;
    for (const [a,b] of conn) {
      if(!pts[a]||!pts[b]) continue;
      ctx.beginPath();ctx.moveTo(pts[a].x,pts[a].y);ctx.lineTo(pts[b].x,pts[b].y);ctx.stroke();
    }
    ctx.restore();
    for (const p of pts) U.dot(ctx,p.x,p.y,dr,col,5);
  }

  draw(ctx, f) {
    const {w,h,r} = f;
    const col = this.getScanColor();

    // scan line across full screen
    const sy = (Math.sin(this.t*0.8)+1)*0.5*h;
    const sg = ctx.createLinearGradient(0,sy-40,0,sy+8);
    sg.addColorStop(0,'rgba(0,0,0,0)');
    sg.addColorStop(0.7,U.rgba(col,0.06));
    sg.addColorStop(1,U.rgba(col,0.35));
    ctx.fillStyle=sg; ctx.fillRect(0,sy-40,w,48);

    // face mesh
    if(r.faceLandmarks) this.drawSkel(ctx,r.faceLandmarks,FACE_CONN,'#4dabf7',w,h,1,0.5);
    // pose
    if(r.poseLandmarks) this.drawSkel(ctx,r.poseLandmarks,POSE_CONN,col,w,h,3,1.5);
    // hands
    if(r.leftHandLandmarks) this.drawSkel(ctx,r.leftHandLandmarks,HAND_CONN,'#ff6b9d',w,h,4,2);
    if(r.rightHandLandmarks) this.drawSkel(ctx,r.rightHandLandmarks,HAND_CONN,'#ffd43b',w,h,4,2);

    // legend
    ctx.save();
    ctx.fillStyle='rgba(4,10,20,0.72)';
    ctx.beginPath();ctx.roundRect(18,h-120,230,100,12);ctx.fill();
    U.label(ctx,'● FACE MESH',34,h-100,10,'#4dabf7');
    U.label(ctx,'● POSE',34,h-82,10,col);
    U.label(ctx,'● LEFT HAND',34,h-64,10,'#ff6b9d');
    U.label(ctx,'● RIGHT HAND',34,h-46,10,'#ffd43b');
    U.label(ctx,'Tap fingers = change colour  •  Namaste = roast',34,h-28,10,'rgba(160,200,190,0.7)');
    ctx.restore();

    // ROAST CARD
    if (this.roastActive && this.roastData) {
      const rd = this.roastData;
      const alpha = this.roastTimer > 240 ? 1 : this.roastTimer/240;
      const cw=420, ch=160, cx=(w-cw)/2, cy=h/2-ch/2-60;
      ctx.save(); ctx.globalAlpha=alpha;
      // glow border
      ctx.shadowBlur=30; ctx.shadowColor=col;
      ctx.strokeStyle=col; ctx.lineWidth=1.5;
      ctx.fillStyle='rgba(4,10,22,0.94)';
      ctx.beginPath();ctx.roundRect(cx,cy,cw,ch,16);ctx.fill();ctx.stroke();
      ctx.shadowBlur=0;
      // header
      ctx.fillStyle=U.rgba(col,0.15);
      ctx.beginPath();ctx.roundRect(cx,cy,cw,36,{upperLeft:16,upperRight:16,lowerLeft:0,lowerRight:0});ctx.fill();
      U.label(ctx,'⚡ LOOKSMAX SCAN — '+rd.category.toUpperCase(),cx+16,cy+22,11,col);
      U.label(ctx,rd.psl,cx+cw-60,cy+22,11,'rgba(255,255,255,0.5)');
      U.label(ctx,rd.line1,cx+16,cy+60,13,'rgba(255,220,220,0.95)');
      U.label(ctx,rd.line2,cx+16,cy+82,12,'rgba(180,200,210,0.8)');
      // tip
      ctx.strokeStyle=U.rgba(col,0.2); ctx.lineWidth=0.5;
      ctx.beginPath();ctx.moveTo(cx+16,cy+100);ctx.lineTo(cx+cw-16,cy+100);ctx.stroke();
      U.label(ctx,'FIX: '+rd.tip,cx+16,cy+120,11,'rgba(120,255,200,0.85)');
      ctx.restore();
    }
  }
  clear() { this.roastActive=false; }
  destroy() {}
}
window.GL.DebugMode = DebugMode;
})();
