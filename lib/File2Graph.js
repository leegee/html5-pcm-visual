/* global define, document, alert, window, webkitAudioContext, webkitOfflineAudioContext, AudioContext, XMLHttpRequest, OfflineAudioContext */
define( function () {

	function getStyle( el, styleProp ) {
		var x = typeof el === 'string' ? document.getElementById( el ) : el,
			y;

		if ( x.currentStyle ) {
			y = x.currentStyle[ styleProp ];
		} else if ( window.getComputedStyle ) {
			y = document.defaultView.getComputedStyle( x, null ).getPropertyValue(
				styleProp );
		}

		return y;
	}

	function ucfirst( text ) {
		return text.substr( 0, 1 ).toUpperCase() + text.substr( 1 );
	}


	/*
    Version 0.5

    This code is copyright (C) 2012 Lee Goddard.
    All Rights Reserved.

    Available under the same terms as Perl5.

    Provides events:

        onSoundLoaded

        onXhrError

        onCanvasLoaded

        onRendered

        onPlay

        onStop

        onComplete

    Consider overriding `overlayImg`, which is called
    every `options.updateinterval` milliseconds when the
    track is playing.

*/

	var exports = function File2Graph( options ) {
		var i,
			self = this;
		this.options = {
			element: null,
			/* conatiner to replace with canvas/image */
			uri: null,
			/* uri of sound */
			strokestyle: null,
			/* foreground colour, may come from css if possible */
			background: null,
			/* background colour, may come from css if possible */
			linewidth: 1,
			/* width of line used in graph */
			step: 4,
			/* Graph PCM in steps */
			asimg: false,
			/* Replace canvas with image, prevents `pauseorjump` and `overlayclr` */
			pauseorjump: 'jump',
			/* Either `pause` or `jump` (to a time) when waveform is clicked. */
			playable: true,
			/* Can the waveform be clicked to play? */
			overlayclr: 'rgba(200,0,0,100)',
			/* Any valid CSS colour (hex, rgb, etc). Overlaid when image played */
			overlaytype: 'bar',
			/* 'bar' or 'full' */
			updateinterval: 60 / 40,
			/* Graph overlay update frequency in milliseconds */
			fftsize: 1024,
			/* smoothingTimeConstant */
			smoothingTimeConstant: 0.8,
			/* FFT bin size for waveform frequency analysis. (Small=slow and detailed.) An unsigned long value representing the size of the Fast Fourier Transform to be used to determine the frequency domain. It must be a non-zero power of 2 in the range between 512 and 2048, included; its default value is 2048. If not a power of 2, or outside the specified range, the exception INDEX_SIZE_ERR is thrown. https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode */
			saturation: 100,
			/* Waveform frequency colour (%) */
			lightness: 50,
			/* waveform frequency colour (%) */
			frequencyby: 'average',
			/* `average` or `max` - calculate frequency colour by the average frequency in the FFT bin, or that with the greatest amplitude. */
			onSoundLoaded: function () {},
			onXhrError: function () {
				throw 'XHR Error getting ' + this.options.uri;
			},
			onNoBufferError: function () {
				throw 'Error decoding file data from ' + self.options.uri;
			},
			onCanvasLoaded: function () {},
			onRendered: function () { /* Fired when the waveform has been rendered. Default behaviour is to call `colourFrequencies()` to colour the waveform based on FFT frequency analysis. */
				this.colourFrequencies();
			},
			onPlay: function () {
				console.log( 'started at ', this.playbackTime, "(" + this._actxStartTime +
					")" );
			},
			onStop: function ( pause ) {
				console.log( ( pause ? 'paused' : 'stopped' ), ' at ', this.playbackTime );
			},
			onComplete: function () {
				console.log( 'Complete' );
			}
		};

		this.buffer = null; /* Audio buffer object */
		this.canvas = null; /* Canvas element added to options.element */
		this.actx = null; /* Audio context object */
		this.octx = null; /* Offline audio context object */
		this.cctx = null; /* Canvas context object */
		this.img = null; /* May hold an img element */
		this.audioReady = false; /* True when sound loaded */
		this.playing = false; /* True when audio is playing */
		this.renderTimer = null; /* Rendering the overlay during play */
		this.pauseTimer = null; /* Stops the renderTimer */
		this.playbackTime = 0; /* Current time ini sound; for pausing */
		this.width = 0; /* Size of visual element */
		this.height = 0; /* Size of visual element */
		this.overlay = {}; /* Private overlay details. */
		this.freqClrs = []; /* Waveform frequency colour */
		this.canvasImgData = null; /* Stores frequency-painted canvas ImageData for replay */
		this.offlineRenderStarted = false; /* Have to cover 0 */
		this.position = { /* When `options.pauseorjump` is jump, used to hold position of the canvas */
			x: null,
			y: null
		};

		for ( i in options ) {
			if ( options.hasOwnProperty( i ) ) {
				this.options[ i ] = options[ i ];
			}
		}

		this.element = ( typeof this.options.element === 'string' ) ?
			document.getElementById( this.options.element ) : this.element = this.options
			.element;

		if ( !this.element ) {
			throw new Error( 'No valid options.element' );
		}

		if ( typeof webkitAudioContext === "function" ) {
			window.AudioContext = webkitAudioContext;
			window.OfflineAudioContext = webkitOfflineAudioContext;
		}
		if ( typeof AudioContext !== 'function' ) {
			throw new Error(
				'This browser does not support Web Audio Context' );
		}

		if ( typeof this.options.playable === "string" && this.options.playable.match(
			/^(0|false|)$/ ) ) {
			this.options.playable = false;
		}

		if ( !this.options.pauseorjump.match( /jump/i ) ) {
			this.options.pauseorjump = 'pause';
		}

		if ( !this.options.frequencyby.match( /max/i ) ) {
			this.options.pauseorjump = 'average';
		}

		this.options.background = this.options.background || getStyle( this.element,
			'backgroundColor' ) || 'transparent';
		this.options.strokestyle = this.options.strokestyle || getStyle( this.element,
			'color' );

		if ( this.options.playable ) {
			// Convert colors to standard format to allow names and shorthand hex:
			var node = document.createElement( 'div' );
			node.setAttribute( 'style', this.options.overlayclr );

			var c = getStyle( node, 'color' );
			this.overlay.fg = {};
			this.overlay.fg.r = parseInt( '0x' + c.substr( 1, 2 ), 10 );
			this.overlay.fg.g = parseInt( '0x' + c.substr( 3, 2 ), 10 );
			this.overlay.fg.b = parseInt( '0x' + c.substr( 5, 2 ), 10 );
			this.overlay.fg.all = c;
		}

		if ( this.options.asimg && this.options.asimg.match( /^(1|true|asimg|)$/i ) ) {
			this.options.asimg = true;
		}
		// Allow negative markup
		else {
			this.options.asimg = false;
		}

		this.setClrs();
		this.initGraphics();
		this.fireEvent( 'canvasLoaded' );
		this.load();
	};

	exports.prototype.fireEvent = function ( eventName ) {
		var methodName = 'on' + ucfirst( eventName ),
			self = this,
			args;
		// Slicing on arguments disablees v8 optimization
		for ( var i = 1; i < arguments.length; i++ ) {
			args[ i ] = arguments[ i ];
		}
		if ( !this.options.hasOwnProperty( methodName ) ) {
			console.warn( "No option.%s for fireEvent('%s')", methodName, eventName );
		} else {
			try {
				this.options[ methodName ].apply( self, args );
			} catch ( e ) {
				throw new Error( 'Dynamic method "' + methodName + '" croaked with:\n' + e );
			}
		}
	};

	exports.prototype.initGraphics = function () {
		if ( !this.options.width || !this.options.height ) {
			throw new Error( 'Please supply .width and .height options' );
		}
		this.width = this.options.width; // || getComputedSize( this.element ).totalWidth;
		this.height = this.options.height; //  || getComputedSize( this.element ).totalHeight;
		var attr = {
			width: this.width,
			height: this.height,
			styles: {
				position: 'relative',
				display: 'block',
				zIndex: 2,
				left: 0,
				top: 0,
				width: this.width,
				height: this.height,
				backgroundColor: this.options.background
			},
			'class': this.element.getAttribute( 'class' )
		};

		this.canvas = document.createElement( 'canvas' );
		for ( var key in attr ) {
			this.canvas.setAttribute( key, attr[ key ] );
		}
		if ( this.options.asimg ) {
			this.img = document.createElement( 'img' );
			for ( var key in attr ) {
				this.img.setAttribute( key, attr[ key ] );
			}
		}

		// this.canvas.replaces( this.element );
		this.element.parentNode.replaceChild( this.canvas, this.element );

		this.element = this.canvas;
		this.cctx = this.canvas.getContext( '2d' );
	};

	exports.prototype.load = function () {
		var self = this;
		var request = new XMLHttpRequest();
		request.open( "GET", this.options.uri, true );
		request.responseType = "arraybuffer";
		request.onload = function loaded() {
			self.actx = new AudioContext();
			self.actx.decodeAudioData( request.response, function ( buffer ) {
				if ( !buffer ) {
					alert( 'error decoding file data: ' + self.options.uri );
					throw new Error( 'File decoding error' );
				} else {
					self.buffer = buffer;
					self.audioReady = true;
					self.fireEvent( 'soundLoaded' );
					self.render();
				}
			} );
		};
		request.onerror = self.options.onXhrError;
		request.send();
	};

	/*
            Render a template of the waveform for later colour-overlay.
            Having tried all sorts of averaging and resampling,
            the visually most appealing result is from allowing
            the canvas to sort it out, though this is much slower.
            */
	exports.prototype.render = function () {
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

    exports.prototype.clickedGraphic = function ( e ) {
		if ( this.options.pauseorjump === 'jump' ) {
			console.log( this.playing );
			if ( this.playing ) {
				// Store element position (it may have moved since last play)
				this.position = this.element.getPosition();
				this._stop( false );
				this.play(
					( e.page.x - this.position.x ) / this.overlay.pxPerSec
				);
			} else {
				this.play();
			}
		} else {
			if ( this.playing ) {
				this.pause();
			} else {
				this.play();
			}
		}
	};

	exports.prototype.pause = function () {
		this._stop( true );
	};

	exports.prototype.stop = function () {
		this._stop( false );
	};

	exports.prototype._stop = function ( pause ) {
		// console.log('_stop', this.playing, 'pause?', pause);
		if ( !this.playing ) {
			return;
		}
		this.playbackTime = pause ? this.now() : 0;
		this.node.stop();
		clearInterval( this.renderTimer );
		clearTimeout( this.pauseTimer );
		this.playing = false;
		if ( !pause ) {
			this.playbackTime = 0;
		}
		this.fireEvent( 'stop', pause );
	};

	/**
            Specs say that the audio context currentTime is the time the audio context was created,
            always moves forwards, and cannot be stopped or paused. now() is relative to the buffer.
            {@see this#_actxStartTime}
            */
	exports.prototype.now = function () {
		return this.playbackTime + this.actx.currentTime - this._actxStartTime;
	};

	exports.prototype.play = function ( startAt ) {
		if ( !this.audioReady || this.playing ) {
			return;
		}
		this.playing = true;

		this.setNode();

		if ( typeof startAt !== 'undefined' ) {
			this.playbackTime = startAt;
			// Rerender canvas:
			this.overlay.thisX = 1;
			this.replaceCanvasImg();
			//this.overlayImg();
		}

		// Reset if done:
		if ( this.playbackTime > this.node.buffer.duration ) {
			this.playbackTime = 0;
			this.replaceCanvasImg();
		}

		if ( this.playbackTime === 0 ) {
			this.replaceCanvasImg();
		}

		// Render callback, cancelled as necessary by the callback
		this.renderTimer = this.overlayImg.periodical(
			this.options.updateinterval,
			this
		);

		var self = this;
		// setTimeout(function(){
		self.node.start(
			0,
			self.playbackTime // 0 || where last paused
		);
		// }, this.options.updateinterval);

		this.fromX = this.playbackTime * this.overlay.pxPerSec;

		// '.pause' needs a place to start
		this._actxStartTime = this.actx.currentTime;

		this.fireEvent( 'play' );
	};

	/* Overlays colour onto the wave form. Override this. */
	exports.prototype.overlayImg = function () {
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
	exports.prototype.offline_overlayImg = function ( e ) {
		var j;
		if ( typeof this.overlay.pxPerSec === 'undefined' ) {
			this.overlay.pxPerSec = this.width / this.buffer.duration;
			//console.info( 'this.overlay.pxPerSec = ', this.overlay.pxPerSec)
			//console.log( 'width = ', this.width, ', total px = ', this.overlay.pxPerSec * this.buffer.duration);
		}

		var fromX = e.playbackTime * this.overlay.pxPerSec,
			toX = fromX + ( e.inputBuffer.duration * this.overlay.pxPerSec );

		if ( parseInt( toX, 10 ) > parseInt( fromX, 10 ) ) {

			this.cctx.globalAlpha = 255;
			this.cctx.globalCompositeOperation = 'source-atop';

			if ( !this.offlineRenderStarted ) {
				this.offlineRenderStarted = true;
				fromX = 0;
			}

			var clrIndex = 0,
				bufferLength = this.offline_analyser.frequencyBinCount,
				data = new Uint8Array( bufferLength );
			this.offline_analyser.getByteFrequencyData( data );

			if ( this.options.frequencyby === 'average' ) {
				var values = 0;
				for ( j = 0; j < data.length; j++ ) {
					values += data[ j ];
				}
				clrIndex = parseInt( values / data.length, 10 );
			} else {
				var max = 0;
				for ( j = 0; j < bufferLength; j++ ) {
					if ( data[ j ] > max ) {
						max = data[ j ];
					}
				}
				clrIndex = max;
			}
			this.cctx.fillStyle = 'hsl(' + this.freqClrs[ clrIndex ] + ')';
			this.cctx.fillRect(
				fromX, 0,
				toX, this.canvas.height
			);
		}
	};

	exports.prototype.colourFrequencies = function () {
		var self = this;
		if ( this.buffer === null ) {
			throw new Error( 'setNode not caled, no buffer!' );
		}

		this.octx = new OfflineAudioContext( this.buffer.numberOfChannels,
			this.buffer.length, this.buffer.sampleRate );

		this.offline_node = this.octx.createBufferSource();

		this.offline_analyser = this.octx.createAnalyser();
		this.offline_analyser.fftsize = this.options.fftsize;
		this.offline_analyser.smoothingTimeConstant = this.options.smoothingTimeConstant;

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

	exports.prototype.setNode = function () {
		this.node = this.actx.createBufferSource();
		this.node.buffer = this.buffer;
		this.node.connect( this.actx.destination );
	};

	exports.prototype.setClrs = function () {
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

	/* Stores the graph for repainting on repeat plays; makes the graph clickable */
	exports.prototype.graphComplete = function () {
		var self = this;

		this.storeCanvasImg();

		if ( this.options.asimg ) {
			// store the current globalCompositeOperation
			var compositeOperation = this.cctx.globalCompositeOperation;

			// Set to draw behind current content
			this.cctx.globalCompositeOperation = "destination-over";

			this.cctx.fillStyle = this.options.background;
			this.cctx.fillRect( 0, 0, this.canvas.width, this.canvas.height );

			this.img.src = this.canvas.toDataURL();
			this.img.replaces( this.canvas );

			// Restore the previous state
			this.cctx.globalCompositeOperation = compositeOperation;

			if ( this.options.playable ) {
				this.img.addEventListener('click', function ( e ) {
					self.clickedGraphic( e );
				});
			}
		} else if ( this.options.playable ) {
			this.canvas.addEventListener( 'click', function ( e ) {
				self.clickedGraphic( e );
			} );
		}

		this.fireEvent( 'complete' );
	};

	exports.prototype.storeCanvasImg = function () {
		this.canvasImgData = this.cctx.getImageData(
			0, 0,
			this.canvas.width, this.canvas.height
		);
	};

	exports.prototype.replaceCanvasImg = function () {
		this.canvas.width = this.canvas.width;
		this.cctx.putImageData( this.canvasImgData, 0, 0 );
	};

	return exports;
} );
