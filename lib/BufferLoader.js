define( function () {
    // http://www.html5rocks.com/en/tutorials/webaudio/intro/js/buffer-loader.js
    // via http://www.html5rocks.com/en/tutorials/webaudio/intro/

    var exports = function BufferLoader (context, uriList, callback) {

        if (typeof context==='undefined' || context === null){
            console.trace();
            throw new ReferenceError('context parameter not supplied');
        }
        if (typeof uriList==='undefined' || uriList === null){
            console.trace();
            throw new ReferenceError('uriList parameter not supplied');
        }
        if (typeof callback==='undefined' || callback === null){
            console.trace();
            throw new ReferenceError('callback parameter not supplied');
        }

        this.context = context;
    	this.uriList = uriList;
    	this.onload  = callback;
    	this.bufferList = [];
    	this.loadCount = 0;
    };

    exports.prototype.loadBuffer = function (uri, index) {
        var self = this;
        console.log('BufferLoader.loadBuffer ', arguments);

        if (typeof uri==='undefined' || uri === null){
            console.trace();
            throw new ReferenceError('uri parameter not supplied');
        }
        if (typeof index==='undefined' || index === null){
            console.trace();
            throw new ReferenceError('index parameter not supplied');
        }

    	var request = new XMLHttpRequest();
    	request.open("GET", uri, true);
    	request.responseType = "arraybuffer";

    	request.onload = function () {
    		self.context.decodeAudioData(request.response,function(buffer){
    			if (!buffer){
    				throw new Error('Error decoding file data: '+uri);
    			}
    			self.bufferList[index] = buffer;
    			if (++self.loadCount == self.uriList.length){
    				self.onload(self.bufferList);
                }
    		});
    	};

    	request.onerror = function (e) {
    		console.error('BufferLoader: XHR error: ', e);
            throw new Error(e);
    	};

    	request.send();
    };

    exports.prototype.load = function () {
    	var i;
        for (i=0; i<this.uriList.length; i++){
    		this.loadBuffer( this.uriList[i], i );
        }
    };

    return exports;
});

