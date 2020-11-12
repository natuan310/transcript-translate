require('dotenv').config();
const projectId = process.env.PROJECT_ID;
const apiKey = process.env.API_KEY;
const port = process.env.PORT || 3000;

const languageCode = 'en-US';
let encoding = 'LINEAR16';

const singleUtterance = true;
const interimResults = false;
const sampleRateHertz = 16000;
const speechContexts = [
    {
        phrases: [
            'mail',
            'email'
        ],
        boost: 20.0
    }
]

// console.log(projectId);

// ----------------------

// var sessionId, sessionClient, sessionPath, request;
// var speechClient, requestSTT, ttsClient, requestTTS, mediaTranslationClient, requestMedia;
var speechClient, requestSTT;
// Set static folder


// STT demo
const speech = require('@google-cloud/speech');

const express = require('express');
const socketIo = require('socket.io');
const ss = require('socket.io-stream');
const app = express();
const server = app.listen(8001, () => {
    console.log('on connect 02');
});
const io = new socketIo.Server(server, { cors: { origin: '*' } });


io.on('connection', (socket) => {
    console.log(`Client connect ${socket.id}`)
    socket.emit('server-send', {
        msg: 'server'
    });

    socket.on('client-send', (data) => {
        console.log(data);
    });

    setupSTT();

    ss(socket).on('stream-transcribe', function (stream, data) {
        console.log('Receiving data!')
        // make a detectIntStream call
        transcribeAudioStream(stream, async function (results) {
            // console.log(results['results'][0]['alternatives'][0].transcript)
            socket.emit('transcript', results);

            transcript = results['results'][0]['alternatives'][0].transcript
            let res = await eng2jap(transcript);
            // console.log(res)
            socket.emit('translate', res)
        });


    });
});


/**
 * Setup Cloud STT Integration
 */
function setupSTT() {
    // Creates a client
    speechClient = new speech.SpeechClient({});
    if (speechClient) {
        console.log("Speech Client Created")
    }

    // Create the initial request object
    // When streaming, this is the first call you will
    // make, a request without the audio stream
    // which prepares Dialogflow in receiving audio
    // with a certain sampleRateHerz, encoding and languageCode
    // this needs to be in line with the audio settings
    // that are set in the client
    requestSTT = {
        config: {
            sampleRateHertz: sampleRateHertz,
            encoding: encoding,
            languageCode: languageCode
        },
        interimResults: interimResults,
        //enableSpeakerDiarization: true,
        //diarizationSpeakerCount: 2,
        //model: `phone_call`
    }
}

/*
 * STT - Transcribe Speech on Audio Stream
 * @param audio stream
 * @param cb Callback function to execute with results
 */
async function transcribeAudioStream(audio, cb) {
    const recognizeStream = speechClient.streamingRecognize(requestSTT)
        .on('data', function (data) {
            // console.log(data);

            cb(data);
        })
        .on('error', (e) => {
            console.log(e);
        })
        .on('end', () => {
            console.log('on end');
        });

    audio.pipe(recognizeStream);
    audio.on('end', function () {
        //fileWriter.end();
    });
};


// Imports the Google Cloud client library
const { Translate } = require('@google-cloud/translate').v2;

// Instantiates a client
const translate = new Translate({ projectId });

if (translate) {
    console.log("Translate Client Created")
}

// Function to translate text
async function eng2jap(sourceText) {
    // The target language
    const source_lang = 'en';
    const target_lang = 'ja';

    // Translates some text into Japanese
    const [translation] = await translate.translate(sourceText, target_lang);
    const [re_translation] = await translate.translate(translation, source_lang);

    return { translation, re_translation };
}

