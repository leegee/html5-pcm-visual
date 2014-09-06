/*
var SSS = SSS || {};
var __global_audio_id = 0;

SSS.actx = null;

if (typeof AudioContext == "function") {
    SSS.actx = new AudioContext();
} else if (typeof webkitAudioContext == "function") {
    SSS.actx = new webkitAudioContext();
}
else {
    alert('This browser does not support Web Audio Context');
}

// http://www.html5rocks.com/en/tutorials/webaudio/intro/
SSS.Sound = new Class({
    aBuffer:        null,
    ready:      false,
    node:       null,
    playing:        false,
    analyser:   null,

    initialize: function( uri, fftSize, callback ){
        var self = this;
        self.uri = uri;
        self.fftSize = fftSize;
        self.callback = callback;
        var bufferLoader = new BufferLoader(
            SSS.actx,
            [self.uri],
            function(bufferList){
                self.aBuffer = bufferList[0];
                self.ready = true;
                self.callback(self.aBuffer);
            }
        );
        bufferLoader.load();
    },

    stop: function(){
        if (!this.playing) return;
        this.playing = false;
        this.node.noteOff( 0 );
    },

    play: function(){
        if (!this.ready) return;
        if (this.playing) return;
        this.playing = true;
        this.node = SSS.actx.createBufferSource();
        this.node.buffer = this.aBuffer;
        this.analyser = SSS.actx.createAnalyser();
        this.analyser.fftSize = this.fftSize;
        this.node.connect( this.analyser );
        this.analyser.connect( SSS.actx.destination );
        this.node.noteOn( 0 );
    }
});

// http://www.w3.org/TR/animation-timing/
// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
// shim layer with setTimeout fallback
window.requestAnimFrame = (function(){
  return  window.requestAnimationFrame       ||
          window.webkitRequestAnimationFrame ||
          window.mozRequestAnimationFrame    ||
          window.oRequestAnimationFrame      ||
          window.msRequestAnimationFrame     ||
          function( callback ){
            window.setTimeout(callback, 1000 / 60);
          };
})();

SSS.PcmVisual = new Class({
    Implements: [Options],

    element:        null,
    audio:      null,
    width:      null,
    height:         null,
    history:        [],
    renderTimer: null,
    options: {
        height:         400,
        track:          null,
        element:            null,
        playing:            null,   // If true, an animation frame is requested
        fftSize:            512,
        generationsToKeep: 28,
        rgbForeground:  '255,255,255',
    },

    initialize: function( options ){
        var self = this;
        this.setOptions(options);
        this.element = new Element('canvas',{
            class:'app',
            width: this.options.width || window.getSize().x - 50,
            height: this.options.height
        });
        this.height = this.options.height;
        this.width  = parseInt( this.element.width );

        this.ctx = this.element.getContext('2d');
        this.element.inject( $(this.options.element) );

        this.scaleX = parseInt(this.element.width)  / (this.options.fftSize / 3);
        this.scaleY = parseInt(this.element.height) / 256;

        this.opacityStep = 1/this.options.generationsToKeep;

        this.audio = new SSS.Sound(
            this.options.track,
            this.options.fftSize,
            function(buffer){
                this.play();
                self.playing = true;

                // Schedule rendering:
                (function animloop(){
                    if (self.playing){
                        requestAnimFrame(animloop);
                        self.renderFrame();
                    }
                })();

                // Schedule cancel of the animation request:
                (function(){
                    self.playing = false;
                    console.info( 'Done' );
                }).delay(
                    self.audio.aBuffer.duration * 1000
                );
            }
        );
    },

    renderFrame: function(){
        var b = new Uint8Array(this.audio.analyser.fftSize);
        this.audio.analyser.getByteFrequencyData(b);

        this.element.width = this.element.width; // clear canvas
        this.ctx.lineWidth = 2;

        var historyEntry = [];      // To compute current frame:
        // Why not ... b.length?
        for (var i=0; i < b.length/3; i++) historyEntry.push( parseInt(b[i]) );

        // Maintain size of history stack:
        if (this.history.length >= this.options.generationsToKeep-1)
            this.history.pop();
        this.history.unshift( historyEntry );

        var x, y;

        // Render history, including current, newest first
        for (var gen=0; gen < this.history.length; gen++){
            this.ctx.beginPath();
            this.ctx.fillStyle = this.ctx.strokeStyle = 'rgba('
                + this.options.rgbForeground
                + ','
                + (1-(this.opacityStep*gen))
            +')';

            for (var ox=0; ox < this.history[ gen ].length; ox++){
                x = (ox * this.scaleX);
                y = this.history[ gen ][ ox ];
                y = this.height - (y * this.scaleY);
                if (i==0) this.ctx.moveTo( x, y );
                else this.ctx.lineTo( x, y );
            }
            // this.ctx.moveTo( x, y );
            this.ctx.stroke();
            this.ctx.closePath();
            this.ctx.scale( 0.96, 0.96 );
            this.ctx.translate( 20, (5 / this.options.generationsToKeep) *-1 );
            this.ctx.lineWidth = 1; // Allow first line to be wider
        }
    }

});


*/
