require.config( {
	baseUrl: "lib/",
	paths: {
		Chroma: '../bower_components/chroma-js/chroma.min'
	},
	shim: {
		Chroma: {
			exports: "chroma"
		}
	}
} );

// http://www.w3.org/TR/animation-timing/
// After http://paulirish.com/2011/requestanimationframe-for-smart-animating/
// shim layer with setTimeout fallback
window.requestAnimationFrame = window.requestAnimationFrame || ( function () {
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
