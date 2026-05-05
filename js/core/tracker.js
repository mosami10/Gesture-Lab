window.GestureLab = window.GestureLab || {};

(() => {
  class Tracker {
    constructor(videoElement) {
      this.videoElement = videoElement;
      this.holistic = null;
      this.camera = null;
      this.results = {};
      this.ready = false;
      this.running = false;
    }

    async start() {
      if (this.running) return;

      this.holistic = new Holistic({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`,
      });

      // modelComplexity: 0 = MUCH faster FPS, still accurate enough for gesture
      this.holistic.setOptions({
        modelComplexity: 0,
        smoothLandmarks: true,
        enableSegmentation: true,
        smoothSegmentation: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      this.holistic.onResults((results) => {
        this.results = results;
        this.ready = true;
      });

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });

      this.videoElement.srcObject = stream;
      await this.videoElement.play();

      this.camera = new Camera(this.videoElement, {
        onFrame: async () => { await this.holistic.send({ image: this.videoElement }); },
        width: 640,
        height: 480,
      });

      this.camera.start();
      this.running = true;
    }

    getFrameState(width, height) {
      return { width, height, results: this.results || {} };
    }
  }

  window.GestureLab.Tracker = Tracker;
})();
