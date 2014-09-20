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

	/**
    Offline audio processing is faster than real time.
    Used here to apply frequency analysis to colour the wave.
    Sets a few parameters for use during playback.
    */
	Spectra.prototype.offline_overlayImg = function ( e ) {
		var i;
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
				for ( i = 0; i < data.length; i++ ) {
					values += data[ i ];
				}
				clrIndex = parseInt( values / data.length, 10 );
			} else {
				var max = 0;
				for ( i = 0; i < data.length; i++ ) {
					if ( data[ i ] > max ) {
						max = data[ i ];
					}
				}
				clrIndex = max;
			}

			this.cctx.globalAlpha = 255;
			this.cctx.globalCompositeOperation = 'destination-over';
			this.cctx.fillStyle = 'hsl(' + this.freqClrs[ clrIndex ] + ')';
			this.cctx.fillRect(
				fromX, 0,
				toX, this.canvas.height
			);
		}
	};

	return Spectra;
} );