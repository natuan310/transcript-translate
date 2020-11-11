const socketio = io();
const socket = socketio.on('connect', function () {
    // reset the recorder
    console.log('Connected')
    startRecording.disabled = false;
});

// when the server found results and send
// it back to the client
const resultpreview = document.getElementById('results');
socketio.on('transcript', function (data) {
    if (data && data.results[0] && data.results[0].alternatives[0]) {
        resultpreview.innerHTML += data.results[0].alternatives[0].transcript + "\n";
    }
});

const translation = document.getElementById('translation');
const re_translation = document.getElementById('re_translation');
socketio.on('translate', function (data) {
    translation.innerHTML += data.translation + "\n"
    re_translation.innerHTML += data.re_translation + "\n"
});

const startRecording = document.getElementById('start-recording');
const stopRecording = document.getElementById('stop-recording');
let recordAudio;

// on start button handler
startRecording.onclick = function () {
    // recording started
    startRecording.disabled = true;

    // make use of HTML 5/WebRTC, JavaScript getUserMedia()
    // to capture the browser microphone stream
    navigator.getUserMedia({
        audio: true
    }, function (stream) {
        console.log('Start streaming!')
        recordAudio = RecordRTC(stream, {
            type: 'audio',
            mimeType: 'audio/webm',
            sampleRate: 44100, // this sampleRate should be the same in your server code

            // MediaStreamRecorder, StereoAudioRecorder, WebAssemblyRecorder
            // CanvasRecorder, GifRecorder, WhammyRecorder
            recorderType: StereoAudioRecorder,

            // Dialogflow / STT requires mono audio
            numberOfAudioChannels: 1,

            // get intervals based blobs
            // value in milliseconds
            // as you might not want to make detect calls every seconds
            timeSlice: 4000,

            // only for audio track
            // audioBitsPerSecond: 128000,

            // used by StereoAudioRecorder
            // the range 22050 to 96000.
            // let us force 16khz recording:
            desiredSampRate: 16000,

            // as soon as the stream is available
            ondataavailable: function (blob) {
                // making use of socket.io-stream for bi-directional
                // streaming, create a stream
                var stream = ss.createStream();
                // stream directly to server
                // it will be temp. stored locally
                ss(socket).emit('stream-transcribe', stream, {
                    size: blob.size
                });
                // pipe the audio blob to the read stream
                ss.createBlobReadStream(blob).pipe(stream);
            }
        });

        recordAudio.startRecording();
        stopRecording.disabled = false;
    }, function (error) {
        console.error(JSON.stringify(error));
    });
};

// on stop button handler
stopRecording.onclick = function () {
    // recording stopped
    startRecording.disabled = false;
    stopRecording.disabled = true;
};

