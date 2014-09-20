/* global define, document, alert, window, webkitAudioContext, webkitOfflineAudioContext, AudioContext, XMLHttpRequest, OfflineAudioContext */
define( [ 'File2Graph' ], function ( File2Graph ) {

	/*
    Version 0.5

    This code is copyright (C) 2012 Lee Goddard.
    All Rights Reserved.

    Available under the same terms as Perl5.

    A sub-class of File2Graph to render a spectragraph of the URI.

    Provides the additional options:

    * `usePalette` (`boolean`) — colour via the built-in palette or audio uInt8->HSL defaults.
    * `stepY` (`Number`) — break each period of time into frequency bins of this value

*/

	var Spectra = function Spectra( options ) {
		File2Graph.call( this, options );
		this.options.usePalette = this.options.usePalette || false;
		this.cctx.globalAlpha = 255;
		this.cctx.globalCompositeOperation = 'destination-over';
		this.options.stepY = this.options.stepY || 10;
		this.options.onSoundLoaded = function () {
			this.overlay.pxPerSec = this.overlay.pxPerSec || this.width / this.buffer.duration;
		};
	};

	Spectra.prototype = Object.create( File2Graph.prototype );
	Spectra.prototype.constructor = Spectra;

	Spectra.prototype.offline_overlayImg = function ( e ) {
		var self = this,
			fromX = e.playbackTime * this.overlay.pxPerSec,
			toX = fromX + ( e.inputBuffer.duration * self.overlay.pxPerSec );

		var stepX = 2, // TODO average/max looping within buckets of stepX width
			total = 0;

		if ( parseInt( toX, 10 ) > parseInt( fromX, 10 ) + stepX ) {
			if ( !self.offlineRenderStarted ) {
				self.offlineRenderStarted = true;
				fromX = 0;
			}

			var toY = 0;
			bufferLength = self.offline_analyser.frequencyBinCount,
			data = new Uint8Array( bufferLength ),
			oneUnitY = self.canvas.height / bufferLength,
			incByY = ( oneUnitY * self.options.stepY );
			self.offline_analyser.getByteFrequencyData( data );

			for ( var i = 0; i < bufferLength; i += self.options.stepY ) {
				self.cctx.fillStyle = 'hsl(' + (
					self.options.usePalette ? self.freqClrs[ data[ i ] ] : data[ i ] +
					',' + this.options.saturation + '%,' + this.options.lightness + '%'
				) + ')';
				self.cctx.fillRect(
					fromX, toY,
					toX, toY + incByY
				);
				toY += incByY;
			}
		};
	}

	return Spectra;
} );
