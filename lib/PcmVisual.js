define(['lib/Sound', 'lib/GUID'], function (Sound, GUID) {

    var exports = function PcmVisual (options) {
        var self = this;

        this.id          = '_id_' + new GUID().instance;
        this.history     = [];
        this.renderTimer = null;


        this.options = {
            width   : window.innerWidth || document.documentElement.clientWidth || document.getElementsByTagName('body')[0].clientWidth,
            height  : window.innerHeight|| document.documentElement.clientHeight|| document.getElementsByTagName('body')[0].clientHeight,
            uri     : null,
            playing : null,    // If true, an animation frame is requested
            fftSize : 512,
            generationsToKeep   : 28,
            rgbForeground       : '255,255,255',
            lineWidth  : 3,
            lineWidth2 : 1
        };

        for (var i in options) {
            if (options.hasOwnProperty(i)) {
                this.options[i] = options[i];
            }
        }

        if (typeof this.options.uri==='undefined' || this.options.uri === null){
            throw new ReferenceError('uri parameter not supplied');
        }

        if (typeof this.options.element === 'string'){
            this.options.element = document.getElementById(this.options.element);
        }

        var range = document.createRange();
        // make the parent of the first div in the document becomes the context node
        range.selectNode( this.options.element );
        this.options.element.appendChild(
            range.createContextualFragment(
                "<canvas class='app' id='"+this.id+"' width='"+this.options.width+"' height='"+this.options.height+"'></canvas>"
            )
        );

        // Get the 'Element.Canvas' instance:
        this.element = document.getElementById( this.id );
        this.ctx     = this.element.getContext('2d');
        this.scaleX  = parseInt(this.element.width)  / (this.options.fftSize / 3);
        this.scaleY  = parseInt(this.element.height) / 256;
        this.opacityStep = 1 / this.options.generationsToKeep;

        this.audio = new Sound(
            this.options.uri,
            this.options.fftSize,
            function (buffer) {
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
                setTimeout(
                    function(){
                        self.playing = false;
                    },
                    self.audio.aBuffer.duration * 1000
                );
            }
        );
    };

    exports.prototype.renderFrame = function () {
        var b = new Uint8Array(this.audio.analyser.fftSize);
        this.audio.analyser.getByteFrequencyData(b);

        this.element.width = this.element.width; // clear canvas
        this.ctx.lineWidth = this.options.lineWidth;

        var historyEntry = [];      // To compute current frame:
        // Why not ... b.length/2?
        for (var i=0; i < b.length/3; i++) historyEntry.push( parseInt(b[i]) );

        // Maintain size of history stack:
        if (this.history.length >= this.options.generationsToKeep - 1){
            this.history.pop();
        }
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
                y = this.options.height - (y * this.scaleY);
                if (i==0) this.ctx.moveTo( x, y );
                else this.ctx.lineTo( x, y );
            }
            // this.ctx.moveTo( x, y );
            this.ctx.stroke();
            this.ctx.closePath();
            this.ctx.scale( 0.96, 0.96 );
            this.ctx.translate( 20, (5 / this.options.generationsToKeep) *-1 );
            this.ctx.lineWidth = this.options.lineWidth2;
        }
    }

    return exports;
});
