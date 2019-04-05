/*
    Instantiates a Spectra object via any DOM element matching
    the supplied selector or the default `.file2graph`,
    which the new object replaces with its visualisation element.
    Could have read <audio> nodes and used their
    media element node, but want Ajax loading at times
    and can't be bothered. */

define( [ 'Spectra', 'Options' ], function ( Spectra, Options ) {
	var selector = '.spectra';
	console.log( "Init Spectra via %s", selector );
    Array.from(
        document.querySelectorAll( selector )
    ).forEach( function ( el ) {
        console.log( "Create Spectra from %s", el );
        var options = Options.fromDataset( el );
        options.element = el;
        new Spectra( options );
    } );
} );
