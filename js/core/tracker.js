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

      this.holistic.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: true,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6,
      });

      this.holistic.onResults((results) => {
        this.results = results;
        this.ready = true;
      });

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      this.videoElement.srcObject = stream;
      await this.videoElement.play();

      this.camera = new Camera(this.videoElement, {
        onFrame: async () => {
          await this.holistic.send({ image: this.videoElement });
        },
        width: 1280,
        height: 720,
      });

      this.camera.start();
      this.running = true;
    }

    getFrameState(width, height) {
      return {
        width,
        height,
        results: this.results || {},
      };
    }
  }

  window.GestureLab.Tracker = Tracker;
})();
