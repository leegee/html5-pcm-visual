# pcm-visual

An aid to visualising PCM wave files

Provides `<pcm-realtime>` and `<pcm-onload>`.

## Installation

  git chekout ...
  npm install

## Use

Set the element's dimensions and colour through CSS.

To start playback/visualisation, call the element's `play` method. See https://developers.google.com/web/updates/2017/09/autoplay-policy-changes#webaudio

See the `eg` directory for examples. Run the examples with `npm run dev`, build with `npm run build`.

## `pcm-onload` attributes

* `uri` (string) The only required parameter, the URI of the audio file to graph.

* `graphwaveform` (boolean) Whether or not to graph the waveform

* `linewidth` (number) Width of the graph's line

* `step` (number) Graph PCM in steps

* `pauseorjump` (`pause` | `jump`) Action when waveform is clicked - pause, or jump to the time cicked

* `playable` (boolean) Can the waveform be clicked to play?

* `overlayclr` (string) Any valid CSS colour (hex, rgb, etc). Overlaid when image played

* `overlaytype` (`bar` | `full`)
    this.frequencyby = (this.getAttribute('frequencyby') && this.getAttribute('frequencyby').match(/max/i) ? 'max' : 'average') || this.frequencyby;

* `frequencyby` (`average` | `max`) Calculate frequency colour by the average frequency in the FFT bin, or that with the greatest amplitude.

## `pcm-realtime` options

* `uri` (string) The only required parameter, the URI of the audio file to graph.

* `fftrSize` (number) FFT bin size.

* `opacityStep`

* `generationsToKeep`

* `lineWidth`

* `lineHeight`
