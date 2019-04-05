import { BufferLoader } from './BufferLoader';

let ACTX;
if (typeof AudioContext == "function") {
  ACTX = new AudioContext();
  // } else if (typeof webkitAudioContext == "function") {
  //   actx = new webkitAudioContext();
}
else {
  throw new Error('This browser does not support Web Audio Context');
}

export class Sound {

  uri: string;
  fftSize: number;
  actx: AudioContext;
  aBuffer: AudioBuffer;
  callback: Function;
  ready = false;
  playing = false;
  analyser: any;
  node: any;

  constructor(uri, fftSize, callback, context = ACTX) {

    if (typeof uri === 'undefined' || uri === null) {
      console.trace();
      throw new TypeError('uri parameter not supplied');
    }
    if (typeof fftSize === 'undefined' || fftSize === null) {
      console.trace();
      throw new TypeError('fftSize parameter not supplied');
    }
    if (typeof callback === 'undefined' || callback === null) {
      console.trace();
      throw new TypeError('callback parameter not supplied');
    }

    this.uri = uri;
    this.fftSize = fftSize;
    this.callback = callback;
    this.actx = context;
    this.aBuffer = null;
    this.ready = false;
    this.node = null;
    this.playing = false;
    this.analyser = null;

    var bufferLoader = new BufferLoader(
      this.actx,
      [this.uri],
      (bufferList) => {
        this.aBuffer = bufferList[0];
        this.ready = true;
        this.callback(this.aBuffer);
      }
    );
    bufferLoader.load();
  };

  stop() {
    if (!this.playing) {
      return;
    }
    this.playing = false;
    this.node.stop(0);
  };

  play() {
    if (!this.ready || this.playing) {
      return;
    }
    this.playing = true;
    this.actx.resume();
    this.node = this.actx.createBufferSource();
    this.node.buffer = this.aBuffer;
    this.analyser = this.actx.createAnalyser();
    this.analyser.fftSize = this.fftSize;
    this.node.connect(this.analyser);
    this.analyser.connect(this.actx.destination);
    this.node.start(0);
  }
}
