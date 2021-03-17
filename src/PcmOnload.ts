/*
  Version 0.5

  This code is copyright (C) 2012 Lee Goddard.
  All Rights Reserved.

  Available under the same terms as Perl5.

  Provides events:

      onSoundLoaded

      onXhrError

      onRendered

      onPlay

      onStop

      onComplete

  Consider overriding `overlayImg`, which is called
  every `options.updateinterval` milliseconds when the
  track is playing.

*/

export class PcmOnload extends HTMLElement {
  shadow: ShadowRoot;
  width: number;
  height: number;
  node: AudioBufferSourceNode;
  offlineNode: AudioBufferSourceNode;
  offlineAnalyser: AnalyserNode;
  offlineProcessor: ScriptProcessorNode;
  strokestyle: string; /* foreground colour from css */
  background: string; /* background colour  from css */
  linewidth = 1; /* width of line used in graph */
  step = 4; /* Graph PCM in steps */
  // asimg = false; /* Replace canvas with image, prevents `pauseorjump` and `overlayclr` */
  pauseorjump = 'jump'; /* Either `pause` or `jump` (to a time) when waveform is clicked. */
  playable = true; /* Can the waveform be clicked to play? */
  overlayclr = 'rgba(200,200,0,1)'; /* Any valid CSS colour (hex, rgb, etc). Overlaid when image played */
  overlaytype = 'bar'; /* 'bar' or 'full' */
  updateinterval = 60 / 40; /* Graph overlay update frequency in milliseconds */
  fftsize = 1024; /* smoothingtimeconstant */
  smoothingtimeconstant = 0.8; /* FFT bin size for waveform frequency analysis. (Small=slow and detailed.) An unsigned long value representing the size of the Fast Fourier Transform to be used to determine the frequency domain. It must be a non-zero power of 2 in the range between 512 and 2048, included; its default value is 2048. If not a power of 2, or outside the specified range, the exception INDEX_SIZE_ERR is thrown. https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode */
  saturation = 100; /* Waveform frequency colour (%) */
  lightness = 50; /* waveform frequency colour (%) */
  frequencyby = 'average'; /* `average` or `max` - calculate frequency colour by the average frequency in the FFT bin, or that with the greatest amplitude. */
  buffer: AudioBuffer;
  canvas: HTMLCanvasElement;
  actx: AudioContext;
  octx: OfflineAudioContext;
  cctx: CanvasRenderingContext2D;
  img: HTMLImageElement;
  audioReady = false;
  playing = false;
  renderTimer: number;
  pauseTimer: number;
  playbackTime = 0; /* Current time ini sound; for pausing */
  overlay = { /* Private overlay details. */
    thisX: 0,
    lastX: 0,
    imgd: null, // ImageData
    pxPerSec: null,
    lastX2: 0,
    fg: {
      all: '',
      r: 0,
      g: 0,
      b: 0,
      a: 0
    }
  };
  fromX: number;
  freqClrs = []; /* Waveform frequency colour */
  canvasImgData: ImageData;
  offlineRenderStarted = false; /* Have to cover 0 */
  position = { /* When `options.pauseorjump` is jump, used to hold position of the canvas */
    x: null,
    y: null
  };
  actxStartTime: number;

  connectedCallback() {
    this.step = Math.floor(this.step);

    if (typeof AudioContext !== 'function') {
      throw new Error(
        'This browser does not support Web Audio Context');
    }

    if (!this.pauseorjump.match(/jump/i)) {
      this.pauseorjump = 'pause';
    }

    if (!this.frequencyby.match(/max/i)) {
      this.pauseorjump = 'average';
    }

    this.shadow = this.attachShadow({ mode: 'open' });
    const styles = window.getComputedStyle(this);

    this.width = parseInt(styles.getPropertyValue('width')) || window.innerWidth;
    this.height = parseInt(styles.getPropertyValue('height'));

    if (isNaN(this.height)) {
      const p = document.createElement('p');
      this.shadow.appendChild(p);
      p.innerText = 'X';
      this.height = parseInt(window.getComputedStyle(p).getPropertyValue('height'));
      this.shadow.removeChild(p);
    }

    this.background = styles.getPropertyValue('background-color') || 'transparent';
    this.strokestyle = styles.getPropertyValue('color');

    this.linewidth = parseInt(this.getAttribute('linewidth') || this.linewidth + '');
    this.step = parseInt(this.getAttribute('step') || this.step + '');
    this.pauseorjump = (this.getAttribute('pauseorjump') && this.getAttribute('pauseorjump').match(/jump/i) ? 'jump' : 'pause') || this.pauseorjump;
    this.playable = (this.getAttribute('playable') && this.getAttribute('playable').match(/false/i)) ? false : true;
    this.overlayclr = this.getAttribute('overlayclr') || this.overlayclr;
    this.overlaytype = (this.getAttribute('overlaytype') && this.getAttribute('overlaytype').match(/bar/i) ? 'bar' : 'full') || this.overlaytype;
    this.frequencyby = (this.getAttribute('frequencyby') && this.getAttribute('frequencyby').match(/max/i) ? 'max' : 'average') || this.frequencyby;
    // asimg = false; /* Replace canvas with image, prevents `pauseorjump` and `overlayclr` */

    if (this.playable) {
      const node = document.createElement('div');
      node.setAttribute('style', 'color:' + this.overlayclr);
      this.shadow.appendChild(node);
      const style = document.defaultView.getComputedStyle(node);
      const c = style.getPropertyValue('color');
      this.shadow.removeChild(node);

      this.overlay.fg = {
        all: c,
        r: parseInt('0x' + c.substr(1, 2), 10),
        g: parseInt('0x' + c.substr(3, 2), 10),
        b: parseInt('0x' + c.substr(5, 2), 10),
        a: parseInt('0x' + c.substr(7, 2), 10) || 1,
      }
      console.log('overlay', this.overlayclr, this.overlay);
    }

    const style = document.createElement('style');
    style.textContent = ':host { display:block }';
    this.shadow.appendChild(style);
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.shadow.appendChild(this.canvas);
    this.cctx = this.canvas.getContext('2d');

    this.setClrs();
    this.load();
  }

  onSoundLoaded() {

  };

  onXhrError() {
    throw 'XHR Error getting ' + this.getAttribute('uri');
  };

  onNoBufferError() {
    throw 'Error decoding file data from ' + this.getAttribute('uri');
  };

  /* Fired when the waveform has been rendered. Default behaviour is to call `colourFrequencies()` to colour the waveform based on FFT frequency analysis. */
  onRendered() {
    this.colourFrequencies();
  };

  onPlay() {
    console.log('started at ', this.playbackTime, "(" + this.actxStartTime +
      ")");
  };

  onStop(pause) {
    console.log((pause ? 'paused' : 'stopped'), ' at ', this.playbackTime);
  };

  onComplete() {
    console.log('Complete');
  };

  fireEvent(eventName, ...args) {
    const methodName = 'on' + eventName.substr(0, 1).toUpperCase() + eventName.substr(1);
    if (! typeof this[methodName]) {
      console.warn("No %s for fireEvent('%s')", methodName, eventName);
    } else {
      try {
        this[methodName].apply(this, args);
      } catch (e) {
        throw new Error('Dynamic method "' + methodName + '" croaked with:\n' + e);
      }
    }
  };

  load() {
    const request = new XMLHttpRequest();
    request.open("GET", this.getAttribute('uri'), true);
    request.responseType = "arraybuffer";
    request.onload = () => {
      this.actx = new AudioContext();
      this.actx.decodeAudioData(request.response, (buffer) => {
        if (!buffer) {
          console.error('Error decoding file data: ' + this.getAttribute('uri'));
          throw new Error('File decoding error');
        } else {
          this.buffer = buffer;
          this.audioReady = true;
          this.fireEvent('soundLoaded');
          this.render();
        }
      });
    };
    request.onerror = this.onXhrError;
    request.send();
  };

  /*
    Render a template of the waveform
    for later colour - overlay.
    Having tried all sorts of averaging and resampling,
    the visually most appealing result is from allowing
    the canvas to sort it out, though this is much slower.
    */
  render() {
    const channelData = [];
    this.cctx.beginPath();
    this.cctx.strokeStyle = this.strokestyle;
    this.cctx.lineWidth = this.linewidth;

    this.cctx.moveTo(0, this.height / 2);

    for (let channel = 0; channel < this.buffer.numberOfChannels; channel++) {
      channelData[channel] = this.buffer.getChannelData(channel);
    }

    const xFactor = this.width / channelData[0].length;

    for (let i = 0; i < channelData[0].length; i += this.step) {
      let v = 0;
      for (let c = 0; c < this.buffer.numberOfChannels; c++) {
        v += channelData[c][i];
      }

      const x = i * xFactor;
      let y = (v / this.buffer.numberOfChannels);
      // console.assert( y < 1 );
      y = (this.height * y / 2) + (this.height / 2);

      this.cctx.lineTo(
        Math.floor(x),
        Math.floor(y)
      );
    }

    this.cctx.stroke();

    this.fireEvent('rendered');
  };

  clickedGraphic(e) {
    if (this.pauseorjump === 'jump') {
      if (this.playing) {
        // Store element position (it may have moved since last play)
        this._stop(false);
        this.play(
          // (e.page.x - this.position.x) / this.overlay.pxPerSec
        );
      } else {
        this.play();
      }
    } else {
      if (this.playing) {
        this.pause();
      } else {
        this.play();
      }
    }
  };

  pause() {
    this._stop(true);
  };

  stop() {
    this._stop(false);
  };

  _stop(pause) {
    // console.log('_stop', this.playing, 'pause?', pause);
    if (!this.playing) {
      return;
    }
    this.playbackTime = pause ? this.now() : 0;
    this.node.stop();
    clearInterval(this.renderTimer);
    clearTimeout(this.pauseTimer);
    this.playing = false;
    if (!pause) {
      this.playbackTime = 0;
    }
    this.fireEvent('stop', pause);
  };

  /**
    Specs say that the audio context currentTime is the time the audio context was created,
    always moves forwards, and cannot be stopped or paused. now() is relative to the buffer.
    {@see this#_actxStartTime}
    */
  now(): number {
    console.log('now', this.playbackTime, this.actx.currentTime, this.actxStartTime);
    return this.playbackTime + this.actx.currentTime - this.actxStartTime;
  };

  play(startAt = 0) {
    console.log('Enter play');
    if (!this.audioReady || this.playing) {
      return;
    }
    this.playing = true;

    this.setNode();

    if (startAt > 0) {
      this.playbackTime = startAt;
      this.overlay.thisX = 1;
      this.replaceCanvasImg();
      this.overlayImg();
    }

    // Reset if done:
    if (this.playbackTime > this.node.buffer.duration) {
      this.playbackTime = 0;
    }

    if (this.playbackTime === 0) {
      this.replaceCanvasImg();
    }

    // Render callback, cancelled as necessary by the callback
    this.renderTimer = setTimeout(
      () => {
        this.overlayImg();
      },
      this.updateinterval
    );

    this.node.start(
      0,
      this.playbackTime // 0 || where last paused
    );

    this.fromX = this.playbackTime * this.overlay.pxPerSec;

    // '.pause' needs a place to start
    this.actxStartTime = this.actx.currentTime;
    this.fireEvent('play');
  };

  /* Overlays colour onto the wave form. Override this. */
  overlayImg() {
    console.log('enter overlayImg');
    this.overlay.lastX = (typeof this.overlay.thisX === 'undefined') ?
      0 : this.overlay.thisX - 1;

    console.log('this.overlay.thisX =', this.now(), '*', this.overlay.pxPerSec);

    this.overlay.thisX = this.now() * this.overlay.pxPerSec;

    // console.info( this.now() +': ', this.overlay.lastX,'->', this.overlay.thisX);

    // Don't allow too-frequent calls:
    if (this.overlay.thisX - this.overlay.lastX <= 1) {
      return;
    }

    // if (this.overlay.thisX > this.element.width){
    if (this.now() >= this.node.buffer.duration) {
      this.stop();
      return;
    }

    // On  error, cancel playback/rendering.
    try {
      if (this.overlaytype === 'bar') {
        this.cctx.globalCompositeOperation = 'source-out';
        if (this.overlay.imgd) {
          this.cctx.putImageData(this.overlay.imgd, this.overlay.lastX2, 0);
        }

        this.overlay.imgd = this.cctx.getImageData(
          this.overlay.thisX, 0,
          1, this.height
        );
        this.overlay.lastX2 = this.overlay.thisX;

        this.cctx.globalCompositeOperation = 'source-atop';
        this.cctx.fillStyle = this.overlay.fg.all;
        console.log('thisX', this.overlay.thisX);
        this.cctx.fillRect(
          this.overlay.thisX, 0, 1, this.height
        );
      } else {
        /*
                const imgd = this.cctx.getImageData(
                    this.overlay.lastX, 0,
                    (this.overlay.thisX - this.overlay.lastX), this.height
                );

                for (let i=0; i <= imgd.data.length; i+=4){
                    imgd.data[i]    = this.overlay.fg.r;
                    imgd.data[i+1]  = this.overlay.fg.g;
                    imgd.data[i+2]  = this.overlay.fg.b;
                    // imgd.data[i+3]  = 255; // imgd.data[i+3];
                }
                this.cctx.putImageData(imgd, this.overlay.lastX, 0);
                */

        // this.cctx.globalAlpha = 12;
        console.info('---------------')
        this.cctx.globalCompositeOperation = 'source-atop';
        this.cctx.fillStyle = this.overlay.fg.all;
        this.cctx.fillRect(
          this.overlay.lastX, 0, (this.overlay.thisX - this.overlay.lastX),
          this.height
        );
      }

    } catch (e) {
      console.error(e);
      this.stop();
    }
  };

  /**
    Offline audio processing is faster than real time.
    Used here to apply frequency analysis to colour the wave.
    Sets a few parameters for use during playback.
    */
  _offlineOverlayImg(e) {
    if (this.overlay.pxPerSec === null) { // first call
      this.overlay.pxPerSec = this.width / this.buffer.duration;
      this.cctx.globalAlpha = 255;
      this.cctx.globalCompositeOperation = 'source-atop';
    }

    let fromX = Math.floor(e.playbackTime * this.overlay.pxPerSec);
    const toX = Math.ceil(fromX + (e.inputBuffer.duration * this.overlay.pxPerSec));

    if (toX > fromX) {
      if (!this.offlineRenderStarted) {
        this.offlineRenderStarted = true;
        fromX = 0;
      }

      const data = new Uint8Array(this.offlineAnalyser.frequencyBinCount);
      this.offlineAnalyser.getByteFrequencyData(data);

      let clrIndex = 0;
      if (this.frequencyby === 'average') {
        const values = data.reduce((a, b) => a + b, 0);
        clrIndex = Math.floor(values / data.length);
      } else {
        clrIndex = Math.max(...data);
      }
      this.cctx.fillStyle = 'hsl(' + this.freqClrs[clrIndex] + ')';
      this.cctx.fillRect(
        fromX, 0,
        toX, this.height
      );
    }
  };

  colourFrequencies() {
    console.log('Enter colourFrequencies');
    if (this.buffer === null) {
      throw new Error('No buffer: setNode not called?');
    }

    this.octx = new OfflineAudioContext(this.buffer.numberOfChannels, this.buffer.length, this.buffer.sampleRate);

    this.offlineNode = this.octx.createBufferSource();

    this.offlineAnalyser = this.octx.createAnalyser();
    this.offlineAnalyser.fftSize = this.fftsize;
    this.offlineAnalyser.smoothingTimeConstant = this.smoothingtimeconstant;

    this.offlineProcessor = this.octx.createScriptProcessor(this.fftsize, this.buffer.numberOfChannels, this.buffer.numberOfChannels);

    this.offlineProcessor.connect(this.octx.destination);
    this.offlineAnalyser.connect(this.offlineProcessor);
    this.offlineNode.connect(this.offlineAnalyser);

    this.octx.oncomplete = this.graphComplete.bind(this);

    this.offlineProcessor.onaudioprocess = this._offlineOverlayImg.bind(this);

    this.offlineNode.buffer = this.buffer;
    this.offlineNode.start();
    this.octx.startRendering();
  };

  setNode() {
    this.node = this.actx.createBufferSource();
    this.node.buffer = this.buffer;
    this.node.connect(this.actx.destination);
  };

  setClrs() {
    for (let i = 0; i <= 255; i++) {
      this.freqClrs.push(
        Math.floor(2 * (i * 254 / 360))
        + ',' +
        this.saturation + '%,' +
        this.lightness + '%'
      );
    }
  };

  /* Stores the graph for repainting on repeat plays; makes the graph clickable */
  graphComplete() {
    this.storeCanvasImg();
    console.log('graphComplete');
    // if (this.asimg) {
    //   const initialCompositeOperation = this.cctx.globalCompositeOperation;

    //   // Set to draw behind current content
    //   this.cctx.globalCompositeOperation = "destination-over";

    //   this.cctx.fillStyle = this.background;
    //   this.cctx.fillRect(0, 0, this.width, this.height);

    //   this.img.src = this.canvas.toDataURL();
    //   this.parentNode.replaceChild(this.canvas, this.img);

    //   // Restore the previous state
    //   this.cctx.globalCompositeOperation = initialCompositeOperation;

    //   if (this.playable) {
    //     this.img.addEventListener('click', (e) => {
    //       console.log('1');
    //       this.clickedGraphic(e)
    //     });
    //   }
    // } else

    if (this.playable) {
      this.canvas.addEventListener('click', (e) => {
        this.clickedGraphic(e)
      });
    }

    this.fireEvent('complete');
  };

  storeCanvasImg() {
    this.canvasImgData = this.cctx.getImageData(0, 0, this.width, this.height);
  };

  replaceCanvasImg() {
    this.canvas.width = this.width;
    this.cctx.putImageData(this.canvasImgData, 0, 0);
  };
}

customElements.define('pcm-onload', PcmOnload);
