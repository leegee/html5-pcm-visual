export class BufferLoader {
  context: BaseAudioContext;
  uriList: String[];
  onload: Function;
  bufferList: AudioBuffer[];
  loadCount = 0;

  constructor(context, uriList, callback) {
    if (typeof context === 'undefined' || context === null) {
      console.trace();
      throw new TypeError('context parameter not supplied');
    }
    if (typeof uriList === 'undefined' || uriList === null) {
      console.trace();
      throw new TypeError('uriList parameter not supplied');
    }
    if (typeof callback === 'undefined' || callback === null) {
      console.trace();
      throw new TypeError('callback parameter not supplied');
    }

    this.context = context;
    this.uriList = uriList;
    this.onload = callback;
    this.bufferList = [];
  };

  loadBuffer(uri, index) {
    console.log('BufferLoader.loadBuffer ', uri, index);

    if (typeof uri === 'undefined' || uri === null) {
      console.trace();
      throw new TypeError('uri parameter not supplied');
    }
    if (typeof index === 'undefined' || index === null) {
      console.trace();
      throw new TypeError('index parameter not supplied');
    }

    const request = new XMLHttpRequest();
    request.open("GET", uri, true);
    request.responseType = "arraybuffer";

    request.onload = () => {
      this.context.decodeAudioData(request.response, (buffer) => {
        if (!buffer) {
          throw new Error('Error decoding file data: ' + uri);
        }
        this.bufferList[index] = buffer;
        if (++this.loadCount == this.uriList.length) {
          this.onload(this.bufferList);
        }
      });
    };

    request.onerror = function (e) {
      console.error('BufferLoader: XHR error: ', e);
      throw new Error(e.toString());
    };

    request.send();
  };

  load() {
    for (let i = 0; i < this.uriList.length; i++) {
      this.loadBuffer(this.uriList[i], i);
    }
  };
}
