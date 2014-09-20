/* global define, document, alert, window, webkitAudioContext, webkitOfflineAudioContext, AudioContext, XMLHttpRequest, OfflineAudioContext */
define( [ 'File2Graph' ], function ( File2Graph ) {

	/*
    Version 0.5

    This code is copyright (C) 2012 Lee Goddard.
    All Rights Reserved.

    Available under the same terms as Perl5.

    Provides events:

        onSoundLoaded

        onCanvasLoaded

        onXhrError

        onCanvasLoaded

        onRendered

        onPlay

        onStop

    Consider overriding `overlayImg`, which is called
    every `options.updateinterval` milliseconds when the
    track is playing.

*/

	var Spectra = function Spectra( options ) {
		File2Graph.call( this, options );
	};

	Spectra.prototype = Object.create( File2Graph.prototype );
	Spectra.prototype.constructor = Spectra;

	Spectra.prototype.render = function () {
		var self = this;
		var cd = [];

		this.cctx.beginPath();
		this.cctx.strokeStyle = this.options.strokestyle;
		this.cctx.lineWidth = this.options.linewidth;

		this.cctx.moveTo( 0, this.height / 2 );

		var c;
		for ( c = 0; c < this.buffer.numberOfChannels; c++ ) {
			cd[ c ] = this.buffer.getChannelData( c );
		}

		var xFactor = this.width / cd[ 0 ].length;

		for ( var i = 0; i < cd[ 0 ].length; i += parseInt( this.options.step, 10 ) ) {
			var v = 0;
			for ( c = 0; c < this.buffer.numberOfChannels; c++ ) {
				v += cd[ c ][ i ];
			}

			this.cctx.lineTo(
				i * xFactor, ( v / this.buffer.numberOfChannels ) * this.height + ( this
					.height / 2 )
			);
		}

		this.cctx.stroke();

		self.fireEvent( 'rendered' );
	};

	/* Overlays colour onto the wave form. Override this. */
	Spectra.prototype.overlayImg = function () {
		this.overlay.lastX =
			( typeof this.overlay.thisX === 'undefined' ) ?
			0 : this.overlay.thisX - 1;

		this.overlay.thisX = this.now() * this.overlay.pxPerSec;

		// console.info( this.now() +': ', this.overlay.lastX,'->', this.overlay.thisX);

		// Don't allow too-frequent calls:
		if ( this.overlay.thisX - this.overlay.lastX <= 1 ) {
			return;
		}

		// if (this.overlay.thisX > this.element.width){
		if ( this.now() >= this.node.buffer.duration ) {
			this.stop();
			return;
		}

		// If we error, cancel playback/rendering.
		try {
			if ( this.options.overlaytype === 'bar' ) {
				this.cctx.globalCompositeOperation = 'source-out';
				if ( this.overlay.imgd ) {
					this.cctx.putImageData( this.overlay.imgd, this.overlay.lastX2, 0 );
				}

				this.overlay.imgd = this.cctx.getImageData(
					this.overlay.thisX, 0,
					1, this.canvas.height
				);
				this.overlay.lastX2 = this.overlay.thisX;

				this.cctx.globalCompositeOperation = 'source-atop';
				this.cctx.fillStyle = this.overlay.fg.all;
				this.cctx.fillRect(
					this.overlay.thisX, 0,
					1, this.canvas.height
				);
			} else {
				/*
                var imgd = this.cctx.getImageData(
                    this.overlay.lastX, 0,
                    (this.overlay.thisX - this.overlay.lastX), this.canvas.height
                );

                for (var i=0; i <= imgd.data.length; i+=4){
                    imgd.data[i]    = this.overlay.fg.r;
                    imgd.data[i+1]  = this.overlay.fg.g;
                    imgd.data[i+2]  = this.overlay.fg.b;
                    // imgd.data[i+3]  = 255; // imgd.data[i+3];
                }
                this.cctx.putImageData(imgd, this.overlay.lastX, 0);
                */

				// this.cctx.globalAlpha = 12;
				this.cctx.globalCompositeOperation = 'source-atop';
				this.cctx.fillStyle = this.overlay.fg.all;
				this.cctx.fillRect(
					this.overlay.lastX, 0, ( this.overlay.thisX - this.overlay.lastX ),
					this.canvas.height
				);
			}

		} catch ( e ) {
			this.stop();
		}
	};

	/**
            Offline audio processing is faster than real time.
            Used here to apply frequency analysis to colour the wave.
            Sets a few parameters for use during playback.
            */
	Spectra.prototype.offline_overlayImg = function ( e ) {
		var j;
		if ( typeof this.overlay.pxPerSec === 'undefined' ) {
			this.overlay.pxPerSec = this.width / this.buffer.duration;
			//console.info( 'this.overlay.pxPerSec = ', this.overlay.pxPerSec)
			//console.log( 'width = ', this.width, ', total px = ', this.overlay.pxPerSec * this.buffer.duration);
		}

		var fromX = e.playbackTime * this.overlay.pxPerSec,
			toX = fromX + ( e.inputBuffer.duration * this.overlay.pxPerSec );

		if ( parseInt( toX, 10 ) > parseInt( fromX, 10 ) ) {
			if ( !this.offlineRenderStarted ) {
				this.offlineRenderStarted = true;
				fromX = 0;
			}

			var data = new Uint8Array( this.offline_analyser.frequencyBinCount );
			this.offline_analyser.getByteFrequencyData( data );

			var clrIndex = 0;
			if ( this.options.frequencyby === 'average' ) {
				var values = 0;
				for ( j = 0; j < data.length; j++ ) {
					values += data[ j ];
				}
				clrIndex = parseInt( values / data.length, 10 );
			} else {
				var max = 0;
				for ( j = 0; j < data.length; j++ ) {
					if ( data[ j ] > max ) {
						max = data[ j ];
					}
				}
				clrIndex = max;
			}
			this.cctx.globalAlpha = 255;
			this.cctx.globalCompositeOperation = 'source-atop';
			this.cctx.fillStyle = 'hsl(' + this.freqClrs[ clrIndex ] + ')';
			this.cctx.fillRect(
				fromX, 0,
				toX, this.canvas.height
			);
		}
	};

	Spectra.prototype.colourFrequencies = function () {
		var self = this;
		if ( this.buffer === null ) {
			throw new Error( 'setNode not caled, no buffer!' );
		}

		this.octx = new OfflineAudioContext( this.buffer.numberOfChannels,
			this.buffer.length, this.buffer.sampleRate );

		this.offline_node = this.octx.createBufferSource();

		this.offline_analyser = this.octx.createAnalyser();
		this.offline_analyser.fftsize = this.options.fftsize;
		this.offline_analyser.smoothingTimeConstant = 0.9;

		this.offline_processor = this.octx.createScriptProcessor( this.options.fftsize,
			this.buffer.numberOfChannels, this.buffer.numberOfChannels );
		this.offline_processor.connect( this.octx.destination );

		this.offline_analyser.connect( this.offline_processor );

		this.offline_node.connect( this.offline_analyser );

		// When rendered, store the canvas for replays
		this.octx.oncomplete = function () {
			self.graphComplete();
		};
		this.offline_processor.onaudioprocess = function ( e ) {
			self.offline_overlayImg( e );
		};

		this.offline_node.buffer = this.buffer;
		this.offline_node.start();
		this.octx.startRendering();
	};

	Spectra.prototype.setClrs = function () {
		for ( var i = 0; i <= 255; i++ ) {
			this.freqClrs.push(
				parseInt(
					2 * ( i * 254 / 360 ), 10
				) + ',' +
				this.options.saturation + '%,' +
				this.options.lightness + '%'
			);
		}
	};

	return Spectra;
} );
