/* global define, document, alert, window, webkitAudioContext, webkitOfflineAudioContext, AudioContext, XMLHttpRequest, OfflineAudioContext */
define( [ 'File2Graph', 'Chroma' ], function (
	File2Graph, Chroma ) {

	/*
    Version 0.5

    This code is copyright (C) 2012 Lee Goddard.
    All Rights Reserved.

    Available under the same terms as Perl5.

    A sub-class of File2Graph to render a spectragraph of the URI.

    Provides the additional options:

    * `usepalette` (`boolean`) — colour via the built-in palette or audio uInt8->HSL defaults.
    * `stepy` (`Number`) — break each period of time into frequency bins of this value
    * `monochrome` (`Number`) — optional HSL hue for a monochrome graph
    * `palettefrom` ( `String` )—  todo

*/

	var Spectra = function Spectra( options ) {
		File2Graph.call( this, options );
		this.options.usepalette = options.usepalette || false;
		this.cctx.globalAlpha = 255;
		this.cctx.globalCompositeOperation = 'destination-over';
		this.options.stepy = options.stepy || 1;
		this.options.setFillStyle = options.setFillStyle || this.setFillStyle;
		// TODO average/max looping within buckets of stepx width
		this.options.stepx = this.options.stepx || 0;

		this.options.onSoundLoaded = function () {
            this.overlay.pxPerSec = this.overlay.pxPerSec || this.canvas.width / this.buffer.duration;
		};

		if ( this.options.palettefrom ) {
			// TODO split this.options.palettefrom into colors, set positions equidistant
			this.options.palette = Chroma.scale(
				[ '#000000', '#ff0000', '#ffff00', '#ffffff' ]
			)
				.domain( [ 0, 255 ] );
		}
	};

	Spectra.prototype = Object.create( File2Graph.prototype );
	Spectra.prototype.constructor = Spectra;

	Spectra.prototype.setFillStyle = function ( data ) {
		if ( this.options.hasOwnProperty( "palettefrom" ) ) {
			return this.options.palette( data )
				.hex();
		}
		if ( this.options.hasOwnProperty( "monochrome" ) ) {
			return 'hsl(' + (
				this.options.monochrome + ',' + this.options.saturation + '%,' + data +
				'%'
			) + ')';
		}
		return 'hsl(' + (
			this.options.usepalette ?
			this.freqClrs[ data ] : data +
			',' + this.options.saturation + '%,' + this.options.lightness + '%'
		) + ')';
	}

	Spectra.prototype.offline_overlayImg = function ( e ) {
		var self = this,
			fromX = e.playbackTime * this.overlay.pxPerSec,
			toX = fromX + ( e.inputBuffer.duration * self.overlay.pxPerSec );

		if ( parseInt( toX, 10 ) <= parseInt( fromX, 10 ) + self.options.stepx ) {
			return;
		}

		if ( !self.offlineRenderStarted ) {
			self.offlineRenderStarted = true;
			fromX = 0;
		}

		var toY = 0,
			bufferLength = self.offline_analyser.frequencyBinCount,
			oneUnitY = self.canvas.height / bufferLength,
			incByY = ( oneUnitY * self.options.stepy ),
			data = new Uint8Array( bufferLength );

		// console.log( oneUnitY, incByY, self.options.stepy );

		self.offline_analyser.getByteFrequencyData( data );

		for ( var i = 0; i < bufferLength; i += self.options.stepy ) {

			self.cctx.fillStyle = self.setFillStyle( data[ i ] );

			self.cctx.fillRect(
				fromX, toY,
				toX, toY + incByY
			);

			toY += incByY;
		}
	};

	return Spectra;
} );
