window.GL = window.GL || {};

class Tracker {
  constructor(vid) {
    this.vid = vid; this.holistic = null; this.camera = null;
    this.results = {}; this.ready = false; this.running = false;
  }
  async start() {
    if (this.running) return;
    this.holistic = new Holistic({
      locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${f}`
    });
    this.holistic.setOptions({
      modelComplexity: 0,
      smoothLandmarks: true,
      enableSegmentation: true,
      smoothSegmentation: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    this.holistic.onResults(r => { this.results = r; this.ready = true; });

    // 16:9 720p for sharpness but model runs on internal 640x480
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode:'user', width:{ideal:1280}, height:{ideal:720}, frameRate:{ideal:30} },
      audio: false,
    });
    this.vid.srcObject = stream; await this.vid.play();
    this.camera = new Camera(this.vid, {
      onFrame: async () => { await this.holistic.send({image:this.vid}); },
      width: 640, height: 480,
    });
    this.camera.start(); this.running = true;
  }
  frame(w,h) { return {w,h,r:this.results||{}}; }
}
window.GL.Tracker = Tracker;
