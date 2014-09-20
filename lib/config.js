require.config( {
	baseUrl: "lib/",
	paths: {
		"components": "../bower_components",
		"app": "../app/",
		"lib": "../lib/"
	}
} );

// http://www.w3.org/TR/animation-timing/
// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
// shim layer with setTimeout fallback
window.requestAnimFrame = ( function () {
	return window.requestAnimationFrame ||
		window.webkitRequestAnimationFrame ||
		window.mozRequestAnimationFrame ||
		window.oRequestAnimationFrame ||
		window.msRequestAnimationFrame ||
		function ( callback ) {
			window.setTimeout( callback, 1000 / 60 );
		};
} )();

// if (!window.requireTestMode) {
//   require(['app/main'], function(){ });
// }
