'use strict';

let downloader = require('./module/downloader');
let converter = require('./module/converter');
let watermarker = require('./module/watermarker');
let cropper = require('./module/cropper');
let uploader = require('./module/uploader');

async function execute() {

  let appname = 'youtube-douyin';
  let credentials = require('./config/credentials');
  let selectedCredential;
  credentials.forEach((credential) => {
    if (credential.name == appname) {
      selectedCredential = credential;
    }
  });

  console.log('appname ', appname);
  console.log('selectedCredential ', selectedCredential);
  console.log('\n\r');

  let settings = require('./config/settings');
  console.log('settings ', settings);
  console.log('\n\r');

  let manifest = require('./config/' + settings.target);
  manifest.credential = selectedCredential;

  console.log('manifest ', manifest);
  console.log('\n\r');

  if (settings.task == 'download') {

    switch (manifest.project.type) {
      case 'youtube':
        downloader(manifest);
        break;
      default:
        console.log('unknown type: ', manifest.project.type);
    }

  }else if (settings.task == 'convert') {

    converter(manifest);

  } else if (settings.task == 'watermark') {

    watermarker(manifest);

  } else if (settings.task == 'crop') {

    cropper(manifest);

  } else if (settings.task == 'upload') {

    uploader(manifest);

  } else {
    console.log('unknown task ', settings.task);
  }

};

execute();;
