// require('dotenv').config();
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


// load all the libraries for the server
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const http = require('http');
const express = require('express');
const socketIo = require('socket.io')
const ss = require('socket.io-stream');

const app = express();
var server;
// var sessionId, sessionClient, sessionPath, request;
// var speechClient, requestSTT, ttsClient, requestTTS, mediaTranslationClient, requestMedia;
var speechClient, requestSTT;
// Set static folder
app.use(express.static(path.join('public')));


// STT demo
const speech = require('@google-cloud/speech');

function setupServer() {
  // setup Express
  app.use(cors());
  app.get('/', function (req, res) {
    res.render(path.join('index.html'));
  });
  server = http.createServer(app);
  const io = socketIo(server);
  server.listen(process.env.PORT || 3000, () => {
    console.log('Server started!');
  });

  // Listener, once the client connect to the server socket
  io.on('connect', (client) => {
    console.log(`Client connected [id=${client.id}]`);
    client.emit('server_setup', `Server connected [id=${client.id}]`);

    // // when the client sends 'message' events
    // // when using simple audio input
    // client.on('message', async function(data) {
    //     // we get the dataURL which was sent from the client
    //     const dataURL = data.audio.dataURL.split(',').pop();
    //     // we will convert it to a Buffer
    //     let fileBuffer = Buffer.from(dataURL, 'base64');
    //     // run the simple detectIntent() function
    //     const results = await detectIntent(fileBuffer);
    //     client.emit('results', results);
    // });

    // // when the client sends 'message' events
    // // when using simple audio input
    //   client.on('message-transcribe', async function(data) {
    //     // we get the dataURL which was sent from the client
    //     const dataURL = data.audio.dataURL.split(',').pop();
    //     // we will convert it to a Buffer
    //     let fileBuffer = Buffer.from(dataURL, 'base64');
    //     // run the simple transcribeAudio() function
    //     const results = await transcribeAudio(fileBuffer);
    //     client.emit('results', results);
    // });

    // // when the client sends 'stream' events
    // // when using audio streaming
    // ss(client).on('stream', function(stream, data) {
    //   // get the name of the stream
    //   const filename = path.basename(data.name);
    //   // pipe the filename to the stream
    //   stream.pipe(fs.createWriteStream(filename));
    //   // make a detectIntStream call
    //   detectIntentStream(stream, function(results){
    //       console.log(results);
    //       client.emit('results', results);
    //   });
    // });

    // when the client sends 'stream-transcribe' events
    // when using audio streaming
    ss(client).on('stream-transcribe', function (stream, data) {
      // get the name of the stream
      // const filename = path.basename(data.name);
      // pipe the filename to the stream
      // stream.pipe(fs.createWriteStream(filename));
      // make a detectIntStream call
      transcribeAudioStream(stream, async function (results) {
        // console.log(results['results'][0]['alternatives'][0].transcript)
        client.emit('transcript', results);

        transcript = results['results'][0]['alternatives'][0].transcript
        let res = await eng2jap(transcript);
        // console.log(res)
        client.emit('translate', res)
      });


    });

    // // when the client sends 'tts' events
    // ss(client).on('tts', function(text) {
    //   textToAudioBuffer(text).then(function(results){
    //     console.log(results);
    //     client.emit('results', results);
    //   }).catch(function(e){
    //     console.log(e);
    //   });
    // });

    // when the client sends 'stream-media' events
    // when using audio streaming
    // ss(client).on('stream-media', function (stream, data) {
    //   // get the name of the stream
    //   const filename = path.basename(data.name);
    //   // pipe the filename to the stream
    //   stream.pipe(fs.createWriteStream(filename));
    //   // make a detectIntStream call
    //   transcribeAudioMediaStream(stream, function (results) {
    //     console.log(results);
    //     client.emit('results', results);
    //   });
    // });
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
  // console.log(`Source: ${sourceText}`);
  // console.log(`Japanese: ${translation}`);
  // console.log(`Re-translate: ${re_translation}`);
  // socket.emit('transcript', {
  //     'translation': translation,
  //     're_translation': re_translation
  // });
  return { translation, re_translation };
}


setupServer();
setupSTT();