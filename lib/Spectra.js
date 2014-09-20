/* global define, document, alert, window, webkitAudioContext, webkitOfflineAudioContext, AudioContext, XMLHttpRequest, OfflineAudioContext */
define( [ 'File2Graph' ], function ( File2Graph ) {

	/*
    Version 0.5

    This code is copyright (C) 2012 Lee Goddard.
    All Rights Reserved.

    Available under the same terms as Perl5.

    A sub-class of File2Graph to render a spectragraph of the URI.

    Provides the additional option `usePalette` (`boolean`).

*/

	var Spectra = function Spectra( options ) {
		File2Graph.call( this, options );
		this.options.usePalette = this.options.usePalette || false;
	};

	Spectra.prototype = Object.create( File2Graph.prototype );
	Spectra.prototype.constructor = Spectra;

	Spectra.prototype.offline_overlayImg = function ( e ) {
		var self = this,
			fromX = e.playbackTime * this.overlay.pxPerSec,
			toX = fromX + ( e.inputBuffer.duration * self.overlay.pxPerSec );

		if ( typeof self.overlay.pxPerSec === 'undefined' ) {
			self.overlay.pxPerSec = self.width / self.buffer.duration;
		}

		self.cctx.globalAlpha = 255;
		self.cctx.globalCompositeOperation = 'destination-over';

		if ( parseInt( toX, 10 ) > parseInt( fromX, 10 ) + 1 ) {
			if ( !self.offlineRenderStarted ) {
				self.offlineRenderStarted = true;
				fromX = 0;
			}

			var i,
				toY = 0,
				clrIndex = 0,
				max = 0,
				bufferLength = self.offline_analyser.frequencyBinCount,
				data = new Uint8Array( bufferLength ),
				stepY = self.canvas.height / bufferLength;

			self.offline_analyser.getByteFrequencyData( data );

			// window.requestAnimationFrame( function () {
			for ( i = 0; i < bufferLength; i++ ) {
				self.cctx.fillStyle = 'hsl(' + (
					self.options.usePalette ? self.freqClrs[ data[ i ] ] : data[ i ] +
					',100%,40%'
				) + ')';
				self.cctx.fillRect(
					fromX, toY,
					toX, toY + stepY
				);
				toY += stepY;
			}
			// } );
		};
	}

	return Spectra;
} );
