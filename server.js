require('dotenv').config();
const projectId = process.env.PROJECT_ID;
const apiKey = process.env.API_KEY;
const port = process.env.PORT || 3000;

var languageCode = 'ja-JP';
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


// load all the libraries for the server
const fs = require('fs');
const path = require('path');
// const cors = require('cors');
const express = require('express');
const app = express();
const httpServer = require('http').createServer(app);

const io = require('socket.io')(httpServer);
const ss = require('socket.io-stream');

// var sessionId, sessionClient, sessionPath, request;
// var speechClient, requestSTT, ttsClient, requestTTS, mediaTranslationClient, requestMedia;
var speechClient, requestSTT;
// Set static folder
app.use(express.static(path.join('public')));


// STT demo
const speech = require('@google-cloud/speech');

function setupServer() {
  // setup Express
  app.get('/', function (req, res) {
    res.render(path.join('index.html'));
  });


  httpServer.listen(process.env.PORT || 3000, () => {
    console.log('Server started!');
  });

  // Listener, once the client connect to the server socket
  io.on('connect', (socket) => {
    console.log(`socket connected [id=${socket.id}]`);
    socket.emit('server_setup', `Server connected [id=${socket.id}]`);
    socket.on('streaming', (data) => {
      languageCode = data;
      console.log(languageCode)
      setupSTT()
    })
    // when the socket sends 'stream-transcribe' events
    // when using audio streaming
    ss(socket).on('stream-transcribe', function (stream, data) {
      console.log('Receiving data!')
      // Get Language Code from socket

      // make a detectIntStream call
      transcribeAudioStream(stream, async function (results) {
        // console.log(results['results'][0]['alternatives'][0].transcript)

        socket.emit('transcript', results);

        transcript = results['results'][0]['alternatives'][0].transcript
        if (languageCode === 'en-US') {
          let res = await eng2jap(transcript);
          // console.log(res)
          socket.emit('translate', res)
        }
        else {
          let res = await jap2eng(transcript);
          // console.log(res)
          socket.emit('translate', res)
        }
      });
    });
  });
}


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
  });
};


// Imports the Google Cloud client library
const { Translate } = require('@google-cloud/translate').v2;

// Instantiates a client
const translate = new Translate({ projectId });

if (translate) {
  console.log("Translate Client Created")
}

// Function to translate Eng to Jap text
async function eng2jap(sourceText) {
  // The target language
  const source_lang = 'en';
  const target_lang = 'ja';

  // Translates some text into Japanese
  const [translation] = await translate.translate(sourceText, target_lang);
  const [re_translation] = await translate.translate(translation, source_lang);

  return { translation, re_translation };
}


// Function to translate Jap to Eng text
async function jap2eng(sourceText) {
  // The target language
  const source_lang = 'ja';
  const target_lang = 'en';

  // Translates some text into Japanese
  const [translation] = await translate.translate(sourceText, target_lang);
  const [re_translation] = await translate.translate(translation, source_lang);

  return { translation, re_translation };
}

setupServer();