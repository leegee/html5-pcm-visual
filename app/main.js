require(['lib/PcmVisual'], function (PcmVisual) {
    new PcmVisual({
        uri:            'samples/ouds/oud1.wav',
        element:        'app-container',
        rgbForeground:  '195,151,76',
        height:         500,
        width:          1100
    });
});

// require(['lib/PcmImg'], function (PcmVisual) {
//     var pi = new PcmVisual();
//    // pi.parseDom();
// });
