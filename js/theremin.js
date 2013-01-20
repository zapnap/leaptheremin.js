var theremin = (function () {

  var audio,
      canvas,
      osc,
      nodes = {},
      ampRate = 0.1,
      ampDecay = 0.4,
      pitchRate = 0.2,
      maxGain = 0.5,
      minFreq = 16, // C0
      maxFreq = 4186, // C8
      leapMin = 100,
      leapMax = 400,
      waveType = 0,
      ws = null,
      started = false,
      volumeMin = 0,
      volumeMax = 10,
      volumeEl = '#volume',
      toggleEl = '#toggle',
      activeEl = '#activated',
      debugEl = '#debug';

  return {

    init: function () {

      // Support both the WebSocket and MozWebSocket objects
      if ((typeof(WebSocket) == 'undefined') &&
        (typeof(MozWebSocket) != 'undefined')) {
        WebSocket = MozWebSocket;
      }

      ws = new WebSocket("ws://localhost:6437/");

      ws.onopen = function(event) {
        theremin.debug("WebSocket connection open!");
      };

      ws.onclose = function(event) {
        ws = null;
        theremin.debug("WebSocket connection closed");
      };

      ws.onerror = function(event) {
        theremin.debug("Received error");
      };

      ws.onmessage = function(event) {
        if (started) {
          try {
            var obj = JSON.parse(event.data);
            var str = JSON.stringify(obj, undefined, 2);

            theremin.debug(str);

            if ((typeof(obj.hands) != 'undefined') && (obj.hands.length > 0)) {
              var volume = theremin.getVolume();

              if ((typeof(obj.pointables) == 'undefined') || (obj.pointables.length < 2)) {
                // closed first == no sound
                volume = 0;
              }

              theremin.play(theremin.getPitch(obj.hands[0]), volume);
            }
          } catch(err) {
            // theremin.debug(err.message);
            // theremin.debug(event.data);
          }
        }
      };

      try {
        audio = new window.webkitAudioContext() || window.AudioContext();
        osc = audio.createOscillator();
        osc.type = waveType;
      } catch (e) {
        window.alert('No web audio oscillator support in this browser');
      }

      nodes.volume = audio.createGainNode();
      nodes.volume.gain.value = 0;

      osc.connect(nodes.volume);
      nodes.volume.connect(audio.destination);

      $(document).keypress(function(event) {
        if (event.which == 91 && waveType > 0) {
          waveType = waveType - 1;
        } else if (event.which == 93 && waveType < 3) {
          waveType = waveType + 1;
        }
        osc.type = waveType;
      });

      $(volumeEl).knob({ min: volumeMin, max: volumeMax });
      $(activeEl).hover(theremin.togglePlay);
    },

    getPitch: function(pitchHand){
      var x = 0; var y = 1; var z = 2;
      var val = Math.sqrt(Math.pow(Math.abs(pitchHand.palmPosition[x]), 2) +
                                   Math.pow(Math.abs(pitchHand.palmPosition[y]), 2) +
                                   Math.pow(Math.abs(pitchHand.palmPosition[z]), 2));

      if (val > leapMax) {
        return leapMax;
      } else if (val < leapMin) { 
        return leapMin;
      } else {
        return val;
      }
    },

    getVolume: function(){
      return $('#volume').val();
    },

    scale: function(value, oldMin, oldMax, newMin, newMax){
      return (((newMax - newMin) * (value - oldMin)) / (oldMax - oldMin)) + newMin;
    },

    play: function(pitchValue, volumeValue){
      var now = audio.currentTime,
          amp = nodes.volume.gain,
          pitch = osc.frequency,
          v = theremin.scale(volumeValue, volumeMin, volumeMax, 0, maxGain),
          p = theremin.scale(pitchValue, leapMin, leapMax, minFreq, maxFreq);

      $('#pitcha .value').text(Math.round(p));
      $('#pitchd .value').text(Math.round(pitchValue));

      amp.cancelScheduledValues(now);
      amp.setValueAtTime(amp.value, now);
      amp.linearRampToValueAtTime(v, now + ampRate);

      pitch.cancelScheduledValues(now);
      pitch.setValueAtTime(pitch.value, now);
      pitch.linearRampToValueAtTime(p, now + pitchRate);
    },

    start: function(){
      osc.noteOn(0);
      $(toggleEl).text('ON');
      started = true;
    },

    stop: function(){
      var now = audio.currentTime,
          amp = nodes.volume.gain;

      amp.cancelScheduledValues(now);
      amp.setValueAtTime(amp.value, now);
      amp.linearRampToValueAtTime(0, now + ampDecay);
      $(toggleEl).text('OFF');
      started = false;
    },

    togglePlay: function(){
      if (started) { theremin.stop(); } else { theremin.start(); }
    },

    debug: function(message){
      $(debugEl).text(message);
    }

  };

}());

$(document).ready(function() {
  theremin.init();
});
