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
		if ( typeof this.overlay.pxPerSec === 'undefined' ) {
			this.overlay.pxPerSec = this.width / this.buffer.duration;
			//console.info( 'this.overlay.pxPerSec = ', this.overlay.pxPerSec)
			//console.log( 'width = ', this.width, ', total px = ', this.overlay.pxPerSec * this.buffer.duration);
		}

		this.cctx.globalAlpha = 255;
		this.cctx.globalCompositeOperation = 'destination-over';

		var fromX = e.playbackTime * this.overlay.pxPerSec,
			toX = fromX + ( e.inputBuffer.duration * this.overlay.pxPerSec );

		if ( parseInt( toX, 10 ) > parseInt( fromX, 10 ) ) {
			if ( !this.offlineRenderStarted ) {
				this.offlineRenderStarted = true;
				fromX = 0;
			}

			var i,
				clrIndex = 0,
				max = 0,
				bufferLength = this.offline_analyser.frequencyBinCount,
				data = new Uint8Array( bufferLength ),
				stepsY = this.canvas.height / bufferLength;

			this.offline_analyser.getByteFrequencyData( data );

			for ( i = 0; i < bufferLength; i++ ) {
				if ( data[ i ] > max ) {
					max = data[ i ];
				}
			}
			clrIndex = max;

			var toY = 0;

			this.cctx.fillStyle = 'hsl(' + this.freqClrs[ clrIndex ] + ')';
			this.cctx.fillRect(
				fromX, toY,
				toX, this.canvas.height
			);
		}
	};

	return Spectra;
} );
