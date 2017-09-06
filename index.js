'use strict';

let uploader = require('./upload/uploader');
let youtube = require('./process/youtube');

async function execute() {

  let appname = 'youtube-plowing';
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

  if (settings.task == 'process') {

    switch (manifest.project.type) {
      case 'youtube':
        youtube(manifest);
        break;
      default:
        console.log('unknown type: ', manifest.project.type);
    }

  } else if (settings.task == 'upload') {

    uploader(manifest);

  } else {
    console.log('unknown task ', settings.task);
  }

};

execute();;
