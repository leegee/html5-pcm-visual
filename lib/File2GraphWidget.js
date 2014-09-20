/*
    Instantiates a File2Graph object via any DOM element matching
    the supplied selector or the default `.file2graph`,
    which the new object replaces with its visualisation element.
    Could have read <audio> nodes and used their
    media element node, but want Ajax loading at times
    and can't be bothered. */

define( [ 'File2Graph' ], function ( File2Graph ) {
    var selector = '.file2graph';
    console.log( "Init File2Graph via %s", selector );
    Array.from(
        document.querySelectorAll( selector )
    ).forEach( function ( el ) {
        var opts = {
            element: el
        };
        Object.keys( el.dataset ).forEach( function ( i ) {
            opts[ i ] = el.dataset[ i ];
        } );
        new File2Graph( opts );
    } )
} );