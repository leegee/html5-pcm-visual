/*
    Instantiates a File2Graph object via any DOM element matching
    the supplied selector or the default `.file2graph`,
    which the new object replaces with its visualisation element.
    Could have read <audio> nodes and used their
    media element node, but want Ajax loading at times
    and can't be bothered. */

define( [ 'Options', 'File2Graph' ], function ( Options, File2Graph ) {
	var selector = '.file2graph';
	console.log( "Init File2Graph via %s", selector );

	Array.from(
		document.querySelectorAll( selector )
	).forEach( function ( el ) {

		console.log( "Create File2Graph from %s", el );
		var options = Options.fromDataset( el );
		options.element = el;
		new File2Graph( options );

	} );

} );
