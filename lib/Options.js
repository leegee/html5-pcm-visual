define( function () {

	var Options = function Options() {};

	/* Parse an HTMLElement's dataset */
	Options.prototype.fromDataset = function ( el ) {
		var opts = {};
		Object.keys( el.dataset ).forEach( function ( i ) {
			opts[ i ] = el.dataset[ i ];
			if ( opts[ i ].match( /^-?\d+$/ ) ) {
				opts[ i ] = parseInt( opts[ i ] )
			} else if ( opts[ i ].match( /^-?\d*\.?\d*$/ ) ) {
				opts[ i ] = parseFloat( opts[ i ] )
			}
		} );
		return opts;
	};

	var exports = new Options();
	return exports;
} );
