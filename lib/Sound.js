define(['BufferLoader'], function (BufferLoader) {

    var ACTX;

    if (typeof AudioContext == "function") {
        ACTX = new AudioContext();
    } else if (typeof webkitAudioContext == "function") {
        ACTX = new webkitAudioContext();
    }
    else {
        throw new Error('This browser does not support Web Audio Context');
    }

    var exports = function (uri, fftSize, callback, context){

        if (typeof uri==='undefined' || uri === null){
            console.trace();
            throw new ReferenceError('uri parameter not supplied');
        }
        if (typeof fftSize==='undefined' || fftSize === null){
            console.trace();
            throw new ReferenceError('fftSize parameter not supplied');
        }
        if (typeof callback==='undefined' || callback === null){
            console.trace();
            throw new ReferenceError('callback parameter not supplied');
        }

        this.uri        = uri;
        this.fftSize    = fftSize;
        this.callback   = callback;
        this.actx       = context || ACTX;
        this.aBuffer    = null;
        this.ready      = false;
        this.node       = null;
        this.playing    = false;
        this.analyser   = null;

        var self = this;
        var bufferLoader = new BufferLoader(
            this.actx,
            [self.uri],
            function (bufferList){
                self.aBuffer = bufferList[0];
                self.ready = true;
                self.callback(self.aBuffer);
            }
        );
        bufferLoader.load();
    };

    exports.prototype.stop = function () {
        if (!this.playing) return;
        this.playing = false;
        this.node.stop( 0 );
    };

    exports.prototype.play = function () {
        if (!this.ready) return;
        if (this.playing) return;
        this.playing            = true;
        this.node               = this.actx.createBufferSource();
        this.node.buffer        = this.aBuffer;
        this.analyser           = this.actx.createAnalyser();
        this.analyser.fftSize   = this.fftSize;
        this.node.connect( this.analyser );
        this.analyser.connect( this.actx.destination );
        console.info( this.node )
        this.node.start( 0 );
    }

    return exports;
});


