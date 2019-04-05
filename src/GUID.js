define([], function () {
    // http://stackoverflow.com/a/105074/418150
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    }

    var exports = function GUID () {
        this.instance = s4() + s4() + '-' + s4() + '-' + s4() + '-' +
               s4() + '-' + s4() + s4() + s4();
    };

    return exports;
});
