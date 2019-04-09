import { Sound } from './Sound';

const ATTR_NAMES = [
  'opacityStep', 'fftrSize', 'generationsToKeep',
  'lineWidth', 'lineHeight', 'uri'
];

export class PcmRealTime extends HTMLElement {
  id: string;
  history: Array<Array<number>> = [];
  renderTimer: any;
  ctx: CanvasRenderingContext2D;
  scaleX: number;
  scaleY: number;
  opacityStep: number;
  shadow: ShadowRoot;
  canvas: HTMLCanvasElement;
  audio: Sound;
  playing = false;
  fftSize = 512;
  generationsToKeep = 28;
  color = '255,255,255';
  lineWidth = 3;
  lineWidth2 = 1;

  width = window.innerWidth || document.documentElement.clientWidth ||
    document.getElementsByTagName('body')[0].clientWidth;
  height = window.innerHeight || document.documentElement.clientHeight ||
    document.getElementsByTagName('body')[0].clientHeight;
  uri: string = null;

  connectedCallback() {
    ATTR_NAMES.forEach(attr => {
      let v = this.getAttribute(attr);
      if (v) {
        this[attr] = v;
      }
    });

    if (typeof this.uri === 'undefined' || this.uri === null) {
      throw new TypeError('uri parameter not supplied');
    }

    this.renderTimer = null;

    const styles = window.getComputedStyle(this);
    this.color = styles.getPropertyValue('color') || this.color;
    this.width = parseInt(styles.getPropertyValue('width'));
    this.height = parseInt(styles.getPropertyValue('height'));

    this.shadow = this.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = ':host { display:block }';
    this.shadow.appendChild(style);

    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.shadow.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('2d');
    this.scaleX = this.width / (this.fftSize / 3);
    this.scaleY = this.height / 256;
    this.opacityStep = 1 / this.generationsToKeep;
  }

  play(): void {
    if (this.playing) {
      return;
    }
    const self = this;
    this.audio = new Sound(
      this.uri,
      this.fftSize,
      function (this: any, buffer: AudioBuffer) {
        this.play();
        self.playing = true;
        // Schedule rendering:
        (function animloop() {
          if (self.playing) {
            window.requestAnimationFrame(animloop);
            self.renderFrame();
          }
        })();

        // Schedule cancel of the animation:
        setTimeout(
          function () {
            self.playing = false;
          },
          1 + (self.audio.aBuffer.duration * 1000)
        );
      }
    );
  };

  renderFrame(): void {
    this.canvas.width = this.canvas.width; // clear canvas
    this.ctx.lineWidth = this.lineWidth;

    const frame = new Uint8Array(this.audio.analyser.fftSize);
    this.audio.analyser.getByteFrequencyData(frame);

    // To compute current frame
    const historyEntries: Array<number> = [];

    // Why not ... b.length/2?
    for (let i = 0; i < frame.length / 3; i++) {
      historyEntries.push(frame[i]);
    }

    // Maintain size of history stack: TODO slice
    if (this.history.length >= this.generationsToKeep - 1) {
      this.history.pop();
    }

    this.history.unshift(historyEntries);

    let x, y;

    // Render history, including current, newest first
    for (let gen = 0; gen < this.history.length; gen++) {
      this.ctx.beginPath();
      this.ctx.fillStyle = this.ctx.strokeStyle = this.color;
      this.ctx.globalAlpha = (1 - (this.opacityStep * gen));

      for (let ox = 0; ox < this.history[gen].length; ox++) {
        x = (ox * this.scaleX);
        y = this.history[gen][ox];
        y = this.height - (y * this.scaleY);
        if (ox === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
      }
      this.ctx.stroke();
      this.ctx.closePath();
      this.ctx.scale(0.96, 0.96);
      this.ctx.translate(20, (5 / this.generationsToKeep) * -1);
      this.ctx.lineWidth = this.lineWidth2;
    }
  }
}

customElements.define('pcm-realtime', PcmRealTime);
